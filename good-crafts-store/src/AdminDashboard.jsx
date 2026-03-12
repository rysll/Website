import React, { useEffect, useState } from 'react';
import { useProducts } from './ProductContext';
import { useOrders, ORDER_STATUSES } from './OrderContext.jsx';
import { useAuth } from './AuthContext';
import {
  X, LogOut, LayoutDashboard, Package, ShoppingCart,
  Truck, Archive, AlertTriangle, Search,
  Plus, Minus, RefreshCw, ChevronRight, User, MapPin,
  Calendar, CheckCircle2, Phone, Mail
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const weeklySales = [
  { day: 'Mon', sales: 4200 }, { day: 'Tue', sales: 3800 },
  { day: 'Wed', sales: 5100 }, { day: 'Thu', sales: 4600 },
  { day: 'Fri', sales: 6300 }, { day: 'Sat', sales: 7200 },
  { day: 'Sun', sales: 5900 },
];

const categoryData = [
  { cat: 'Keyholders', count: 12 },
  { cat: 'Wallets', count: 8 },
  { cat: 'Coin Purse', count: 5 },
  { cat: 'Pins', count: 3 },
];

const MOCK_INVENTORY = [
  { id: 1, name: 'Leather Keyholder', location: 'Shelf A', qty: 45, lastRestocked: '2026-03-05', low: false },
  { id: 2, name: 'Leather Wallet', location: 'Shelf A', qty: 23, lastRestocked: '2026-03-08', low: false },
  { id: 3, name: 'Triangle Coin Purse', location: 'Shelf B', qty: 8, lastRestocked: '2026-03-01', low: true },
  { id: 4, name: 'Button Pin', location: 'Shelf B', qty: 150, lastRestocked: '2026-03-10', low: false },
  { id: 5, name: 'Custom Wallet (Large)', location: 'Shelf C', qty: 4, lastRestocked: '2026-02-28', low: true },
];

const DELIVERY_STATUSES = ORDER_STATUSES;

const statusColor = (status) => {
  switch (status) {
    case 'delivered': return 'bg-teal-100 text-teal-700';
    case 'in transit': return 'bg-blue-100 text-blue-700';
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'failed': return 'bg-red-100 text-red-700';
    default: return 'bg-stone-100 text-stone-600';
  }
};

const orderStatusColor = (status) => {
  const s = status?.toLowerCase();
  if (s === 'completed' || s === 'delivered') return 'bg-teal-100 text-teal-700';
  if (s === 'processing' || s === 'in transit') return 'bg-blue-100 text-blue-700';
  if (s === 'pending') return 'bg-amber-100 text-amber-700';
  if (s === 'cancelled') return 'bg-red-100 text-red-700';
  return 'bg-stone-100 text-stone-600';
};

export const AdminDashboard = ({ onClose, onOpenPanel }) => {
  const { products } = useProducts();
  const { orders, loading, fetchOrders, updateOrderStatus } = useOrders();
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [searchDelivery, setSearchDelivery] = useState('');
  const [searchInventory, setSearchInventory] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState('all');

  // Derive deliveries from real orders — show orders that are past "order placed"
  const deliveries = orders.filter(o =>
    o.status && o.status !== 'order placed'
  );

  const filteredDeliveries = deliveries.filter(o => {
    const matchSearch =
      (o.customer_name || '').toLowerCase().includes(searchDelivery.toLowerCase()) ||
      String(o.id).includes(searchDelivery);
    const matchFilter = deliveryFilter === 'all' || o.status === deliveryFilter;
    return matchSearch && matchFilter;
  });

  useEffect(() => {
    fetchOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusCounts = ORDER_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  const activeOrders = orders.filter(o => {
    const s = o.status?.toLowerCase();
    return s !== 'completed' && s !== 'cancelled' && s !== 'delivered';
  }).length;

  const activeDeliveries = orders.filter(o => o.status === 'in transit' || o.status === 'out for delivery').length;
  const lowStockCount = inventory.filter(i => i.low).length;

  const filteredInventory = inventory.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(searchInventory.toLowerCase());
    const matchFilter = inventoryFilter === 'all' || (inventoryFilter === 'low' && i.low) || (inventoryFilter === 'instock' && !i.low);
    return matchSearch && matchFilter;
  });

  const updateInventoryQty = (id, delta) => {
    setInventory(inv => inv.map(i => {
      if (i.id !== id) return i;
      const newQty = Math.max(0, i.qty + delta);
      return { ...i, qty: newQty, low: newQty < 10 };
    }));
  };

  const restock = (id) => {
    setInventory(inv => inv.map(i =>
      i.id === id
        ? { ...i, qty: i.qty + 50, lastRestocked: new Date().toISOString().split('T')[0], low: false }
        : i
    ));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'inventory', label: 'Inventory', icon: Archive },
  ];

  return (
    <div className="fixed inset-0 z-50 flex bg-stone-100 font-sans text-stone-800">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shrink-0 shadow-sm">
        <div className="px-6 py-5 border-b border-stone-200">
          <h1 className="text-lg font-bold text-stone-900">Admin Dashboard</h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon size={18} className={activeTab === id ? 'text-teal-600' : 'text-stone-400'} />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-stone-200 space-y-1">
          <button
            onClick={onOpenPanel}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-all"
          >
            <Package size={18} className="text-stone-400" />
            Manage Products
          </button>
          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-8 h-14 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <span className="text-stone-900 font-semibold capitalize">{activeTab}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-6 max-w-6xl mx-auto">

          {/* ═══ DASHBOARD TAB ═══ */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-stone-900">Dashboard Overview</h2>
                <p className="text-stone-500 text-sm mt-1">Welcome back! Here's what's happening today.</p>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Products', value: products.length, sub: `${products.length} active`, icon: Package, iconColor: 'text-blue-500', iconBg: 'bg-blue-50' },
                  { label: 'Total Orders', value: orders.length, sub: `${activeOrders} active`, icon: ShoppingCart, iconColor: 'text-teal-600', iconBg: 'bg-teal-50' },
                  { label: 'Active Deliveries', value: activeDeliveries, sub: 'In transit', icon: Truck, iconColor: 'text-stone-600', iconBg: 'bg-stone-100' },
                  { label: 'Low Stock Alerts', value: lowStockCount, sub: 'Need restocking', icon: AlertTriangle, iconColor: 'text-red-500', iconBg: 'bg-red-50' },
                ].map(({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
                  <div key={label} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
                    <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon size={20} className={iconColor} />
                    </div>
                    <p className="text-sm text-stone-500 mb-1">{label}</p>
                    <p className="text-3xl font-bold text-stone-900">{value}</p>
                    <p className="text-xs text-stone-400 mt-1">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                  <h3 className="text-base font-bold text-stone-900 mb-4">Weekly Sales (₱)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={weeklySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 13 }} />
                      <Line type="monotone" dataKey="sales" stroke="#0d9488" strokeWidth={2.5} dot={{ fill: '#0d9488', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                  <h3 className="text-base font-bold text-stone-900 mb-4">Products by Category</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                      <XAxis dataKey="cat" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontSize: 13 }} />
                      <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                <h3 className="text-base font-bold text-stone-900 mb-4">Order Status Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {ORDER_STATUSES.map(s => (
                    <div key={s} className="bg-stone-50 rounded-xl p-3 text-center border border-stone-100">
                      <div className="text-2xl font-bold text-stone-900">{statusCounts[s] || 0}</div>
                      <div className="text-xs text-stone-500 mt-1 capitalize">{s}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ PRODUCTS TAB ═══ */}
          {activeTab === 'products' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">Products</h2>
                  <p className="text-stone-500 text-sm mt-1">{products.length} products in your catalog</p>
                </div>
                <button
                  onClick={onOpenPanel}
                  className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
                >
                  <Plus size={16} /> Add Product
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      <th className="text-left p-4 font-semibold text-stone-600">Product</th>
                      <th className="text-left p-4 font-semibold text-stone-600">Price</th>
                      <th className="text-left p-4 font-semibold text-stone-600">Colors</th>
                      <th className="text-left p-4 font-semibold text-stone-600">Min. Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={p.id} className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i === products.length - 1 ? 'border-0' : ''}`}>
                        <td className="p-4">
                          <div className="font-semibold text-stone-800">{p.name}</div>
                          <div className="text-xs text-stone-400 mt-0.5 line-clamp-1">{p.description}</div>
                        </td>
                        <td className="p-4 font-bold text-teal-600">₱{p.basePrice}</td>
                        <td className="p-4 text-stone-500">
                          {(Array.isArray(p.colors) ? p.colors : p.colors?.split(',') || []).slice(0, 3).join(', ')}
                          {(Array.isArray(p.colors) ? p.colors : p.colors?.split(',') || []).length > 3 && '…'}
                        </td>
                        <td className="p-4">
                          <span className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg text-xs font-semibold">{p.minOrder}pc+</span>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr><td colSpan={4} className="p-12 text-center text-stone-400">No products yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ ORDERS TAB ═══ */}
          {activeTab === 'orders' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-stone-900">Orders</h2>
                <p className="text-stone-500 text-sm mt-1">{orders.length} total orders</p>
              </div>

              {loading ? (
                <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">No orders yet.</div>
              ) : (
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        <th className="text-left p-4 font-semibold text-stone-600">Order #</th>
                        <th className="text-left p-4 font-semibold text-stone-600">Customer</th>
                        <th className="text-left p-4 font-semibold text-stone-600">Total</th>
                        <th className="text-left p-4 font-semibold text-stone-600">Status</th>
                        <th className="text-left p-4 font-semibold text-stone-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, i) => (
                        <tr key={o.id} className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i === orders.length - 1 ? 'border-0' : ''}`}>
                          <td className="p-4">
                            <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded-lg">
                              #{o.id}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-stone-800">{o.customer_name || '–'}</div>
                            <div className="text-xs text-stone-400">{o.customer_email}</div>
                          </td>
                          <td className="p-4 font-bold text-teal-600">
                            ₱{Number(o.total || 0).toFixed(2)}
                          </td>
                          <td className="p-4">
                            <select
                              value={o.status}
                              disabled={updatingId === o.id}
                              onChange={async e => {
                                setUpdatingId(o.id);
                                try { await updateOrderStatus(o.id, e.target.value); }
                                catch (err) { alert('Failed to update status: ' + err.message); }
                                finally { setUpdatingId(null); }
                              }}
                              className={`text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-teal-500 outline-none capitalize ${updatingId === o.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {updatingId === o.id && (
                              <span className="text-xs text-stone-400 ml-1">saving…</span>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setDetailsOrder(o)}
                              className="text-teal-600 text-xs font-semibold hover:text-teal-800 flex items-center gap-1"
                            >
                              Details <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ DELIVERY TAB ═══ */}
          {activeTab === 'delivery' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-stone-900">Delivery Management</h2>
                <p className="text-stone-500 text-sm mt-1">Orders that are packed and in progress</p>
              </div>

              <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search by name or order ID..."
                    value={searchDelivery}
                    onChange={e => setSearchDelivery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <select
                  value={deliveryFilter}
                  onChange={e => setDeliveryFilter(e.target.value)}
                  className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="all">All Statuses</option>
                  {DELIVERY_STATUSES.filter(s => s !== 'order placed').map(s => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>

              {loading ? (
                <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">Loading…</div>
              ) : filteredDeliveries.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-stone-100">
                  <Truck size={36} className="text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400 font-medium">No active deliveries found.</p>
                  <p className="text-stone-300 text-xs mt-1">Orders will appear here once their status is updated past "order placed".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredDeliveries.map(o => (
                    <div key={o.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-bold text-stone-900 font-mono">#{o.id}</span>
                          <span className="text-xs text-stone-400 ml-2">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH') : ''}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </div>

                      <div className="space-y-2.5 mb-4 border-t border-stone-50 pt-4">
                        {[
                          { icon: User, label: 'Customer', value: o.customer_name },
                          { icon: Phone, label: 'Phone', value: o.customer_phone },
                          { icon: MapPin, label: 'Address', value: o.customer_address },
                          { icon: Mail, label: 'Email', value: o.customer_email },
                        ].map(({ icon: Icon, label, value }) => value ? (
                          <div key={label} className="flex items-start gap-3">
                            <Icon size={15} className="text-stone-400 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-xs text-stone-400">{label}</div>
                              <div className="text-sm font-semibold text-stone-800">{value}</div>
                            </div>
                          </div>
                        ) : null)}
                      </div>

                      <div className="border-t border-stone-100 pt-4">
                        <p className="text-xs text-stone-500 mb-2 font-medium">Update Status</p>
                        <select
                          value={o.status}
                          disabled={updatingId === o.id}
                          onChange={async e => {
                            setUpdatingId(o.id);
                            try { await updateOrderStatus(o.id, e.target.value); }
                            catch (err) { alert('Failed to update status: ' + err.message); }
                            finally { setUpdatingId(null); }
                          }}
                          className={`w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none capitalize ${updatingId === o.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {ORDER_STATUSES.map(s => (
                            <option key={s} value={s} className="capitalize">{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ INVENTORY TAB ═══ */}
          {activeTab === 'inventory' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-stone-900">Inventory Management</h2>
                <p className="text-stone-500 text-sm mt-1">Track and manage stock levels</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Total Items', value: inventory.reduce((s, i) => s + i.qty, 0), icon: Package, iconColor: 'text-blue-500', iconBg: 'bg-blue-50' },
                  { label: 'Products Tracked', value: inventory.length, icon: Archive, iconColor: 'text-teal-600', iconBg: 'bg-teal-50' },
                  { label: 'Low Stock Alerts', value: inventory.filter(i => i.low).length, icon: AlertTriangle, iconColor: 'text-red-500', iconBg: 'bg-red-50' },
                ].map(({ label, value, icon: Icon, iconColor, iconBg }) => (
                  <div key={label} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm flex items-center gap-4">
                    <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                      <Icon size={22} className={iconColor} />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">{label}</p>
                      <p className="text-2xl font-bold text-stone-900">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchInventory}
                    onChange={e => setSearchInventory(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <select
                  value={inventoryFilter}
                  onChange={e => setInventoryFilter(e.target.value)}
                  className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="all">All Items</option>
                  <option value="low">Low Stock</option>
                  <option value="instock">In Stock</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {['Product', 'Location', 'Quantity', 'Last Restocked', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left p-4 font-semibold text-stone-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item, i) => (
                      <tr key={item.id} className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i === filteredInventory.length - 1 ? 'border-0' : ''}`}>
                        <td className="p-4">
                          <div className="font-semibold text-stone-800">{item.name}</div>
                          <div className="text-xs text-stone-400">ID: {item.id}</div>
                        </td>
                        <td className="p-4 text-stone-600">{item.location}</td>
                        <td className="p-4 font-bold text-stone-900">{item.qty}</td>
                        <td className="p-4 text-stone-500 text-xs">{item.lastRestocked}</td>
                        <td className="p-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.low ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'}`}>
                            {item.low ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateInventoryQty(item.id, -1)} className="w-7 h-7 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors">
                              <Minus size={12} className="text-stone-600" />
                            </button>
                            <button onClick={() => updateInventoryQty(item.id, 1)} className="w-7 h-7 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100 transition-colors">
                              <Plus size={12} className="text-stone-600" />
                            </button>
                            <button onClick={() => restock(item.id)} className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors">
                              <RefreshCw size={11} /> Restock
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 && (
                      <tr><td colSpan={6} className="p-12 text-center text-stone-400">No items found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── ORDER DETAILS MODAL ── */}
      {detailsOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-stone-900">Order {detailsOrder.id}</h4>
              <button onClick={() => setDetailsOrder(null)} className="p-2 hover:bg-stone-100 rounded-full">
                <X size={18} className="text-stone-500" />
              </button>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-stone-500">Status</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${orderStatusColor(detailsOrder.status)}`}>{detailsOrder.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Customer</span>
                <span className="font-medium">{detailsOrder.customer_name || '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Email</span>
                <span className="font-medium">{detailsOrder.customer_email || '–'}</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-stone-700 mb-2">Items</p>
            <ul className="space-y-1.5 mb-6">
              {detailsOrder.items?.map((it, idx) => (
                <li key={idx} className="flex justify-between text-sm bg-stone-50 rounded-lg px-3 py-2">
                  <span className="text-stone-700">{it.product.name} — {it.variant?.name || '–'}</span>
                  <span className="font-bold text-stone-900">×{it.quantity}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setDetailsOrder(null)} className="w-full py-2.5 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-colors text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};