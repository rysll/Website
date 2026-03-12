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

// Maps each status to a step index (0-based) for the tracker
export const STATUS_STEP = Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, i]));

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all orders — stable reference via useCallback
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

  // Fetch single order by ID (used by tracker)
  const getOrder = async (orderId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      console.error('Error fetching order:', err);
      return null;
    }
  };

  // Create new order — now includes customer_phone and customer_address
  const createOrder = async (orderData) => {
    try {
      const initialStatus = ORDER_STATUSES[0];
      const { data, error: insertError } = await supabase
        .from('orders')
        .insert([{
          ...orderData,
          status: initialStatus,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setOrders(prev => [data, ...prev]);
      await sendOrderNotification(data, 'order_created');

      return data;
    } catch (err) {
      console.error('Error creating order:', err);
      throw err;
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      if (!ORDER_STATUSES.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }

      const { data, error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase update error:', JSON.stringify(updateError, null, 2));
        throw new Error(updateError.message || 'Supabase update failed');
      }

      setOrders(prev => prev.map(o => o.id === orderId ? data : o));

      // Notify customer of status change (non-blocking)
      sendOrderNotification(data, 'status_update', newStatus).catch(err =>
        console.warn('Email notification failed (non-critical):', err)
      );

      return data;
    } catch (err) {
      console.error('Error updating order status:', err.message);
      throw err;
    }
  };

  // Send email notification via Supabase Edge Function
  const sendOrderNotification = async (order, type, newStatus = null) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: {
          type,
          order,
          newStatus,
          customerEmail: order.customer_email,
          customerName: order.customer_name
        }
      });
      if (error) console.error('Error sending email:', error);
      return data;
    } catch (err) {
      console.error('Error in sendOrderNotification:', err);
      // Silently fail — email failure shouldn't block order operations
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchOrders();

    const subscription = supabase
      .channel('orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  return (
    <OrderContext.Provider value={{
      orders,
      loading,
      error,
      fetchOrders,
      getOrder,
      createOrder,
      updateOrderStatus,
      sendOrderNotification
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