import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, CheckCircle2, ChevronRight, X, Sparkles, Printer } from 'lucide-react';
import { formatRupiah } from '../utils/helpers';

export default function POSInterface({ onOrderCompleted, refreshTrigger }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState(null);
  
  // Customizer state
  const [levelManis, setLevelManis] = useState('Gula Aren');
  const [suhu, setSuhu] = useState('Panas');
  const [extraSusu, setExtraSusu] = useState(false);
  const [extraEs, setExtraEs] = useState(false);
  const [customNote, setCustomNote] = useState('');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('TUNAI');
  const [amountPaid, setAmountPaid] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch products
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Display only active products
          setProducts(data.filter(p => p.is_active !== false));
        }
      })
      .catch(err => console.error('Error fetching products:', err));
  }, [refreshTrigger]);

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const amountChange = amountPaid ? Math.max(0, parseFloat(amountPaid) - cartTotal) : 0;

  // Add to cart with default options or trigger customizer
  const handleProductClick = (product) => {
    if (product.stock_qty <= 0) {
      alert('Stok cup menu ini habis!');
      return;
    }
    // Set customizer defaults and open modal
    setSelectedProductForCustomization(product);
    setLevelManis('Gula Aren');
    setSuhu(product.name.includes('Murni') || product.name.includes('Sekoteng') || product.name.includes('Ronde') ? 'Panas' : 'Dingin');
    setExtraSusu(false);
    setExtraEs(false);
    setCustomNote('');
  };

  const addCustomizedItemToCart = () => {
    if (!selectedProductForCustomization) return;
    
    const product = selectedProductForCustomization;
    
    // Calculate total price with extras
    let itemPrice = product.base_price;
    const notesArray = [];
    
    notesArray.push(`Manis: ${levelManis}`);
    notesArray.push(`Suhu: ${suhu}`);
    
    if (extraSusu) {
      itemPrice += 3000;
      notesArray.push('+Susu (+Rp3.000)');
    }
    if (extraEs) {
      itemPrice += 1000;
      notesArray.push('+Es (+Rp1.000)');
    }
    if (customNote.trim()) {
      notesArray.push(customNote.trim());
    }

    const noteString = notesArray.join(', ');

    // Check if item with exact same configuration already in cart
    const existingIndex = cart.findIndex(
      item => item.productId === product.id && item.note === noteString
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIndex].qty + 1;
      if (newQty > product.stock_qty) {
        alert('Stok produk tidak mencukupi untuk jumlah ini!');
        return;
      }
      updatedCart[existingIndex].qty = newQty;
      updatedCart[existingIndex].subtotal = newQty * itemPrice;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          base_price: product.base_price,
          unitPrice: itemPrice,
          qty: 1,
          note: noteString,
          subtotal: itemPrice
        }
      ]);
    }

    setSelectedProductForCustomization(null);
  };

  const updateCartQty = (index, delta) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];
    const originalProd = products.find(p => p.id === item.productId);
    
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      updatedCart.splice(index, 1);
    } else {
      if (originalProd && newQty > originalProd.stock_qty) {
        alert('Jumlah pembelian melebihi stok cup ready!');
        return;
      }
      item.qty = newQty;
      item.subtotal = newQty * item.unitPrice;
    }
    setCart(updatedCart);
  };

  const removeCartItem = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  const handleQuickPayment = (nominal) => {
    if (nominal === 'PAS') {
      setAmountPaid(cartTotal.toString());
    } else {
      setAmountPaid(nominal.toString());
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!amountPaid || parseFloat(amountPaid) < cartTotal) {
      alert('Uang pembayaran kurang!');
      return;
    }

    setIsLoading(true);

    const orderPayload = {
      items: cart.map(item => ({
        productId: item.productId,
        qty: item.qty,
        note: item.note,
        subtotal: item.subtotal
      })),
      total: cartTotal,
      paid: parseFloat(amountPaid),
      change: amountChange,
      method: paymentMethod
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        const orderData = await response.json();
        setSuccessOrder({
          ...orderData,
          cartItems: [...cart] // Save cart items details for invoice popup
        });
        setCart([]);
        setAmountPaid('');
        onOrderCompleted(); // refresh layout database / warnings
      } else {
        const errData = await response.json();
        alert(`Gagal membuat transaksi: ${errData.error || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan koneksi saat memproses order');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine category icon/emoji
  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'Susu': return '🥛';
      case 'Murni': return '🍵';
      case 'Lemon': return '🍋';
      case 'Spesial': return '🍧';
      default: return '☕';
    }
  };

  // Helper to determine category card gradient
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Susu': return 'from-amber-600/40 to-ginger-700/30 border-ginger-600/30';
      case 'Murni': return 'from-stone-800/80 to-stone-900/60 border-stone-800';
      case 'Lemon': return 'from-amber-500/20 to-yellow-600/25 border-yellow-600/20';
      case 'Spesial': return 'from-ginger-800/40 to-red-900/30 border-ginger-800/30';
      default: return 'from-stone-800 to-stone-900 border-stone-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
      {/* Product List Grid */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-ginger-100 flex items-center gap-2">
            Menu SUJAMERA
            <span className="text-xs bg-stone-900 text-ginger-400 px-2 py-0.5 rounded-full border border-stone-800">
              {products.length} Varian
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product) => {
            const isOutOfStock = product.stock_qty <= 0;
            return (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                disabled={isOutOfStock}
                className={`glass hover-scale active-scale relative text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-44 group ${
                  isOutOfStock ? 'opacity-40 cursor-not-allowed border-stone-900' : getCategoryColor(product.category)
                }`}
              >
                {/* Visual Category Pill */}
                <div className="flex justify-between items-start w-full">
                  <span className="text-3xl filter drop-shadow">
                    {getCategoryEmoji(product.category)}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-900/80 text-stone-300 border border-stone-800">
                    {product.category}
                  </span>
                </div>

                {/* Info Text */}
                <div className="mt-4">
                  <h3 className="font-bold text-stone-100 group-hover:text-ginger-300 transition-colors text-base line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-ginger-400 font-extrabold text-lg mt-1">
                    {formatRupiah(product.base_price)}
                  </p>
                </div>

                {/* Stock Count */}
                <div className="w-full flex items-center justify-between text-xs text-stone-400 border-t border-stone-900/50 pt-2 mt-2">
                  <span>Stok Cup</span>
                  <span className={`font-semibold ${product.stock_qty < 10 ? 'text-red-400' : 'text-stone-300'}`}>
                    {product.stock_qty} pcs
                  </span>
                </div>

                {/* Out of Stock Ribbon */}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-stone-950/80 rounded-2xl flex items-center justify-center">
                    <span className="bg-red-950 text-red-300 border border-red-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Stok Habis
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart Sidebar Panel */}
      <div className="lg:col-span-4 glass rounded-3xl p-6 border border-stone-900 flex flex-col gap-6 shadow-xl sticky top-28">
        <h2 className="text-lg font-bold text-stone-200 border-b border-stone-900 pb-3 flex justify-between items-center">
          <span>Keranjang Belanja</span>
          <span className="text-xs bg-ginger-950/80 text-ginger-400 border border-ginger-900/50 px-2.5 py-1 rounded-full font-bold">
            {cart.reduce((s, i) => s + i.qty, 0)} Item
          </span>
        </h2>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-4 pr-1">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-stone-500 flex flex-col items-center gap-3">
              <span className="text-4xl">🛒</span>
              <p className="text-sm font-medium">Keranjang masih kosong</p>
              <p className="text-xs text-stone-600">Klik menu SUJAMERA di kiri untuk memulai</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-3 p-3 bg-stone-900/50 rounded-xl border border-stone-900">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-stone-200 text-sm line-clamp-1">{item.name}</h4>
                  <p className="text-[11px] text-stone-400 leading-tight mt-1 line-clamp-2 italic">{item.note}</p>
                  <p className="text-xs text-ginger-400 font-extrabold mt-1.5">{formatRupiah(item.unitPrice)}</p>
                </div>
                
                <div className="flex flex-col items-end gap-3 justify-between h-full">
                  <button 
                    onClick={() => removeCartItem(idx)}
                    className="text-stone-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded-lg border border-stone-900">
                    <button 
                      onClick={() => updateCartQty(idx, -1)}
                      className="text-stone-400 hover:text-stone-200 transition-colors p-0.5"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-bold text-stone-200 w-5 text-center">{item.qty}</span>
                    <button 
                      onClick={() => updateCartQty(idx, 1)}
                      className="text-stone-400 hover:text-stone-200 transition-colors p-0.5"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary */}
        <div className="border-t border-stone-900 pt-4 flex flex-col gap-3">
          <div className="flex justify-between text-sm text-stone-400 font-medium">
            <span>Total Belanja</span>
            <span className="text-stone-200 font-bold text-base">{formatRupiah(cartTotal)}</span>
          </div>

          {/* Payment Method Selector */}
          <div className="mt-2">
            <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block mb-2">Metode Pembayaran</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('TUNAI')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  paymentMethod === 'TUNAI'
                    ? 'bg-ginger-950/80 border-ginger-600/80 text-ginger-300 shadow-md shadow-ginger-950/20'
                    : 'bg-stone-900 border-stone-850 text-stone-400 hover:text-stone-300'
                }`}
              >
                💵 Tunai
              </button>
              <button
                onClick={() => setPaymentMethod('QRIS')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  paymentMethod === 'QRIS'
                    ? 'bg-ginger-950/80 border-ginger-600/80 text-ginger-300 shadow-md shadow-ginger-950/20'
                    : 'bg-stone-900 border-stone-850 text-stone-400 hover:text-stone-300'
                }`}
              >
                📱 QRIS (Simulasi)
              </button>
            </div>
          </div>

          {/* Calculator Input & Nominal Fast Buttons (Cash Only) */}
          {paymentMethod === 'TUNAI' && cartTotal > 0 && (
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Jumlah Uang Tunai..."
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="bg-stone-950 border border-stone-850 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-ginger-600 text-stone-100 flex-1 font-mono text-right"
                />
              </div>

              {/* Fast Cash Buttons */}
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  onClick={() => handleQuickPayment('PAS')}
                  className="bg-stone-900 hover:bg-stone-850 border border-stone-850 text-[10px] font-bold py-2 rounded-lg text-stone-300 transition-colors"
                >
                  Pas
                </button>
                <button
                  onClick={() => handleQuickPayment(10000)}
                  className="bg-stone-900 hover:bg-stone-850 border border-stone-850 text-[10px] font-bold py-2 rounded-lg text-stone-300 transition-colors"
                >
                  10k
                </button>
                <button
                  onClick={() => handleQuickPayment(20000)}
                  className="bg-stone-900 hover:bg-stone-850 border border-stone-850 text-[10px] font-bold py-2 rounded-lg text-stone-300 transition-colors"
                >
                  20k
                </button>
                <button
                  onClick={() => handleQuickPayment(50000)}
                  className="bg-stone-900 hover:bg-stone-850 border border-stone-850 text-[10px] font-bold py-2 rounded-lg text-stone-300 transition-colors"
                >
                  50k
                </button>
                <button
                  onClick={() => handleQuickPayment(100000)}
                  className="bg-stone-900 hover:bg-stone-850 border border-stone-850 text-[10px] font-bold py-2 rounded-lg text-stone-300 transition-colors"
                >
                  100k
                </button>
              </div>

              {/* Change calculation */}
              {amountPaid && parseFloat(amountPaid) >= cartTotal && (
                <div className="flex justify-between items-center bg-ginger-950/20 border border-ginger-950/50 p-2.5 rounded-xl text-xs font-semibold text-ginger-400 mt-1">
                  <span>Uang Kembali:</span>
                  <span className="font-mono text-sm font-bold">{formatRupiah(amountChange)}</span>
                </div>
              )}
            </div>
          )}

          {/* QRIS quick pas simulation */}
          {paymentMethod === 'QRIS' && cartTotal > 0 && (
            <div className="bg-stone-900/50 border border-stone-850 rounded-xl p-3 text-center flex flex-col items-center gap-2 mt-2">
              <span className="text-2xl">⚡</span>
              <p className="text-[11px] text-stone-400">Pembayaran QRIS akan otomatis terverifikasi pas senilai <b>{formatRupiah(cartTotal)}</b></p>
            </div>
          )}

          {/* Place Order Button */}
          <button
            onClick={() => {
              if (paymentMethod === 'QRIS') {
                setAmountPaid(cartTotal.toString());
                // Short timeout to let the state update or bypass
                setTimeout(handleCheckout, 100);
              } else {
                handleCheckout();
              }
            }}
            disabled={
              cart.length === 0 || 
              isLoading || 
              (paymentMethod === 'TUNAI' && (!amountPaid || parseFloat(amountPaid) < cartTotal))
            }
            className="w-full bg-gradient-to-r from-ginger-600 to-ginger-700 hover:from-ginger-500 hover:to-ginger-600 disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all duration-300 shadow-lg shadow-ginger-900/20 flex items-center justify-center gap-2 active-scale mt-3"
          >
            {isLoading ? 'Memproses...' : 'Proses Bayar & Cetak'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Modal Customizer Laci */}
      {selectedProductForCustomization && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-3xl w-full max-w-md overflow-hidden border border-stone-800 shadow-2xl animate-scale-up">
            
            {/* Header Modal */}
            <div className="px-6 py-5 border-b border-stone-900/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-ginger-400 bg-ginger-950/80 border border-ginger-900/40 px-2 py-0.5 rounded">
                  Kustomisasi Menu
                </span>
                <h3 className="font-extrabold text-stone-100 text-lg mt-1">{selectedProductForCustomization.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedProductForCustomization(null)}
                className="text-stone-400 hover:text-stone-200 bg-stone-900 p-1.5 rounded-full border border-stone-850"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body options */}
            <div className="p-6 flex flex-col gap-5 text-sm">
              
              {/* Level Manis */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2.5">Level Manis</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Gula Aren', 'Gula Biasa', 'Sedikit Gula', 'Tanpa Gula'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setLevelManis(opt)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center ${
                        levelManis === opt
                          ? 'bg-ginger-950/80 border-ginger-600/80 text-ginger-300'
                          : 'bg-stone-900 border-stone-850 text-stone-400 hover:text-stone-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suhu */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2.5">Suhu Sajian</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Panas', 'Dingin'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSuhu(opt)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        suhu === opt
                          ? 'bg-ginger-950/80 border-ginger-600/80 text-ginger-300'
                          : 'bg-stone-900 border-stone-850 text-stone-400 hover:text-stone-300'
                      }`}
                    >
                      {opt === 'Panas' ? '🔥 Panas' : '❄️ Dingin'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Tambahan */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2.5">Tambahan (Ekstra)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setExtraSusu(!extraSusu)}
                    className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between h-16 ${
                      extraSusu
                        ? 'bg-ginger-950/80 border-ginger-600/80 text-ginger-300'
                        : 'bg-stone-900 border-stone-850 text-stone-400 hover:text-stone-300'
                    }`}
                  >
                    <span>🥛 Susu Kental Manis</span>
                    <span className="text-[10px] text-ginger-400 font-extrabold">+Rp3.000</span>
                  </button>
                  
                  <button
                    onClick={() => setExtraEs(!extraEs)}
                    className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between h-16 ${
                      extraEs
                        ? 'bg-ginger-950/80 border-ginger-600/80 text-ginger-300'
                        : 'bg-stone-900 border-stone-850 text-stone-400 hover:text-stone-300'
                    }`}
                  >
                    <span>🧊 Es Batu</span>
                    <span className="text-[10px] text-ginger-400 font-extrabold">+Rp1.000</span>
                  </button>
                </div>
              </div>

              {/* Note input */}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">Catatan Pesanan</label>
                <input
                  type="text"
                  placeholder="Misal: Sendok plastik, jahe dibakar lebih lama..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-850 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-ginger-600 text-stone-200"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-stone-900/40 border-t border-stone-900/80 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[11px] text-stone-400">Total Harga Item</span>
                <span className="text-ginger-400 font-extrabold text-lg">
                  {formatRupiah(selectedProductForCustomization.base_price + (extraSusu ? 3000 : 0) + (extraEs ? 1000 : 0))}
                </span>
              </div>
              <button
                onClick={addCustomizedItemToCart}
                className="bg-gradient-to-r from-ginger-600 to-ginger-700 hover:from-ginger-500 hover:to-ginger-600 text-white font-bold py-3 px-6 rounded-xl text-xs transition-all active-scale shadow-lg shadow-ginger-950/40"
              >
                Tambahkan Varian
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Invoice Success Popup */}
      {successOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-stone-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 font-mono text-xs border border-stone-200 animate-scale-up">
            
            {/* Header Struk */}
            <div className="text-center border-b border-dashed border-stone-300 pb-4 flex flex-col items-center gap-1">
              <span className="text-3xl">🍵</span>
              <h3 className="font-bold text-sm uppercase tracking-wider text-stone-800">SUJAMERA MODERN</h3>
              <p className="text-[10px] text-stone-500">Jl. Jahe Hangat No. 16, Indonesia</p>
              <div className="flex items-center gap-1 text-green-700 font-bold mt-1 text-[11px]">
                <CheckCircle2 size={13} />
                <span>Transaksi Sukses</span>
              </div>
            </div>

            {/* Struk Meta */}
            <div className="py-3 border-b border-dashed border-stone-300 flex flex-col gap-1 text-stone-600 text-[10px]">
              <div className="flex justify-between">
                <span>No. Invoice</span>
                <span className="font-bold text-stone-800">{successOrder.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>{new Date(successOrder.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode</span>
                <span className="font-bold uppercase">{successOrder.method}</span>
              </div>
            </div>

            {/* Struk Items */}
            <div className="py-4 border-b border-dashed border-stone-300 flex flex-col gap-2.5 max-h-[180px] overflow-y-auto pr-1">
              {successOrder.cartItems?.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-0.5">
                  <div className="flex justify-between font-bold text-stone-800">
                    <span>{item.name} ({item.qty}x)</span>
                    <span>{formatRupiah(item.subtotal)}</span>
                  </div>
                  <div className="text-[9px] text-stone-500 italic max-w-[90%] pl-2">
                    {item.note}
                  </div>
                </div>
              ))}
            </div>

            {/* Struk Totals */}
            <div className="py-4 flex flex-col gap-1.5 text-stone-800 text-[11px]">
              <div className="flex justify-between font-bold text-sm">
                <span>GRAND TOTAL</span>
                <span>{formatRupiah(successOrder.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>DIBAYAR ({successOrder.method})</span>
                <span>{formatRupiah(successOrder.paid)}</span>
              </div>
              {successOrder.method === 'TUNAI' && (
                <div className="flex justify-between font-bold text-stone-600">
                  <span>KEMBALIAN</span>
                  <span>{formatRupiah(successOrder.change)}</span>
                </div>
              )}
            </div>

            {/* Struk Footer Messages */}
            <div className="text-center border-t border-dashed border-stone-300 pt-4 pb-2 text-[10px] text-stone-500 flex flex-col gap-1">
              <p className="font-bold">Terima kasih atas kunjungan Anda!</p>
              <p>Minum jahe hangat, badan sehat pikiran segar.</p>
            </div>

            {/* Print & Close Actions */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 py-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors font-sans text-xs active-scale"
              >
                <Printer size={14} />
                Cetak Struk
              </button>
              <button
                onClick={() => setSuccessOrder(null)}
                className="flex-1 bg-stone-900 hover:bg-stone-800 text-white py-3 rounded-xl font-bold text-center transition-colors font-sans text-xs active-scale"
              >
                Tutup Invoice
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
