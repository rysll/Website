import React, { createContext, useContext, useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { supabase } from './supabaseClient';

const ProductContext = createContext();

// Function to get icon component by name
const getIcon = (iconName) => {
  try {
    // Get the icon from lucide-react by name
    const IconComponent = LucideIcons[iconName];
    if (IconComponent) {
      return <IconComponent size={48} className="text-amber-100" />;
    }
  } catch (error) {
    console.warn(`Icon "${iconName}" not found`);
  }
  // Fallback to Key icon if not found
  return <LucideIcons.Key size={48} className="text-amber-100" />;
};

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch products from Supabase
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setProducts(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchProducts();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('products-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Add product
  const addProduct = async (newProduct) => {
    try {
      const { data, error: addError } = await supabase
        .from('products')
        .insert([newProduct])
        .select();

      if (addError) throw addError;
      setProducts([...products, data[0]]);
      return data[0];
    } catch (err) {
      console.error('Error adding product:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update product
  const updateProduct = async (id, updatedProduct) => {
    try {
      const { data, error: updateError } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', id)
        .select();

      if (updateError) throw updateError;
      setProducts(products.map(p => p.id === id ? data[0] : p));
      return data[0];
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message);
      throw err;
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.message);
      throw err;
    }
  };

  // Get products with icons
  const getProductsWithIcons = () => {
    return products.map(product => ({
      ...product,
      icon: getIcon(product.iconName),
      variants: [
        { id: 'plain', name: 'Plain (No Name)', priceMod: 0 },
        { id: 'stamp', name: 'Heatstamped Name', priceMod: 15 },
        { id: 'laser', name: 'Laser Engraved', priceMod: 20 },
      ],
    }));
  };

  return (
    <ProductContext.Provider value={{
      products,
      loading,
      error,
      addProduct,
      updateProduct,
      deleteProduct,
      getProductsWithIcons,
      refetchProducts: fetchProducts,
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductProvider');
  }
  return context;
};
