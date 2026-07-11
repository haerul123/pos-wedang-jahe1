import React, { useState, useEffect } from 'react';
import { ShoppingCart, LayoutDashboard, Coffee, Sparkles, AlertTriangle } from 'lucide-react';
import POSInterface from './components/POSInterface.jsx';
import CMSDashboard from './components/CMSDashboard.jsx';

function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [lowStockIngredients, setLowStockIngredients] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check low stock ingredients for the notification bar
  useEffect(() => {
    fetch('/api/ingredients')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const lowStock = data.filter(ing => ing.stock_kg <= ing.minimum_alert_kg);
          setLowStockIngredients(lowStock);
        }
      })
      .catch(err => console.error('Error fetching stock status:', err));
  }, [refreshTrigger, activeTab]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Top Notification Bar for Low Stock */}
      {lowStockIngredients.length > 0 && (
        <div className="bg-gradient-to-r from-red-900 to-amber-800 text-amber-50 px-4 py-2 text-center text-xs md:text-sm font-medium flex items-center justify-center gap-2 shadow-md animate-pulse">
          <AlertTriangle size={16} className="shrink-0" />
          <span>Peringatan Stok Menipis: {lowStockIngredients.map(i => `${i.name} (${i.stock_kg.toFixed(2)} Kg)`).join(', ')} di bawah batas aman (5 Kg)!</span>
        </div>
      )}

      {/* Header / Navbar */}
      <header className="glass sticky top-0 z-40 px-4 py-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-ginger-500 to-ginger-700 p-2.5 rounded-2xl shadow-inner shadow-ginger-400">
            <Coffee className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-ginger-200 via-ginger-400 to-ginger-600 flex items-center gap-1.5">
              SUJAMERA
              <Sparkles size={16} className="text-ginger-400 animate-spin-slow" />
            </h1>
            <p className="text-xs text-stone-400 font-medium">Sistem POS & Backoffice Pintar UMKM</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center bg-stone-900/80 p-1.5 rounded-xl border border-stone-800 shadow-inner">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'pos'
                ? 'bg-gradient-to-r from-ginger-600 to-ginger-700 text-white shadow-lg'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShoppingCart size={18} />
            Kasir POS
          </button>
          <button
            onClick={() => setActiveTab('cms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'cms'
                ? 'bg-gradient-to-r from-ginger-600 to-ginger-700 text-white shadow-lg'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <LayoutDashboard size={18} />
            CMS Admin
          </button>
        </nav>
      </header>

      {/* Main View Area */}
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">
          {activeTab === 'pos' ? (
            <POSInterface onOrderCompleted={triggerRefresh} refreshTrigger={refreshTrigger} />
          ) : (
            <CMSDashboard refreshTrigger={refreshTrigger} onDataChanged={triggerRefresh} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-stone-500 border-t border-stone-900">
        <p>© 2026 POS SUJAMERA Modern • Solusi Cerdas UMKM Indonesia • Google Antigravity Agent</p>
      </footer>
    </div>
  );
}

export default App;
