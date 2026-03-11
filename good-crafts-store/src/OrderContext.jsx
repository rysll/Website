import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all orders
  const fetchOrders = async () => {
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
  };

  // Fetch single order
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

  // Create new order
  const createOrder = async (orderData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('orders')
        .insert([{
          ...orderData,
          status: 'processing',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      
      setOrders([data, ...orders]);
      
      // Send notification email
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
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) throw updateError;

      setOrders(orders.map(order => order.id === orderId ? data : order));
      
      // Send status update email
      const order = await getOrder(orderId);
      await sendOrderNotification(order, 'status_update', newStatus);
      
      return data;
    } catch (err) {
      console.error('Error updating order status:', err);
      throw err;
    }
  };

  // Send email notification
  const sendOrderNotification = async (order, type, newStatus = null) => {
    try {
      // Call Supabase Edge Function to send email
      const { data, error } = await supabase.functions.invoke('send-order-email', {
        body: {
          type,
          order,
          newStatus,
          customerEmail: order.customer_email,
          customerName: order.customer_name
        }
      });

      if (error) {
        console.error('Error sending email:', error);
        // Don't throw - email failure shouldn't block order operations
      }
      return data;
    } catch (err) {
      console.error('Error in sendOrderNotification:', err);
      // Silently fail - log but don't throw
    }
  };

  // Subscribe to real-time order updates
  useEffect(() => {
    fetchOrders();

    const subscription = supabase
      .channel('orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};
