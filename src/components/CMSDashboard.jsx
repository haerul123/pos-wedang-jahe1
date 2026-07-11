import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Award, Box, AlertTriangle, FileSpreadsheet, Plus, Settings, RefreshCw, Layers } from 'lucide-react';
import { formatRupiah, exportOrdersToCSV, formatDate } from '../utils/helpers';

export default function CMSDashboard({ refreshTrigger, onDataChanged }) {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [filterMethod, setFilterMethod] = useState('SEMUA');

  // Modal / forms states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  // Form inputs
  const [productForm, setProductForm] = useState({ name: '', base_price: '', stock_qty: '', category: 'Murni', is_active: true });
  const [ingredientForm, setIngredientForm] = useState({ name: '', stock_kg: '', minimum_alert_kg: '5.0' });

  // Fetch Dashboard Stats and Lists
  const fetchData = async () => {
    try {
      const [statsRes, ordersRes, productsRes, ingredientsRes] = await Promise.all([
        fetch('/api/dashboard-stats'),
        fetch('/api/orders'),
        fetch('/api/products'),
        fetch('/api/ingredients')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (ingredientsRes.ok) setIngredients(await ingredientsRes.json());
    } catch (error) {
      console.error('Error fetching CMS data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const url = selectedProduct ? `/api/products/${selectedProduct.id}` : '/api/products';
    const method = selectedProduct ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      });

      if (response.ok) {
        setShowProductModal(false);
        setSelectedProduct(null);
        setProductForm({ name: '', base_price: '', stock_qty: '', category: 'Murni', is_active: true });
        fetchData();
        onDataChanged(); // Notify main parent
      } else {
        alert('Gagal menyimpan produk');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    const url = selectedIngredient ? `/api/ingredients/${selectedIngredient.id}` : '/api/ingredients';
    const method = selectedIngredient ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingredientForm.name,
          stock_kg: parseFloat(ingredientForm.stock_kg),
          minimum_alert_kg: parseFloat(ingredientForm.minimum_alert_kg)
        })
      });

      if (response.ok) {
        setShowIngredientModal(false);
        setSelectedIngredient(null);
        setIngredientForm({ name: '', stock_kg: '', minimum_alert_kg: '5.0' });
        fetchData();
        onDataChanged();
      } else {
        alert('Gagal menyimpan bahan baku');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProductActive = async (prod) => {
    try {
      const response = await fetch(`/api/products/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: prod.is_active === false
        })
      });

      if (response.ok) {
        fetchData();
        onDataChanged();
      } else {
        alert('Gagal mengubah status menu');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditProduct = (prod) => {
    setSelectedProduct(prod);
    setProductForm({
      name: prod.name,
      base_price: prod.base_price.toString(),
      stock_qty: prod.stock_qty.toString(),
      category: prod.category,
      is_active: prod.is_active !== false
    });
    setShowProductModal(true);
  };

  const openEditIngredient = (ing) => {
    setSelectedIngredient(ing);
    setIngredientForm({
      name: ing.name,
      stock_kg: ing.stock_kg.toString(),
      minimum_alert_kg: ing.minimum_alert_kg.toString()
    });
    setShowIngredientModal(true);
  };

  // Pre-defined color codes for Pie Chart slices
  const COLORS = ['#cf6027', '#e5995e', '#efbe90', '#ab491e', '#893b1d'];

  // Default fallback data for charts if database is empty
  const defaultLineData = [
    { hour: '08:00', total: 0 },
    { hour: '10:00', total: 0 },
    { hour: '12:00', total: 0 },
    { hour: '14:00', total: 0 },
    { hour: '16:00', total: 45000 },
    { hour: '18:00', total: 180000 },
    { hour: '20:00', total: 220000 },
    { hour: '22:00', total: 60000 }
  ];

  const defaultPieData = [
    { name: 'Sujamera Susu Aren', value: 45 },
    { name: 'Sujamera Murni', value: 30 },
    { name: 'Sujamera Lemon Honey', value: 15 },
    { name: 'Sujamera Sekoteng / Ronde', value: 10 }
  ];

  const lineChartData = stats && stats.transactions > 0 
    ? stats.hourlySalesTrend.filter(item => item.total > 0 || (parseInt(item.hour.slice(0,2)) >= 8 && parseInt(item.hour.slice(0,2)) <= 22))
    : defaultLineData;

  const pieChartData = stats && stats.transactions > 0 && stats.productSalesShare.length > 0
    ? stats.productSalesShare
    : defaultPieData;

  const filteredOrders = orders.filter(order => {
    if (filterMethod === 'SEMUA') return true;
    return order.method === filterMethod;
  });

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Visual Report Statistics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Revenue */}
        <div className="glass rounded-3xl p-6 border border-stone-900 flex items-center gap-5 shadow-lg">
          <div className="p-4 rounded-2xl bg-ginger-950/80 border border-ginger-900/50 text-ginger-400">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Omset Penjualan</p>
            <h3 className="text-2xl font-black text-stone-100 mt-1">
              {stats ? formatRupiah(stats.revenue) : 'Rp0'}
            </h3>
            <p className="text-[10px] text-stone-500 mt-0.5">Penjualan kotor kasir</p>
          </div>
        </div>

        {/* Card Profit */}
        <div className="glass rounded-3xl p-6 border border-stone-900 flex items-center gap-5 shadow-lg">
          <div className="p-4 rounded-2xl bg-ginger-950/80 border border-ginger-900/50 text-ginger-400">
            <Award size={28} />
          </div>
          <div>
            <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Estimasi Laba</p>
            <h3 className="text-2xl font-black text-stone-100 mt-1">
              {stats ? formatRupiah(stats.profit) : 'Rp0'}
            </h3>
            <p className="text-[10px] text-stone-500 mt-0.5">Pendapatan bersih (Laba 60%)</p>
          </div>
        </div>

        {/* Card Transactions */}
        <div className="glass rounded-3xl p-6 border border-stone-900 flex items-center gap-5 shadow-lg">
          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-850 text-ginger-400">
            <Box size={28} />
          </div>
          <div>
            <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">Jumlah Transaksi</p>
            <h3 className="text-2xl font-black text-stone-100 mt-1">
              {stats ? stats.transactions : 0}
            </h3>
            <p className="text-[10px] text-stone-500 mt-0.5">Total struk terbayar</p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Peak Hours Line Chart */}
        <div className="lg:col-span-8 glass rounded-3xl p-6 border border-stone-900 shadow-lg">
          <h3 className="text-base font-bold text-stone-200 mb-6 flex items-center gap-2">
            📊 Grafik Tren Penjualan Harian (Peak Hours)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '12px' }}
                  labelStyle={{ color: '#efbe90', fontWeight: 'bold', fontSize: '12px' }}
                  itemStyle={{ color: '#f5f5f4', fontSize: '12px' }}
                  formatter={(value) => [formatRupiah(value), 'Penjualan']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#cf6027"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-stone-500 text-center mt-3">
            *Menunjukkan performa penjualan dari jam ke jam. Puncak penjualan Susu Jahe Merah biasanya terjadi di sore hingga malam hari.
          </p>
        </div>

        {/* Sales Distribution Pie/Donut Chart */}
        <div className="lg:col-span-4 glass rounded-3xl p-6 border border-stone-900 shadow-lg flex flex-col justify-between">
          <h3 className="text-base font-bold text-stone-200 mb-4 flex items-center gap-2">
            🍩 Porsi Penjualan Menu
          </h3>
          <div className="h-48 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [`${value} Cup (${props.payload.percentage || '?'}%)`, name]}
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Custom Legends */}
          <div className="flex flex-col gap-2 mt-4 max-h-[120px] overflow-y-auto pr-1">
            {pieChartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-stone-400 font-medium truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-stone-300 font-bold font-mono">
                  {item.percentage !== undefined ? `${item.percentage}%` : `${item.value} cup`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raw Ingredients Alerts and Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Ingredients Stock control with warning */}
        <div className="lg:col-span-6 glass rounded-3xl p-6 border border-stone-900 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-stone-200 flex items-center gap-2">
              🌾 Gudang Bahan Baku Mentah
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedIngredient(null);
                  setIngredientForm({ name: '', stock_kg: '', minimum_alert_kg: '5.0' });
                  setShowIngredientModal(true);
                }}
                className="bg-gradient-to-r from-ginger-600 to-ginger-700 hover:from-ginger-500 hover:to-ginger-600 text-white font-bold py-1.5 px-2.5 rounded-xl text-xs flex items-center gap-1 transition-all active-scale"
              >
                <Plus size={12} />
                Bahan Baru
              </button>
              <span className="text-[10px] uppercase font-extrabold tracking-wider bg-stone-900 border border-stone-850 text-stone-400 py-1.5 px-2.5 rounded-lg">
                Ambang Batas: 5 Kg
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {ingredients.map((ing) => {
              const isAlert = ing.stock_kg <= ing.minimum_alert_kg;
              return (
                <div 
                  key={ing.id} 
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isAlert 
                      ? 'bg-red-950/20 border-red-900/40 text-red-100 shadow-sm shadow-red-950/20' 
                      : 'bg-stone-900/30 border-stone-850 text-stone-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm truncate">{ing.name}</h4>
                      {isAlert && (
                        <span className="bg-red-950 border border-red-800 text-[9px] text-red-400 font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shrink-0 animate-pulse">
                          <AlertTriangle size={10} />
                          Tipis
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1">Stok aman minimum {ing.minimum_alert_kg.toFixed(1)} Kg</p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="font-mono text-base font-extrabold">{ing.stock_kg.toFixed(2)}</span>
                      <span className="text-xs text-stone-400 font-medium ml-1">Kg</span>
                    </div>
                    <button 
                      onClick={() => openEditIngredient(ing)}
                      className="bg-stone-900 hover:bg-stone-850 p-2 rounded-xl border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      <Settings size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Product Manager CRUD and Daily Sales Export Excel */}
        <div className="lg:col-span-6 glass rounded-3xl p-6 border border-stone-900 shadow-lg flex flex-col justify-between gap-6">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-stone-200 flex items-center gap-2">
                ☕ Manajemen Menu Kasir
              </h3>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setProductForm({ name: '', base_price: '', stock_qty: '', category: 'Murni', is_active: true });
                  setShowProductModal(true);
                }}
                className="bg-gradient-to-r from-ginger-600 to-ginger-700 hover:from-ginger-500 hover:to-ginger-600 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1 transition-all active-scale"
              >
                <Plus size={14} />
                Menu Baru
              </button>
            </div>

            {/* Product list manager */}
            <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
              {products.map((prod) => (
                <div key={prod.id} className={`p-3.5 bg-stone-900/30 border border-stone-850 rounded-xl flex items-center justify-between gap-4 ${prod.is_active === false ? 'opacity-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {prod.category === 'Susu' ? '🥛' : prod.category === 'Murni' ? '🍵' : prod.category === 'Lemon' ? '🍋' : '🍧'}
                      </span>
                      <h4 className="font-bold text-xs truncate text-stone-200">{prod.name}</h4>
                      {prod.is_active === false && (
                        <span className="bg-stone-950 border border-stone-800 text-[9px] text-stone-500 font-bold px-1.5 py-0.5 rounded uppercase">
                          Arsip
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-[10px] text-stone-500 mt-1">
                      <span>Harga: <b className="text-ginger-400">{formatRupiah(prod.base_price)}</b></span>
                      <span>Stok: <b className="text-stone-300">{prod.stock_qty} pcs</b></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleProductActive(prod)}
                      className={`py-1 px-2.5 rounded-lg border text-[10px] font-extrabold transition-colors ${
                        prod.is_active !== false
                          ? 'bg-amber-950/20 border-amber-900/40 text-amber-400 hover:bg-amber-950/40'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-300'
                      }`}
                    >
                      {prod.is_active !== false ? 'Arsipkan' : 'Aktifkan'}
                    </button>
                    <button 
                      onClick={() => openEditProduct(prod)}
                      className="bg-stone-900 hover:bg-stone-850 p-2 rounded-lg border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      <Settings size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Laporan Keuangan Section */}
          <div className="border-t border-stone-900 pt-5 flex items-center justify-between gap-4 bg-stone-950/10 p-3 rounded-2xl border border-stone-900/60 mt-2">
            <div>
              <h4 className="font-bold text-xs text-stone-300">Laporan Keuangan Harian</h4>
              <p className="text-[10px] text-stone-500 mt-0.5">Ekspor semua daftar transaksi ke Excel/CSV</p>
            </div>
            <button
              onClick={() => exportOrdersToCSV(orders)}
              className="bg-green-800 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-colors active-scale shadow-lg shadow-green-950/20"
            >
              <FileSpreadsheet size={15} />
              Ekspor Excel (CSV)
            </button>
          </div>

        </div>

      </div>

      {/* Transaction History Section */}
      <div className="glass rounded-3xl p-6 border border-stone-900 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-stone-900/60 pb-4">
          <h3 className="text-base font-bold text-stone-200 flex items-center gap-2">
            📜 Riwayat Transaksi Penjualan
          </h3>
          <div className="flex items-center bg-stone-900/65 p-1 rounded-xl border border-stone-850 self-start md:self-auto">
            {['SEMUA', 'TUNAI', 'QRIS'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setFilterMethod(method)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-300 ${
                  filterMethod === method
                    ? 'bg-gradient-to-r from-ginger-600 to-ginger-700 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {method === 'SEMUA' ? 'Semua' : method === 'TUNAI' ? '💵 Tunai' : '📱 QRIS'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-stone-500 font-bold uppercase border-b border-stone-900 pb-3">
                <th className="pb-3 pr-4">Invoice</th>
                <th className="pb-3 pr-4">Waktu Transaksi</th>
                <th className="pb-3 pr-4">Metode</th>
                <th className="pb-3 pr-4">Menu Terjual</th>
                <th className="pb-3 text-right">Total Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-900">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-stone-600 font-medium">
                    Belum ada riwayat transaksi masuk.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="text-stone-300 hover:bg-stone-900/25">
                    <td className="py-3.5 pr-4 font-mono font-bold text-ginger-400">{order.invoice_no}</td>
                    <td className="py-3.5 pr-4 text-stone-400">{formatDate(order.createdAt)}</td>
                    <td className="py-3.5 pr-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.method === 'TUNAI' ? 'bg-orange-950 text-orange-400 border border-orange-900/50' : 'bg-blue-950 text-blue-400 border border-blue-900/50'
                      }`}>
                        {order.method}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 max-w-xs truncate text-[11px] text-stone-400 font-medium" title={order.items.map(i => `${i.product.name} (${i.qty}x)`).join(', ')}>
                      {order.items.map(i => `${i.product.name} (${i.qty}x)`).join(', ')}
                    </td>
                    <td className="py-3.5 text-right font-bold text-stone-100">{formatRupiah(order.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD Product */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveProduct} className="glass rounded-3xl w-full max-w-sm overflow-hidden border border-stone-800 shadow-2xl animate-scale-up">
            <div className="px-6 py-5 border-b border-stone-900/80 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-100 text-base">
                {selectedProduct ? '⚙️ Edit Varian Menu' : '➕ Tambah Menu Baru'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-stone-400 hover:text-stone-200 bg-stone-900 p-1.5 rounded-full border border-stone-850"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Nama Menu</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Misal: Wedang Ronde Premium"
                  className="w-full bg-stone-900 border border-stone-850 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-ginger-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Harga Dasar (Rp)</label>
                  <input
                    type="number"
                    required
                    value={productForm.base_price}
                    onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })}
                    placeholder="15000"
                    className="w-full bg-stone-900 border border-stone-850 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-ginger-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Stok Awal (Cup)</label>
                  <input
                    type="number"
                    required
                    value={productForm.stock_qty}
                    onChange={(e) => setProductForm({ ...productForm, stock_qty: e.target.value })}
                    placeholder="50"
                    className="w-full bg-stone-900 border border-stone-850 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-ginger-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Kategori Menu</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-850 rounded-xl px-3 py-2.5 text-xs text-stone-300 focus:outline-none focus:border-ginger-600"
                >
                  <option value="Murni">Murni (Wedang Hangat)</option>
                  <option value="Susu">Susu (Creamy Jahe)</option>
                  <option value="Lemon">Lemon (Fresh Jahe)</option>
                  <option value="Spesial">Spesial (Ronde/Sekoteng)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Status Menu</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, is_active: true })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex-1 ${
                      productForm.is_active
                        ? 'bg-ginger-950/85 border-ginger-600/80 text-ginger-300 shadow-md'
                        : 'bg-stone-900 border-stone-850 text-stone-400'
                    }`}
                  >
                    🟢 Aktif (Tampil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, is_active: false })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex-1 ${
                      !productForm.is_active
                        ? 'bg-ginger-950/85 border-ginger-600/80 text-ginger-300 shadow-md'
                        : 'bg-stone-900 border-stone-850 text-stone-400'
                    }`}
                  >
                    🔴 Arsip (Sembunyi)
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-stone-900/40 border-t border-stone-900/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="bg-stone-900 border border-stone-850 text-stone-400 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors hover:text-stone-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-ginger-600 to-ginger-700 hover:from-ginger-500 hover:to-ginger-600 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all active-scale"
              >
                Simpan Menu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal CRUD Ingredient */}
      {showIngredientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveIngredient} className="glass rounded-3xl w-full max-w-sm overflow-hidden border border-stone-800 shadow-2xl animate-scale-up">
            <div className="px-6 py-5 border-b border-stone-900/80 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-100 text-base">
                {selectedIngredient ? '⚙️ Kelola Stok Bahan Baku' : '➕ Tambah Bahan Baku Baru'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowIngredientModal(false)}
                className="text-stone-400 hover:text-stone-200 bg-stone-900 p-1.5 rounded-full border border-stone-850"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Nama Bahan Baku</label>
                <input
                  type="text"
                  required
                  disabled={!!selectedIngredient}
                  value={ingredientForm.name}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                  placeholder="Misal: Cengkeh, Serai, Kayu Manis"
                  className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none ${
                    selectedIngredient 
                      ? 'bg-stone-900/50 border-stone-850 text-stone-500 cursor-not-allowed' 
                      : 'bg-stone-900 border-stone-850 text-stone-200 focus:border-ginger-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Jumlah Stok (Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={ingredientForm.stock_kg}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, stock_kg: e.target.value })}
                    placeholder="12.5"
                    className="w-full bg-stone-900 border border-stone-850 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-ginger-600 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Batas Aman Alert (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={ingredientForm.minimum_alert_kg}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, minimum_alert_kg: e.target.value })}
                    placeholder="5.0"
                    className="w-full bg-stone-900 border border-stone-850 rounded-xl px-3 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-ginger-600 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-stone-900/40 border-t border-stone-900/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowIngredientModal(false)}
                className="bg-stone-900 border border-stone-850 text-stone-400 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors hover:text-stone-300"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-ginger-600 to-ginger-700 hover:from-ginger-500 hover:to-ginger-600 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all active-scale"
              >
                {selectedIngredient ? 'Update Stok' : 'Simpan Bahan'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

// Inline X icon to prevent errors if Lucide icon was not loaded
function X({ size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
