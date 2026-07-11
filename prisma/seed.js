import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.ingredient.deleteMany({});

  // Seed Products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Sujamera Susu Aren',
        base_price: 15000,
        stock_qty: 80,
        category: 'Susu',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sujamera Murni',
        base_price: 10000,
        stock_qty: 120,
        category: 'Murni',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sujamera Lemon Honey',
        base_price: 18000,
        stock_qty: 50,
        category: 'Lemon',
      },
    }),
    prisma.product.create({
      data: {
        name: 'Sujamera Sekoteng / Ronde',
        base_price: 20000,
        stock_qty: 40,
        category: 'Spesial',
      },
    }),
  ]);

  console.log(`Created ${products.length} products.`);

  // Seed Ingredients
  const ingredients = await Promise.all([
    prisma.ingredient.create({
      data: {
        name: 'Jahe Merah',
        stock_kg: 15.0,
        minimum_alert_kg: 5.0,
      },
    }),
    prisma.ingredient.create({
      data: {
        name: 'Gula Aren',
        stock_kg: 8.5,
        minimum_alert_kg: 5.0,
      },
    }),
    prisma.ingredient.create({
      data: {
        name: 'Madu',
        stock_kg: 4.2, // Below 5kg to trigger low stock warning
        minimum_alert_kg: 5.0,
      },
    }),
    prisma.ingredient.create({
      data: {
        name: 'Susu Kental Manis',
        stock_kg: 12.0,
        minimum_alert_kg: 5.0,
      },
    }),
    prisma.ingredient.create({
      data: {
        name: 'Bubuk Jahe',
        stock_kg: 3.5, // Below 5kg to trigger low stock warning
        minimum_alert_kg: 5.0,
      },
    }),
  ]);

  console.log(`Created ${ingredients.length} ingredients.`);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
