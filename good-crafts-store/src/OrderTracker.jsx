import React, { useState } from 'react';
import { useOrders, ORDER_STATUSES, STATUS_STEP, formatOrderId } from './OrderContext.jsx';
import { supabase } from './supabaseClient';
import {
  Search, Package, PackageCheck, Truck, MapPin,
  CheckCircle2, Clock, X, ChevronRight, Phone, Mail, User
} from 'lucide-react';

const STEP_ICONS = [Package, PackageCheck, Truck, MapPin, CheckCircle2];

const STEP_DESCRIPTIONS = [
  'Your order has been received and is being reviewed.',
  'Your items are being carefully packed for shipment.',
  'Your package is on its way to the delivery hub.',
  'Your package is with the courier and heading to you.',
  'Your order has been delivered. Enjoy!'
];

export const OrderTracker = ({ onClose }) => {
  const { getOrder } = useOrders();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = orderId.trim().toUpperCase();
    if (!trimmed) return;

    setSearching(true);
    setNotFound(false);
    setError('');
    setOrder(null);

    try {
      // Try order_number first (e.g. "GC-0001"), then fall back to numeric id
      let found = null;

      // Search by order_number
      const { data: byNumber } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', trimmed)
        .maybeSingle();

      if (byNumber) {
        found = byNumber;
      } else {
        // Fall back to numeric ID
        const numericId = parseInt(trimmed.replace(/[^0-9]/g, ''));
        if (!isNaN(numericId)) {
          const { data: byId } = await supabase
            .from('orders')
            .select('*')
            .eq('id', numericId)
            .maybeSingle();
          found = byId;
        }
      }

      if (found) setOrder(found);
      else setNotFound(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const currentStep = order ? (STATUS_STEP[order.status] ?? 0) : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Track Your Order</h2>
            <p className="text-xs text-stone-500 mt-0.5">Enter your order ID to see live status updates</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={orderId}
                onChange={e => { setOrderId(e.target.value); setNotFound(false); setOrder(null); }}
                placeholder="Enter your Order ID (e.g. GC-0001)"
                className="w-full pl-9 pr-4 py-3 border border-stone-200 rounded-xl text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !orderId.trim()}
              className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {searching ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Searching
                </span>
              ) : (
                <>Track <ChevronRight size={15} /></>
              )}
            </button>
          </form>

          {/* Not Found */}
          {notFound && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center mb-4">
              <p className="text-red-700 font-semibold text-sm">Order not found</p>
              <p className="text-red-500 text-xs mt-1">Double-check your Order ID from your confirmation message.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Order Result */}
          {order && (
            <div className="space-y-5">

              {/* Order Summary Banner */}
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-0.5">Order ID</p>
                  <p className="text-stone-900 font-bold font-mono">
                    {order.order_number || formatOrderId(order.id)}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">Placed on {formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-500 mb-1">Current Status</p>
                  <span className="inline-block bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="bg-white border border-stone-100 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-stone-700 mb-5">Delivery Progress</h3>
                <div className="space-y-0">
                  {ORDER_STATUSES.map((status, idx) => {
                    const StepIcon = STEP_ICONS[idx];
                    const isDone = idx < currentStep;
                    const isActive = idx === currentStep;
                    const isPending = idx > currentStep;
                    const isLast = idx === ORDER_STATUSES.length - 1;

                    return (
                      <div key={status} className="flex gap-4">
                        {/* Icon column */}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isDone ? 'bg-teal-600 text-white' :
                            isActive ? 'bg-teal-600 text-white ring-4 ring-teal-100' :
                            'bg-stone-100 text-stone-400'
                          }`}>
                            {isDone ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <StepIcon size={18} />
                            )}
                          </div>
                          {!isLast && (
                            <div className={`w-0.5 h-8 mt-1 ${isDone ? 'bg-teal-400' : 'bg-stone-200'}`} />
                          )}
                        </div>

                        {/* Content column */}
                        <div className={`pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
                          <p className={`text-sm font-semibold capitalize mb-0.5 ${
                            isActive ? 'text-teal-700' :
                            isDone ? 'text-stone-700' : 'text-stone-400'
                          }`}>
                            {status}
                            {isActive && (
                              <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                                Current
                              </span>
                            )}
                          </p>
                          <p className={`text-xs ${isActive || isDone ? 'text-stone-500' : 'text-stone-300'}`}>
                            {STEP_DESCRIPTIONS[idx]}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-white border border-stone-100 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-stone-700 mb-4">Delivery Information</h3>
                <div className="space-y-3">
                  {[
                    { icon: User, label: 'Name', value: order.customer_name },
                    { icon: MapPin, label: 'Address', value: order.customer_address },
                    { icon: Phone, label: 'Phone', value: order.customer_phone },
                    { icon: Mail, label: 'Email', value: order.customer_email },
                  ].map(({ icon: Icon, label, value }) => value ? (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-stone-500" />
                      </div>
                      <div>
                        <p className="text-xs text-stone-400">{label}</p>
                        <p className="text-sm font-medium text-stone-800">{value}</p>
                      </div>
                    </div>
                  ) : null)}
                </div>
              </div>

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="bg-white border border-stone-100 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-stone-700 mb-4">Items Ordered</h3>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-stone-800">{item.product?.name}</p>
                          <p className="text-xs text-stone-400">
                            {item.variant?.name}
                            {item.color ? ` · ${item.color}` : ''}
                            {item.customText ? ` · "${item.customText}"` : ''}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-teal-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                          <p className="text-xs text-stone-400">×{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {order.total != null && (
                      <div className="flex justify-between pt-2">
                        <span className="text-sm font-bold text-stone-700">Total</span>
                        <span className="text-sm font-extrabold text-teal-700">₱{Number(order.total).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Help note */}
              <p className="text-center text-xs text-stone-400">
                Questions about your order? Message us on{' '}
                <a
                  href="https://www.facebook.com/profile.php?id=61561955998791"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 font-semibold hover:underline"
                >
                  Facebook
                </a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};