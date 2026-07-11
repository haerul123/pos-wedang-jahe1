/**
 * Formats a number to Indonesian Rupiah currency format
 * @param {number} value 
 * @returns {string}
 */
export function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats an ISO date string to a readable Indonesian date and time
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export function formatDate(dateVal) {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Triggers a download of a CSV file containing sales report
 * @param {Array} orders 
 */
export function exportOrdersToCSV(orders) {
  if (!orders || orders.length === 0) {
    alert('Tidak ada transaksi untuk diekspor!');
    return;
  }

  // Header
  const headers = ['No. Invoice', 'Tanggal', 'Metode Pembayaran', 'Total Belanja', 'Uang Dibayar', 'Uang Kembalian', 'Detail Menu (Qty x Subtotal)'];
  
  // Rows
  const rows = orders.map(order => {
    const itemDetails = order.items
      .map(item => `${item.product.name} [${item.note || 'Biasa'}] (${item.qty}x ${formatRupiah(item.subtotal)})`)
      .join('; ');

    return [
      order.invoice_no,
      new Date(order.createdAt).toLocaleString('id-ID'),
      order.method,
      order.total,
      order.paid,
      order.change,
      `"${itemDetails}"`
    ];
  });

  const csvContent = '\uFEFF' + [
    headers.join(','),
    ...rows.map(e => e.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `Laporan-POS-SUJAMERA-${today}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
