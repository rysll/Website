import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

const OrderContext = createContext();

export const ORDER_STATUSES = [
  'order placed',
  'order packed',
  'in transit',
  'out for delivery',
  'delivered'
];

export const PAYMENT_STATUSES = [
  'awaiting_downpayment',
  'downpayment_paid',
  'awaiting_remaining',
  'fully_paid'
];

export const PAYMENT_LABELS = {
  awaiting_downpayment: 'Awaiting Downpayment',
  downpayment_paid:     'Downpayment Paid',
  awaiting_remaining:   'Awaiting Remaining Balance',
  fully_paid:           'Fully Paid'
};

export const DOWNPAYMENT_RATE = 0.5;
export const STATUS_STEP = Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, i]));
export const formatOrderId = (id) => `GC-${String(id).padStart(4, '0')}`;

export const getPaymentAmounts = (total) => {
  const t = Number(total) || 0;
  const downpayment = Math.ceil(t * DOWNPAYMENT_RATE * 100) / 100;
  const remaining   = Math.round((t - downpayment) * 100) / 100;
  return { downpayment, remaining };
};

export const OrderProvider = ({ children }) => {
  const [orders,    setOrders]    = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setOrders(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('inventory').select('*').order('product_name', { ascending: true });
      if (fetchError) throw fetchError;
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  }, []);

  const deductInventory = async (items) => {
    try {
      for (const item of items) {
        const productId = item.product?.id;
        if (!productId) continue;
        const { data: inv, error: fetchErr } = await supabase
          .from('inventory').select('id, qty').eq('product_id', productId).single();
        if (fetchErr || !inv) continue;
        await supabase.from('inventory').update({ qty: Math.max(0, inv.qty - item.quantity) }).eq('id', inv.id);
      }
      await fetchInventory();
    } catch (err) { console.error('Error deducting inventory:', err); }
  };

  const updateInventoryQty = async (inventoryId, newQty) => {
    try {
      const { data, error: updateErr } = await supabase
        .from('inventory').update({ qty: newQty }).eq('id', inventoryId).select().single();
      if (updateErr) throw updateErr;
      setInventory(prev => prev.map(i => i.id === inventoryId ? data : i));
      return data;
    } catch (err) { console.error('Error updating inventory:', err); throw err; }
  };

  const restockInventory = async (inventoryId, addQty = 50) => {
    try {
      const item = inventory.find(i => i.id === inventoryId);
      if (!item) throw new Error('Item not found');
      const { data, error: updateErr } = await supabase
        .from('inventory')
        .update({ qty: item.qty + addQty, last_restocked: new Date().toISOString().split('T')[0] })
        .eq('id', inventoryId).select().single();
      if (updateErr) throw updateErr;
      setInventory(prev => prev.map(i => i.id === inventoryId ? data : i));
      return data;
    } catch (err) { console.error('Error restocking:', err); throw err; }
  };

  const getOrder = async (orderId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('orders').select('*').eq('id', orderId).single();
      if (fetchError) throw fetchError;
      return data;
    } catch (err) { console.error('Error fetching order:', err); return null; }
  };

  const createOrder = async (orderData) => {
    try {
      const { downpayment, remaining } = getPaymentAmounts(orderData.total);
      const { data, error: insertError } = await supabase
        .from('orders')
        .insert([{
          ...orderData,
          status:             ORDER_STATUSES[0],
          payment_status:     PAYMENT_STATUSES[0],
          downpayment_amount: downpayment,
          remaining_amount:   remaining,
          created_at:         new Date().toISOString()
        }])
        .select().single();
      if (insertError) throw insertError;

      const { data: freshOrder } = await supabase.from('orders').select('*').eq('id', data.id).single();
      const orderWithNumber = freshOrder || data;
      setOrders(prev => [orderWithNumber, ...prev]);
      deductInventory(orderData.items || []);
      sendOrderNotification(orderWithNumber, 'order_created').catch(err => console.warn('Email failed:', err));
      return orderWithNumber;
    } catch (err) { console.error('Error creating order:', err); throw err; }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      if (!ORDER_STATUSES.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);
      if (newStatus === 'in transit') {
        const order = orders.find(o => o.id === orderId);
        if (order && order.payment_status !== 'fully_paid') {
          throw new Error('Cannot move to In Transit — customer has not paid the remaining balance yet.');
        }
      }
      const { data, error: updateError } = await supabase
        .from('orders').update({ status: newStatus }).eq('id', orderId).select().single();
      if (updateError) throw new Error(updateError.message || 'Supabase update failed');
      setOrders(prev => prev.map(o => o.id === orderId ? data : o));
      sendOrderNotification(data, 'status_update', newStatus).catch(err => console.warn('Email failed:', err));
      return data;
    } catch (err) { console.error('Error updating order status:', err.message); throw err; }
  };

  const updatePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      if (!PAYMENT_STATUSES.includes(newPaymentStatus)) throw new Error(`Invalid payment status: ${newPaymentStatus}`);
      const extraUpdates = {};
      // When downpayment is confirmed → advance to order packed
      if (newPaymentStatus === 'downpayment_paid') {
        extraUpdates.status = 'order packed';
      }
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({ payment_status: newPaymentStatus, ...extraUpdates })
        .eq('id', orderId).select().single();
      if (updateError) throw new Error(updateError.message || 'Payment update failed');
      setOrders(prev => prev.map(o => o.id === orderId ? data : o));
      // Send payment reminder email when asking for remaining balance
      if (newPaymentStatus === 'awaiting_remaining') {
        sendOrderNotification(data, 'payment_reminder', null).catch(err => console.warn('Reminder email failed:', err));
      }
      return data;
    } catch (err) { console.error('Error updating payment status:', err.message); throw err; }
  };

  const sendOrderNotification = async (order, type, newStatus = null) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: { type, order, newStatus, customerEmail: order.customer_email, customerName: order.customer_name }
      });
      if (error) console.error('Error sending email:', error);
      return data;
    } catch (err) { console.error('Error in sendOrderNotification:', err); }
  };

  useEffect(() => {
    fetchOrders();
    fetchInventory();
    const orderSub = supabase.channel('orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    const inventorySub = supabase.channel('inventory-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchInventory())
      .subscribe();
    return () => { orderSub.unsubscribe(); inventorySub.unsubscribe(); };
  }, []);

  return (
    <OrderContext.Provider value={{
      orders, inventory, loading, error,
      fetchOrders, fetchInventory, getOrder,
      createOrder, updateOrderStatus, updatePaymentStatus,
      updateInventoryQty, restockInventory, sendOrderNotification
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within OrderProvider');
  return context;
};