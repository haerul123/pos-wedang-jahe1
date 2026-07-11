import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate Invoice Number: INV-YYYYMMDD-XXXX
async function generateInvoiceNo() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.order.count();
  const nextNum = String(count + 1).padStart(4, '0');
  return `INV-${dateStr}-${nextNum}`;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Products API
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, base_price, stock_qty, category, is_active } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        name,
        base_price: parseFloat(base_price),
        stock_qty: parseInt(stock_qty),
        category,
        is_active: is_active !== undefined ? Boolean(is_active) : true
      }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, base_price, stock_qty, category, is_active } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        base_price: base_price !== undefined ? parseFloat(base_price) : undefined,
        stock_qty: stock_qty !== undefined ? parseInt(stock_qty) : undefined,
        category,
        is_active: is_active !== undefined ? Boolean(is_active) : undefined
      }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ingredients API
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await prisma.ingredient.findMany();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ingredients', async (req, res) => {
  const { name, stock_kg, minimum_alert_kg } = req.body;
  try {
    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        stock_kg: parseFloat(stock_kg),
        minimum_alert_kg: parseFloat(minimum_alert_kg)
      }
    });
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/ingredients/:id', async (req, res) => {
  const { id } = req.params;
  const { name, stock_kg, minimum_alert_kg } = req.body;
  try {
    const ingredient = await prisma.ingredient.update({
      where: { id: parseInt(id) },
      data: {
        name,
        stock_kg: stock_kg !== undefined ? parseFloat(stock_kg) : undefined,
        minimum_alert_kg: minimum_alert_kg !== undefined ? parseFloat(minimum_alert_kg) : undefined
      }
    });
    res.json(ingredient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders API (Checkout)
app.post('/api/orders', async (req, res) => {
  const { items, total, paid, change, method } = req.body;

  try {
    const invoice_no = await generateInvoiceNo();

    // Use Prisma transaction to ensure atomicity
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the Order
      const newOrder = await tx.order.create({
        data: {
          invoice_no,
          total: parseFloat(total),
          paid: parseFloat(paid),
          change: parseFloat(change),
          method,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              qty: parseInt(item.qty),
              note: item.note || '',
              subtotal: parseFloat(item.subtotal)
            }))
          }
        },
        include: {
          items: true
        }
      });

      // 2. Deduct product stocks and ingredient stocks
      for (const item of items) {
        // Deduct Product Stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock_qty: {
              decrement: item.qty
            }
          }
        });

        // Deduct raw ingredients depending on the product
        // Recipes mapping (kg per qty):
        // 'Jahe Susu Aren' -> Jahe Emprit/Merah: 0.05, Gula Aren: 0.02, Susu Kental Manis: 0.03
        // 'Wedang Jahe Murni' -> Jahe Emprit/Merah: 0.08, Gula Aren: 0.02
        // 'Jahe Lemon Honey' -> Jahe Emprit/Merah: 0.05, Madu: 0.03
        // 'Sekoteng / Ronde' -> Jahe Emprit/Merah: 0.04, Gula Aren: 0.02, Bubuk Jahe: 0.01
        
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        let deductions = {};

        if (prod.category === 'Susu' || prod.name.includes('Susu') || prod.name.includes('SKM')) {
          deductions['Jahe Merah'] = 0.05 * item.qty;
          deductions['Gula Aren'] = 0.02 * item.qty;
          deductions['Susu Kental Manis'] = 0.03 * item.qty;
        } else if (prod.category === 'Murni' || prod.name.includes('Murni')) {
          deductions['Jahe Merah'] = 0.08 * item.qty;
          deductions['Gula Aren'] = 0.02 * item.qty;
        } else if (prod.category === 'Lemon' || prod.name.includes('Lemon') || prod.name.includes('Honey') || prod.name.includes('Madu')) {
          deductions['Jahe Merah'] = 0.05 * item.qty;
          deductions['Madu'] = 0.03 * item.qty;
        } else if (prod.category === 'Spesial' || prod.name.includes('Sekoteng') || prod.name.includes('Ronde') || prod.name.includes('Spesial')) {
          deductions['Jahe Merah'] = 0.04 * item.qty;
          deductions['Gula Aren'] = 0.02 * item.qty;
          deductions['Bubuk Jahe'] = 0.01 * item.qty;
        } else {
          // Default recipe for generic items
          deductions['Jahe Merah'] = 0.04 * item.qty;
        }

        // Apply sweetness level customizations dynamically
        if (item.note) {
          if (item.note.includes('Tanpa Gula')) {
            deductions['Gula Aren'] = 0;
            deductions['Madu'] = 0;
          } else if (item.note.includes('Sedikit Gula')) {
            if (deductions['Gula Aren'] !== undefined) deductions['Gula Aren'] *= 0.5;
            if (deductions['Madu'] !== undefined) deductions['Madu'] *= 0.5;
          }

          // Apply extra susu (+Susu) customizations dynamically
          if (item.note.includes('+Susu')) {
            deductions['Susu Kental Manis'] = (deductions['Susu Kental Manis'] || 0) + 0.02 * item.qty;
          }
        }

        // Apply deductions to database
        for (const [ingredientName, amount] of Object.entries(deductions)) {
          let ing = await tx.ingredient.findFirst({ where: { name: ingredientName } });
          
          // Fallback check in case Jahe name differs in the database (e.g. 'Jahe Emprit' instead of 'Jahe Merah')
          if (!ing && ingredientName === 'Jahe Merah') {
            ing = await tx.ingredient.findFirst({ where: { name: 'Jahe Emprit' } });
          }

          if (ing) {
            await tx.ingredient.update({
              where: { id: ing.id },
              data: {
                stock_kg: {
                  decrement: amount
                }
              }
            });
          }
        }
      }

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Analytics API
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // 1. Calculations
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalTransactions = orders.length;
    
    // Profit approximation: 60% of total revenue is gross profit (assuming COGS is 40%)
    const totalProfit = totalRevenue * 0.6;

    // 2. Ingredient alerts
    const ingredients = await prisma.ingredient.findMany();
    const lowStockAlerts = ingredients.filter(ing => ing.stock_kg <= ing.minimum_alert_kg);

    // 3. Hourly sales trend (peak hours)
    const hourlySalesMap = {};
    // Pre-populate 24 hours
    for (let i = 0; i < 24; i++) {
      const label = `${String(i).padStart(2, '0')}:00`;
      hourlySalesMap[label] = { hour: label, total: 0, count: 0 };
    }

    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const label = `${String(hour).padStart(2, '0')}:00`;
      if (hourlySalesMap[label]) {
        hourlySalesMap[label].total += order.total;
        hourlySalesMap[label].count += 1;
      }
    });

    // Sort or transform hourly trend
    const hourlySalesTrend = Object.values(hourlySalesMap);

    // 4. Product Sales Share (Pie chart data)
    const productSalesMap = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const name = item.product.name;
        if (!productSalesMap[name]) {
          productSalesMap[name] = 0;
        }
        productSalesMap[name] += item.qty;
      });
    });

    const totalQtySold = Object.values(productSalesMap).reduce((a, b) => a + b, 0);
    const productSalesShare = Object.entries(productSalesMap).map(([name, qty]) => {
      const percentage = totalQtySold > 0 ? Math.round((qty / totalQtySold) * 100) : 0;
      return { name, value: qty, percentage };
    });

    res.json({
      revenue: totalRevenue,
      transactions: totalTransactions,
      profit: totalProfit,
      lowStockAlerts: lowStockAlerts.map(ing => ({
        name: ing.name,
        stock: ing.stock_kg,
        min: ing.minimum_alert_kg
      })),
      hourlySalesTrend,
      productSalesShare
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend in production mode
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
