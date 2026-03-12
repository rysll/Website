import React, { useEffect, useState } from 'react';
import { useProducts } from './ProductContext';
import { useOrders, ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_LABELS, formatOrderId, getPaymentAmounts } from './OrderContext.jsx';
import { useAuth } from './AuthContext';
import {
  X, LogOut, LayoutDashboard, Package, ShoppingCart,
  Truck, Archive, AlertTriangle, Search, Menu,
  Plus, Minus, RefreshCw, ChevronRight, User, MapPin,
  Calendar, CheckCircle2, Phone, Mail, Banknote, CreditCard, Clock, AlertCircle
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

const DELIVERY_STATUSES = ORDER_STATUSES;

const statusColor = (status) => {
  switch (status) {
    case 'delivered':   return 'bg-teal-100 text-teal-700';
    case 'in transit':  return 'bg-blue-100 text-blue-700';
    case 'pending':     return 'bg-amber-100 text-amber-700';
    case 'failed':      return 'bg-red-100 text-red-700';
    default:            return 'bg-stone-100 text-stone-600';
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

const paymentBadgeColor = (ps) => {
  if (ps === 'fully_paid')           return 'bg-teal-100 text-teal-700';
  if (ps === 'awaiting_downpayment') return 'bg-amber-100 text-amber-700';
  if (ps === 'downpayment_paid')     return 'bg-blue-100 text-blue-700';
  if (ps === 'awaiting_remaining')   return 'bg-orange-100 text-orange-700';
  return 'bg-stone-100 text-stone-500';
};

// ── Mobile Order Card (replaces table row on small screens) ───────────────────
const OrderCard = ({ o, updatingId, setUpdatingId, updateOrderStatus, updatePaymentStatus }) => {
  const ps = o.payment_status || 'awaiting_downpayment';
  const { downpayment, remaining } = getPaymentAmounts(o.total);
  const isUpdating = updatingId === o.id;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded-lg">
            {o.order_number || formatOrderId(o.id)}
          </span>
          <div className="text-xs text-stone-400 mt-1">
            {o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-teal-600">₱{Number(o.total || 0).toFixed(2)}</div>
          <div className="text-xs text-stone-400">DP: ₱{downpayment.toFixed(2)}</div>
        </div>
      </div>

      {/* Customer */}
      <div className="text-sm font-medium text-stone-800">{o.customer_name || '–'}</div>
      <div className="text-xs text-stone-400 mb-3">{o.customer_email}</div>

      {/* Status + payment badge */}
      <div className="flex flex-wrap gap-2 mb-3">
        {o.status === 'delivered' ? (
          <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} /> Delivered
          </span>
        ) : (
          <select
            value={o.status}
            disabled={isUpdating}
            onChange={async e => {
              setUpdatingId(o.id);
              try { await updateOrderStatus(o.id, e.target.value); }
              catch (err) { alert(err.message); }
              finally { setUpdatingId(null); }
            }}
            className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white capitalize"
          >
            {ORDER_STATUSES.map(s => (
              <option key={s} value={s} disabled={s === 'in transit' && o.payment_status !== 'fully_paid'}>
                {s}{s === 'in transit' && o.payment_status !== 'fully_paid' ? ' 🔒' : ''}
              </option>
            ))}
          </select>
        )}
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${paymentBadgeColor(ps)}`}>
          <CreditCard size={10} />
          {PAYMENT_LABELS[ps] || ps}
        </span>
      </div>

      {/* Payment action */}
      <div className="border-t border-stone-50 pt-3">
        {ps === 'fully_paid' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-full border border-teal-200">
            <CheckCircle2 size={11} /> Fully Paid
          </span>
        ) : ps === 'awaiting_downpayment' ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-700 font-semibold flex items-center gap-1"><Clock size={11}/> Awaiting downpayment</div>
              <div className="text-xs text-stone-500">Due: <strong>₱{downpayment.toFixed(2)}</strong></div>
            </div>
            <button disabled={isUpdating} onClick={async () => { setUpdatingId(o.id); try { await updatePaymentStatus(o.id, 'downpayment_paid'); } catch(e){alert(e.message);} finally{setUpdatingId(null);} }}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
              {isUpdating ? '…' : '✓ Mark Paid'}
            </button>
          </div>
        ) : ps === 'downpayment_paid' ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-700 font-semibold flex items-center gap-1"><Banknote size={11}/> Downpayment received</div>
              <div className="text-xs text-stone-500">Remaining: <strong>₱{remaining.toFixed(2)}</strong></div>
            </div>
            <button disabled={isUpdating} onClick={async () => { setUpdatingId(o.id); try { await updatePaymentStatus(o.id, 'awaiting_remaining'); } catch(e){alert(e.message);} finally{setUpdatingId(null);} }}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
              {isUpdating ? '…' : 'Request Balance'}
            </button>
          </div>
        ) : ps === 'awaiting_remaining' ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-orange-700 font-semibold flex items-center gap-1"><AlertCircle size={11}/> Awaiting remaining</div>
              <div className="text-xs text-stone-500">Due: <strong>₱{remaining.toFixed(2)}</strong></div>
            </div>
            <button disabled={isUpdating} onClick={async () => { setUpdatingId(o.id); try { await updatePaymentStatus(o.id, 'fully_paid'); } catch(e){alert(e.message);} finally{setUpdatingId(null);} }}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">
              {isUpdating ? '…' : '✓ Mark Fully Paid'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export const AdminDashboard = ({ onClose, onOpenPanel }) => {
  const { products } = useProducts();
  const { orders, inventory, loading, fetchOrders, updateOrderStatus, updatePaymentStatus, updateInventoryQty, restockInventory } = useOrders();
  const { logout } = useAuth();

  const [activeTab,       setActiveTab]       = useState('dashboard');
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [detailsOrder,    setDetailsOrder]    = useState(null);
  const [updatingId,      setUpdatingId]      = useState(null);
  const [searchDelivery,  setSearchDelivery]  = useState('');
  const [searchInventory, setSearchInventory] = useState('');
  const [searchOrders,    setSearchOrders]    = useState('');
  const [orderFilter,     setOrderFilter]     = useState('all');
  const [deliveryFilter,  setDeliveryFilter]  = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState('all');

  const deliveries = orders.filter(o => o.status && o.status !== 'order placed');

  const filteredDeliveries = deliveries.filter(o => {
    const matchSearch =
      (o.customer_name || '').toLowerCase().includes(searchDelivery.toLowerCase()) ||
      String(o.id).includes(searchDelivery);
    const matchFilter = deliveryFilter === 'all' || o.status === deliveryFilter;
    return matchSearch && matchFilter;
  });

  useEffect(() => { fetchOrders(); }, []);

  const statusCounts = ORDER_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  const activeOrders    = orders.filter(o => { const s = o.status?.toLowerCase(); return s !== 'completed' && s !== 'cancelled' && s !== 'delivered'; }).length;
  const activeDeliveries = orders.filter(o => o.status === 'in transit' || o.status === 'out for delivery').length;
  const lowStockCount   = inventory.filter(i => i.qty <= (i.low_threshold ?? 10)).length;

  const filteredInventory = inventory.filter(i => {
    const matchSearch = i.product_name.toLowerCase().includes(searchInventory.toLowerCase());
    const isLow = i.qty <= (i.low_threshold ?? 10);
    const matchFilter = inventoryFilter === 'all' || (inventoryFilter === 'low' && isLow) || (inventoryFilter === 'instock' && !isLow);
    return matchSearch && matchFilter;
  });

  const handleInventoryQtyChange = async (inventoryId, currentQty, delta) => {
    const newQty = Math.max(0, currentQty + delta);
    try { await updateInventoryQty(inventoryId, newQty); }
    catch { alert('Failed to update quantity.'); }
  };

  const handleRestock = async (inventoryId) => {
    try { await restockInventory(inventoryId, 50); }
    catch { alert('Failed to restock.'); }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
    { id: 'products',  label: 'Products',   icon: Package },
    { id: 'orders',    label: 'Orders',     icon: ShoppingCart },
    { id: 'delivery',  label: 'Delivery',   icon: Truck },
    { id: 'inventory', label: 'Inventory',  icon: Archive },
  ];

  const switchTab = (id) => { setActiveTab(id); setSidebarOpen(false); };

  return (
    <div className="fixed inset-0 z-50 flex bg-stone-100 font-sans text-stone-800 overflow-hidden">

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-stone-200 flex flex-col shrink-0 shadow-sm
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <h1 className="text-base font-bold text-stone-900">Admin Dashboard</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-stone-100 rounded-lg">
            <X size={18} className="text-stone-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon size={18} className={activeTab === id ? 'text-teal-600' : 'text-stone-400'} />
              {label}
              {id === 'orders' && activeOrders > 0 && (
                <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{activeOrders}</span>
              )}
              {id === 'inventory' && lowStockCount > 0 && (
                <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{lowStockCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="px-3 py-4 border-t border-stone-200 space-y-0.5">
          <button onClick={onOpenPanel}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-all">
            <Package size={18} className="text-stone-400" /> Manage Products
          </button>
          <button onClick={() => { logout(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 sm:px-6 h-14 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-stone-100 rounded-lg text-stone-500">
              <Menu size={20} />
            </button>
            <span className="text-stone-900 font-semibold capitalize text-sm sm:text-base">{activeTab}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto">

            {/* ═══ DASHBOARD TAB ═══ */}
            {activeTab === 'dashboard' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Dashboard Overview</h2>
                  <p className="text-stone-500 text-sm mt-1">Welcome back! Here's what's happening today.</p>
                </div>

                {/* Stat Cards — 2-col on mobile, 4-col on lg */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Total Products',    value: products.length,   sub: `${products.length} active`,  icon: Package,       iconColor: 'text-blue-500',  iconBg: 'bg-blue-50'  },
                    { label: 'Total Orders',      value: orders.length,     sub: `${activeOrders} active`,     icon: ShoppingCart,  iconColor: 'text-teal-600',  iconBg: 'bg-teal-50'  },
                    { label: 'Active Deliveries', value: activeDeliveries,  sub: 'In transit',                 icon: Truck,         iconColor: 'text-stone-600', iconBg: 'bg-stone-100' },
                    { label: 'Low Stock Alerts',  value: lowStockCount,     sub: 'Need restocking',            icon: AlertTriangle, iconColor: 'text-red-500',   iconBg: 'bg-red-50'   },
                  ].map(({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-2`}>
                        <Icon size={18} className={iconColor} />
                      </div>
                      <p className="text-xs text-stone-500 mb-0.5">{label}</p>
                      <p className="text-2xl sm:text-3xl font-bold text-stone-900">{value}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Charts — stack on mobile, side-by-side on lg */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-100 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-900 mb-4">Weekly Sales (₱)</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={weeklySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} width={45} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4', fontSize: 12 }} />
                        <Line type="monotone" dataKey="sales" stroke="#0d9488" strokeWidth={2.5} dot={{ fill: '#0d9488', r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-100 shadow-sm">
                    <h3 className="text-sm font-bold text-stone-900 mb-4">Products by Category</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                        <XAxis dataKey="cat" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4', fontSize: 12 }} />
                        <Bar dataKey="count" fill="#0d9488" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-100 shadow-sm">
                  <h3 className="text-sm font-bold text-stone-900 mb-4">Order Status Breakdown</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {ORDER_STATUSES.map(s => (
                      <div key={s} className="bg-stone-50 rounded-xl p-3 text-center border border-stone-100">
                        <div className="text-xl sm:text-2xl font-bold text-stone-900">{statusCounts[s] || 0}</div>
                        <div className="text-xs text-stone-500 mt-1 capitalize leading-tight">{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PRODUCTS TAB ═══ */}
            {activeTab === 'products' && (
              <div>
                <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Products</h2>
                    <p className="text-stone-500 text-sm mt-1">{products.length} products in your catalog</p>
                  </div>
                  <button onClick={onOpenPanel}
                    className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm">
                    <Plus size={15} /> Add Product
                  </button>
                </div>

                {/* Mobile: cards. Desktop: table */}
                <div className="sm:hidden space-y-3">
                  {products.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-stone-800 text-sm">{p.name}</div>
                          <div className="text-xs text-stone-400 mt-0.5 line-clamp-2">{p.description}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-teal-600">₱{p.basePrice}</div>
                          <div className="text-xs text-stone-400">Min: {p.minOrder}pc+</div>
                        </div>
                      </div>
                      {(Array.isArray(p.colors) ? p.colors : p.colors?.split(',') || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(Array.isArray(p.colors) ? p.colors : p.colors?.split(',') || []).slice(0, 4).map(c => (
                            <span key={c} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{c.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {products.length === 0 && <div className="text-center text-stone-400 py-12">No products yet.</div>}
                </div>

                <div className="hidden sm:block bg-white rounded-2xl border border-stone-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        <th className="text-left p-4 font-semibold text-stone-600">Product</th>
                        <th className="text-left p-4 font-semibold text-stone-600">Price</th>
                        <th className="text-left p-4 font-semibold text-stone-600 hidden md:table-cell">Colors</th>
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
                          <td className="p-4 text-stone-500 hidden md:table-cell">
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
                <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Orders</h2>
                    <p className="text-stone-500 text-sm mt-1">{orders.length} total orders</p>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text" placeholder="Search name or order ID..."
                      value={searchOrders} onChange={e => setSearchOrders(e.target.value)}
                      className="pl-8 pr-4 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none w-full sm:w-56"
                    />
                  </div>
                </div>

                {/* Filter pills — scrollable on mobile */}
                <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
                  {['all', ...ORDER_STATUSES].map(s => {
                    const count = s === 'all' ? orders.length : orders.filter(o => o.status === s).length;
                    return (
                      <button key={s} onClick={() => setOrderFilter(s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize border shrink-0 ${
                          orderFilter === s
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white text-stone-600 border-stone-200 hover:border-teal-400 hover:text-teal-700'
                        }`}>
                        {s === 'all' ? 'All' : s}
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${orderFilter === s ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {loading ? (
                  <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">Loading orders…</div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">No orders yet.</div>
                ) : (() => {
                  const filtered = orders.filter(o => {
                    const matchFilter = orderFilter === 'all' || o.status === orderFilter;
                    const matchSearch = !searchOrders ||
                      (o.customer_name || '').toLowerCase().includes(searchOrders.toLowerCase()) ||
                      (o.customer_email || '').toLowerCase().includes(searchOrders.toLowerCase()) ||
                      (o.order_number || '').toLowerCase().includes(searchOrders.toLowerCase()) ||
                      String(o.id).includes(searchOrders);
                    return matchFilter && matchSearch;
                  });

                  const activeOrdList    = filtered.filter(o => o.status !== 'delivered');
                  const completedOrdList = filtered.filter(o => o.status === 'delivered');

                  const PaymentAction = ({ o }) => {
                    const ps = o.payment_status || 'awaiting_downpayment';
                    const { downpayment, remaining } = getPaymentAmounts(o.total);
                    const isUpdating = updatingId === o.id;
                    if (ps === 'fully_paid') return <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-full border border-teal-200"><CheckCircle2 size={11}/> Fully Paid</span>;
                    if (ps === 'awaiting_downpayment') return (
                      <div className="space-y-1">
                        <div className="text-xs text-amber-700 font-semibold flex items-center gap-1"><Clock size={11}/> Waiting downpayment</div>
                        <div className="text-xs text-stone-500">Due: <span className="font-bold text-stone-700">₱{downpayment.toFixed(2)}</span></div>
                        <button disabled={isUpdating} onClick={async()=>{setUpdatingId(o.id);try{await updatePaymentStatus(o.id,'downpayment_paid');}catch(e){alert(e.message);}finally{setUpdatingId(null);}}} className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-2.5 py-1 rounded-lg disabled:opacity-50">{isUpdating?'…':'✓ Mark Paid'}</button>
                      </div>
                    );
                    if (ps === 'downpayment_paid') return (
                      <div className="space-y-1">
                        <div className="text-xs text-blue-700 font-semibold flex items-center gap-1"><Banknote size={11}/> DP received</div>
                        <div className="text-xs text-stone-500">Remaining: <span className="font-bold text-stone-700">₱{remaining.toFixed(2)}</span></div>
                        <button disabled={isUpdating} onClick={async()=>{setUpdatingId(o.id);try{await updatePaymentStatus(o.id,'awaiting_remaining');}catch(e){alert(e.message);}finally{setUpdatingId(null);}}} className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold px-2.5 py-1 rounded-lg disabled:opacity-50">{isUpdating?'…':'Request Balance'}</button>
                      </div>
                    );
                    if (ps === 'awaiting_remaining') return (
                      <div className="space-y-1">
                        <div className="text-xs text-orange-700 font-semibold flex items-center gap-1"><AlertCircle size={11}/> Waiting remaining</div>
                        <div className="text-xs text-stone-500">Due: <span className="font-bold text-stone-700">₱{remaining.toFixed(2)}</span></div>
                        <button disabled={isUpdating} onClick={async()=>{setUpdatingId(o.id);try{await updatePaymentStatus(o.id,'fully_paid');}catch(e){alert(e.message);}finally{setUpdatingId(null);}}} className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold px-2.5 py-1 rounded-lg disabled:opacity-50">{isUpdating?'…':'✓ Mark Fully Paid'}</button>
                      </div>
                    );
                    return null;
                  };

                  const OrderRow = ({ o, i, total }) => (
                    <tr className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i === total - 1 ? 'border-0' : ''}`}>
                      <td className="p-3 sm:p-4">
                        <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded-lg">{o.order_number || formatOrderId(o.id)}</span>
                        <div className="text-xs text-stone-400 mt-1">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="font-medium text-stone-800 text-sm">{o.customer_name || '–'}</div>
                        <div className="text-xs text-stone-400 hidden sm:block">{o.customer_email}</div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="font-bold text-teal-600 text-sm">₱{Number(o.total || 0).toFixed(2)}</div>
                        <div className="text-xs text-stone-400">DP: ₱{getPaymentAmounts(o.total).downpayment.toFixed(2)}</div>
                      </td>
                      <td className="p-3 sm:p-4 hidden md:table-cell">
                        {o.status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 text-xs font-semibold px-2 py-1 rounded-full"><CheckCircle2 size={11}/> Delivered</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <select value={o.status} disabled={updatingId===o.id} onChange={async e=>{setUpdatingId(o.id);try{await updateOrderStatus(o.id,e.target.value);}catch(e){alert(e.message);}finally{setUpdatingId(null);}}}
                              className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white capitalize">
                              {ORDER_STATUSES.map(s=><option key={s} value={s} disabled={s==='in transit'&&o.payment_status!=='fully_paid'}>{s}{s==='in transit'&&o.payment_status!=='fully_paid'?' 🔒':''}</option>)}
                            </select>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${paymentBadgeColor(o.payment_status)}`}><CreditCard size={10}/>{PAYMENT_LABELS[o.payment_status]||o.payment_status}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 hidden lg:table-cell"><PaymentAction o={o} /></td>
                      <td className="p-3 sm:p-4">
                        <button onClick={() => setDetailsOrder(o)} className="text-teal-600 text-xs font-semibold hover:text-teal-800 flex items-center gap-1">
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );

                  const TableHeaders = ({ teal = false }) => (
                    <tr className={teal ? 'bg-teal-50 border-b border-teal-100' : 'bg-stone-50 border-b border-stone-100'}>
                      {['Order #', 'Customer', 'Total', 'Status', 'Payment', ''].map((h, i) => (
                        <th key={i} className={`text-left p-3 sm:p-4 font-semibold text-xs sm:text-sm ${teal ? 'text-teal-700' : 'text-stone-600'} ${i === 3 ? 'hidden md:table-cell' : ''} ${i === 4 ? 'hidden lg:table-cell' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  );

                  return (
                    <div className="space-y-5">
                      {/* Mobile order cards */}
                      <div className="md:hidden space-y-3">
                        {filtered.length === 0 ? (
                          <div className="bg-white rounded-2xl p-10 text-center text-stone-400 border border-stone-100">No orders match.</div>
                        ) : filtered.map(o => (
                          <OrderCard key={o.id} o={o} updatingId={updatingId} setUpdatingId={setUpdatingId} updateOrderStatus={updateOrderStatus} updatePaymentStatus={updatePaymentStatus} />
                        ))}
                      </div>

                      {/* Desktop table */}
                      <div className="hidden md:block space-y-5">
                        {(orderFilter === 'all' || orderFilter !== 'delivered') && activeOrdList.length > 0 && (
                          <div>
                            {orderFilter === 'all' && (
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-bold text-stone-700">Active Orders</span>
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{activeOrdList.length}</span>
                              </div>
                            )}
                            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead><TableHeaders /></thead>
                                <tbody>{activeOrdList.map((o, i) => <OrderRow key={o.id} o={o} i={i} total={activeOrdList.length} />)}</tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {(orderFilter === 'all' || orderFilter === 'delivered') && completedOrdList.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-bold text-stone-700">Completed Orders</span>
                              <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">{completedOrdList.length}</span>
                            </div>
                            <div className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead><TableHeaders teal /></thead>
                                <tbody>{completedOrdList.map((o, i) => <OrderRow key={o.id} o={o} i={i} total={completedOrdList.length} />)}</tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {filtered.length === 0 && (
                          <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">No orders match your filter.</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══ DELIVERY TAB ═══ */}
            {activeTab === 'delivery' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Delivery Management</h2>
                  <p className="text-stone-500 text-sm mt-1">Orders that are packed and in progress</p>
                </div>

                <div className="flex gap-2 mb-5 flex-wrap">
                  <div className="flex-1 min-w-0 relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="text" placeholder="Search by name or order ID..." value={searchDelivery} onChange={e => setSearchDelivery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <select value={deliveryFilter} onChange={e => setDeliveryFilter(e.target.value)}
                    className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none shrink-0">
                    <option value="all">All</option>
                    {DELIVERY_STATUSES.filter(s => s !== 'order placed').map(s => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                </div>

                {loading ? (
                  <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">Loading…</div>
                ) : filteredDeliveries.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-stone-100">
                    <Truck size={32} className="text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-400 font-medium text-sm">No active deliveries found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDeliveries.map(o => (
                      <div key={o.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-bold text-stone-900 font-mono text-sm">{o.order_number || formatOrderId(o.id)}</span>
                            <span className="text-xs text-stone-400 ml-2">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH') : ''}</span>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor(o.status)}`}>{o.status}</span>
                        </div>
                        <div className="space-y-2 mb-4 border-t border-stone-50 pt-3">
                          {[
                            { icon: User,   label: 'Customer', value: o.customer_name },
                            { icon: Phone,  label: 'Phone',    value: o.customer_phone },
                            { icon: MapPin, label: 'Address',  value: o.customer_address },
                            { icon: Mail,   label: 'Email',    value: o.customer_email },
                          ].map(({ icon: Icon, label, value }) => value ? (
                            <div key={label} className="flex items-start gap-2.5">
                              <Icon size={14} className="text-stone-400 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-xs text-stone-400">{label}</div>
                                <div className="text-sm font-medium text-stone-800 leading-tight">{value}</div>
                              </div>
                            </div>
                          ) : null)}
                        </div>
                        <div className="border-t border-stone-100 pt-3">
                          <p className="text-xs text-stone-500 mb-2 font-medium">Update Status</p>
                          <select value={o.status} disabled={updatingId === o.id}
                            onChange={async e => { setUpdatingId(o.id); try { await updateOrderStatus(o.id, e.target.value); } catch (err) { alert(err.message); } finally { setUpdatingId(null); } }}
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none capitalize">
                            {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
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
                <div className="mb-5">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Inventory</h2>
                  <p className="text-stone-500 text-sm mt-1">Track and manage stock levels</p>
                </div>

                {/* Stat cards — 3-col on sm+, 1-col on xs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Total Items',       value: inventory.reduce((s, i) => s + i.qty, 0), icon: Package,       iconColor: 'text-blue-500',  iconBg: 'bg-blue-50'  },
                    { label: 'Products Tracked',  value: inventory.length,                          icon: Archive,       iconColor: 'text-teal-600',  iconBg: 'bg-teal-50'  },
                    { label: 'Low Stock Alerts',  value: lowStockCount,                             icon: AlertTriangle, iconColor: 'text-red-500',   iconBg: 'bg-red-50'   },
                  ].map(({ label, value, icon: Icon, iconColor, iconBg }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-center gap-3">
                      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                        <Icon size={18} className={iconColor} />
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">{label}</p>
                        <p className="text-2xl font-bold text-stone-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  <div className="flex-1 min-w-0 relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="text" placeholder="Search inventory..." value={searchInventory} onChange={e => setSearchInventory(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                  </div>
                  <select value={inventoryFilter} onChange={e => setInventoryFilter(e.target.value)}
                    className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none shrink-0">
                    <option value="all">All</option>
                    <option value="low">Low Stock</option>
                    <option value="instock">In Stock</option>
                  </select>
                </div>

                {/* Mobile: cards. Desktop: table */}
                <div className="sm:hidden space-y-3">
                  {filteredInventory.length === 0 ? (
                    <div className="text-center text-stone-400 py-10 text-sm">
                      {inventory.length === 0 ? 'No inventory yet.' : 'No items match.'}
                    </div>
                  ) : filteredInventory.map(item => {
                    const isLow = item.qty <= (item.low_threshold ?? 10);
                    return (
                      <div key={item.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-stone-800 text-sm">{item.product_name}</div>
                            <div className="text-xs text-stone-400">{item.location || 'Main Storage'}</div>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isLow ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'}`}>
                            {isLow ? '⚠️ Low' : 'In Stock'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-2xl font-bold ${isLow ? 'text-red-600' : 'text-stone-900'}`}>{item.qty} <span className="text-sm font-normal text-stone-400">units</span></span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleInventoryQtyChange(item.id, item.qty, -1)}
                              className="w-8 h-8 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100">
                              <Minus size={13} className="text-stone-600" />
                            </button>
                            <button onClick={() => handleInventoryQtyChange(item.id, item.qty, 1)}
                              className="w-8 h-8 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100">
                              <Plus size={13} className="text-stone-600" />
                            </button>
                            <button onClick={() => handleRestock(item.id)}
                              className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-700">
                              <RefreshCw size={11} /> +50
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden sm:block bg-white rounded-2xl border border-stone-100 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        {['Product', 'Location', 'Qty', 'Last Restocked', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left p-4 font-semibold text-stone-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.length === 0 ? (
                        <tr><td colSpan={6} className="p-12 text-center text-stone-400 text-sm">
                          {inventory.length === 0 ? 'No inventory yet. Run the SQL setup to seed inventory.' : 'No items match your search.'}
                        </td></tr>
                      ) : filteredInventory.map((item, i) => {
                        const isLow = item.qty <= (item.low_threshold ?? 10);
                        return (
                          <tr key={item.id} className={`border-b border-stone-50 hover:bg-stone-50 transition-colors ${i === filteredInventory.length - 1 ? 'border-0' : ''}`}>
                            <td className="p-4">
                              <div className="font-semibold text-stone-800">{item.product_name}</div>
                              <div className="text-xs text-stone-400">ID: {item.product_id}</div>
                            </td>
                            <td className="p-4 text-stone-600 text-sm">{item.location || 'Main Storage'}</td>
                            <td className="p-4">
                              <span className={`text-xl font-bold ${isLow ? 'text-red-600' : 'text-stone-900'}`}>{item.qty}</span>
                            </td>
                            <td className="p-4 text-stone-500 text-xs">{item.last_restocked || '—'}</td>
                            <td className="p-4">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isLow ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'}`}>
                                {isLow ? 'Low Stock' : 'In Stock'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleInventoryQtyChange(item.id, item.qty, -1)} className="w-7 h-7 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100"><Minus size={12} className="text-stone-600" /></button>
                                <button onClick={() => handleInventoryQtyChange(item.id, item.qty, 1)} className="w-7 h-7 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100"><Plus size={12} className="text-stone-600" /></button>
                                <button onClick={() => handleRestock(item.id)} className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-700"><RefreshCw size={11} /> +50</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── ORDER DETAILS MODAL ── */}
      {detailsOrder && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-stone-900">
                Order {detailsOrder.order_number || formatOrderId(detailsOrder.id)}
              </h4>
              <button onClick={() => setDetailsOrder(null)} className="p-2 hover:bg-stone-100 rounded-full">
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              {[
                { label: 'Status',   value: <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${orderStatusColor(detailsOrder.status)}`}>{detailsOrder.status}</span> },
                { label: 'Customer', value: detailsOrder.customer_name || '–' },
                { label: 'Email',    value: detailsOrder.customer_email || '–' },
                { label: 'Phone',    value: detailsOrder.customer_phone || '–' },
                { label: 'Address',  value: detailsOrder.customer_address || '–' },
                { label: 'Total',    value: <span className="font-bold text-teal-600">₱{Number(detailsOrder.total || 0).toFixed(2)}</span> },
                { label: 'Payment',  value: <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${paymentBadgeColor(detailsOrder.payment_status)}`}>{PAYMENT_LABELS[detailsOrder.payment_status] || '–'}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-stone-50">
                  <span className="text-stone-500 text-xs">{label}</span>
                  <span className="font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>

            <p className="text-sm font-semibold text-stone-700 mb-2">Items</p>
            <ul className="space-y-1.5 mb-5">
              {detailsOrder.items?.map((it, idx) => (
                <li key={idx} className="flex justify-between text-sm bg-stone-50 rounded-lg px-3 py-2">
                  <span className="text-stone-700">{it.product.name} — {it.variant?.name || '–'}</span>
                  <span className="font-bold text-stone-900">×{it.quantity}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setDetailsOrder(null)} className="w-full py-2.5 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-colors text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};