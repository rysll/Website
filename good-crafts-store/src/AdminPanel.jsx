import React, { useState } from 'react';
import { useProducts } from './ProductContext';
import { useAuth } from './AuthContext';
import { X, Plus, Edit2, Trash2, LogOut, AlertCircle, Upload, FileText } from 'lucide-react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';

export const AdminPanel = ({ onClose }) => {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { logout } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchProducts, setBatchProducts] = useState([
    { name: '', description: '', basePrice: '', colors: '', minOrder: 1, iconName: 'Key', imageColor: 'bg-amber-700' }
  ]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    imageColor: 'bg-amber-700',
    iconName: 'Key',
    colors: '',
    minOrder: 1,
    image_url: ''
  });

  const handleOpenForm = (product = null) => {
    setSubmitError('');
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        imageColor: product.imageColor,
        iconName: product.iconName,
        colors: Array.isArray(product.colors) ? product.colors.join(', ') : product.colors,
        minOrder: product.minOrder,
        image_url: product.image_url || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        basePrice: '',
        imageColor: 'bg-amber-700',
        iconName: 'Key',
        colors: '',
        minOrder: 1,
        image_url: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSubmitError('Please upload a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Image must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    setSubmitError('');

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `product-${timestamp}-${file.name}`;
      
      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicData.publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      setSubmitError('Failed to upload image: ' + error.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setIsLoading(true);

    try {
      const colorArray = formData.colors.split(',').map(c => c.trim()).filter(c => c);
      
      const productData = {
        name: formData.name,
        description: formData.description,
        basePrice: parseFloat(formData.basePrice),
        imageColor: formData.imageColor,
        iconName: formData.iconName,
        colors: colorArray.length > 0 ? colorArray : ['Color 1'],
        minOrder: parseInt(formData.minOrder),
        image_url: formData.image_url
      };

      if (editingId) {
        await updateProduct(editingId, productData);
      } else {
        await addProduct(productData);
      }

      setIsFormOpen(false);
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        basePrice: '',
        imageColor: 'bg-amber-700',
        iconName: 'Key',
        colors: '',
        minOrder: 1,
        image_url: ''
      });
    } catch (error) {
      console.error('Error saving product:', error);
      setSubmitError(error.message || 'Failed to save product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product: ' + error.message);
      }
    }
  };

  const addBatchRow = () => {
    setBatchProducts([...batchProducts, { name: '', description: '', basePrice: '', colors: '', minOrder: 1, iconName: 'Key', imageColor: 'bg-amber-700' }]);
  };

  const removeBatchRow = (index) => {
    setBatchProducts(batchProducts.filter((_, i) => i !== index));
  };

  const updateBatchProduct = (index, field, value) => {
    const updated = [...batchProducts];
    updated[index] = { ...updated[index], [field]: value };
    setBatchProducts(updated);
  };

  const handleBatchSubmit = async () => {
    setSubmitError('');
    setIsLoading(true);

    try {
      let successCount = 0;
      for (const product of batchProducts) {
        if (!product.name.trim() || !product.description.trim() || !product.basePrice) {
          continue; // Skip empty rows
        }

        const productData = {
          name: product.name.trim(),
          description: product.description.trim(),
          basePrice: parseFloat(product.basePrice),
          imageColor: product.imageColor,
          iconName: product.iconName,
          colors: product.colors.split(',').map(c => c.trim()).filter(c => c) || ['Color 1'],
          minOrder: parseInt(product.minOrder) || 1,
          image_url: ''
        };

        await addProduct(productData);
        successCount++;
      }

      if (successCount > 0) {
        setIsBatchMode(false);
        setBatchProducts([{ name: '', description: '', basePrice: '', colors: '', minOrder: 1, iconName: 'Key', imageColor: 'bg-amber-700' }]);
        alert(`Successfully added ${successCount} product(s)!`);
      } else {
        setSubmitError('No valid products to add. Please fill in name, description, and price.');
      }
    } catch (error) {
      console.error('Error adding batch products:', error);
      setSubmitError('Failed to add some products: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitError('');
    setIsLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        setSubmitError('Excel file is empty or has no data in the first sheet.');
        setIsLoading(false);
        return;
      }

      // Map Excel columns (case-insensitive)
      const normalizeKey = (key) => key?.toLowerCase().trim();
      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          // Find matching columns (supports various naming conventions)
          const name = Object.entries(row).find(([k]) => normalizeKey(k) === 'name')?.[1]?.trim();
          const description = Object.entries(row).find(([k]) => normalizeKey(k) === 'description')?.[1]?.trim();
          const basePrice = Object.entries(row).find(([k]) => normalizeKey(k) === 'price' || normalizeKey(k) === 'baseprice')?.[1];
          const colors = Object.entries(row).find(([k]) => normalizeKey(k) === 'colors')?.[1]?.trim();
          const iconName = Object.entries(row).find(([k]) => normalizeKey(k) === 'icon')?.[1]?.trim() || 'Key';
          const minOrder = Object.entries(row).find(([k]) => normalizeKey(k) === 'minorder' || normalizeKey(k) === 'min')?.[1];
          const imageColor = Object.entries(row).find(([k]) => normalizeKey(k) === 'imagecolor' || normalizeKey(k) === 'color')?.[1]?.trim() || 'bg-amber-700';

          if (!name || !description || !basePrice) {
            errorCount++;
            continue;
          }

          const productData = {
            name,
            description,
            basePrice: parseFloat(basePrice),
            imageColor,
            iconName,
            colors: colors ? colors.split(',').map(c => c.trim()).filter(c => c) : ['Color 1'],
            minOrder: parseInt(minOrder) || 1,
            image_url: ''
          };

          await addProduct(productData);
          successCount++;
        } catch (error) {
          console.error('Error processing row:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        alert(`Successfully added ${successCount} product(s) from Excel! ${errorCount > 0 ? `(${errorCount} rows skipped)` : ''}`);
      } else {
        setSubmitError('No valid products found in Excel. Required columns: Name, Description, Price');
      }
    } catch (error) {
      console.error('Error reading Excel file:', error);
      setSubmitError('Failed to read Excel file: ' + error.message);
    } finally {
      setIsLoading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const colorOptions = [
    'bg-amber-700', 'bg-amber-800', 'bg-teal-600', 'bg-teal-900',
    'bg-red-700', 'bg-green-700', 'bg-purple-700', 'bg-blue-600',
    'bg-yellow-600', 'bg-pink-600', 'bg-indigo-700'
  ];

  const iconOptions = ['Key', 'Wallet', 'Coins', 'Heart'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-stone-900 text-white p-6 flex items-center justify-between border-b">
          <h2 className="text-2xl font-bold">Admin Panel - Manage Products</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="p-2 hover:bg-red-700 rounded-full text-stone-300 hover:text-white transition-colors flex items-center gap-2 px-3"
              title="Logout"
            >
              <LogOut size={20} />
              <span className="text-sm">Logout</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-700 rounded-full text-stone-300"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Add Product Buttons */}
          {!isFormOpen && !isBatchMode && (
            <div className="mb-6 flex gap-2 flex-wrap">
              <button
                onClick={() => handleOpenForm()}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2"
              >
                <Plus size={20} /> Add Single Product
              </button>
              <button
                onClick={() => setIsBatchMode(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
              >
                <Upload size={20} /> Add Multiple Products
              </button>
              <label className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 cursor-pointer">
                <FileText size={20} /> Import from Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUpload}
                  disabled={isLoading}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Form */}
          {isFormOpen && (
            <div className="mb-8 p-6 bg-stone-50 rounded-xl border-2 border-stone-200">
              <h3 className="text-xl font-bold mb-4">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h3>
              
              {submitError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg flex items-gap-2 gap-2">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-red-800">Error</div>
                    <div className="text-sm text-red-700">{submitError}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Product Name*</label>
                    <input
                      type="text"
                      required
                      disabled={isLoading}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-stone-200"
                      placeholder="e.g., Leather Keyholder"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Base Price (₱)*</label>
                    <input
                      type="number"
                      required
                      disabled={isLoading}
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-stone-200"
                      placeholder="e.g., 50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Description*</label>
                  <textarea
                    required
                    disabled={isLoading}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="2"
                    className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-stone-200"
                    placeholder="Product description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Card Background Color</label>
                    <select
                      disabled={isLoading}
                      value={formData.imageColor}
                      onChange={(e) => setFormData({ ...formData, imageColor: e.target.value })}
                      className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-stone-200"
                    >
                      {colorOptions.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Icon</label>
                    <input
                      type="text"
                      disabled={isLoading}
                      value={formData.iconName}
                      onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                      className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-stone-200"
                      placeholder="e.g., Key, Wallet, Star, Heart"
                    />
                    <p className="text-xs text-stone-500 mt-1">Available: Key, Wallet, Coins, Heart, Star, Gift, Box</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Colors (comma-separated)</label>
                    <input
                      type="text"
                      disabled={isLoading}
                      value={formData.colors}
                      onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                      className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-stone-200"
                      placeholder="e.g., Tan, Red, Navy Blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">Minimum Order</label>
                    <input
                      type="number"
                      disabled={isLoading}
                      value={formData.minOrder}
                      onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                      className="w-full p-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-stone-200"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Product Image</label>
                  <div className="flex gap-3">
                    <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors">
                      <div className="flex items-center gap-2 text-stone-600">
                        <Upload size={18} />
                        <span className="text-sm font-medium">Choose Image</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage || isLoading}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.image_url && (
                      <div className="relative">
                        <img 
                          src={formData.image_url} 
                          alt="Product preview" 
                          className="w-16 h-16 object-cover rounded-lg border border-stone-200"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  {isUploadingImage && <p className="text-xs text-stone-500 mt-1">Uploading image...</p>}
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Product' : 'Add Product')}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 bg-stone-300 text-stone-800 px-4 py-2 rounded-lg font-bold hover:bg-stone-400 disabled:bg-stone-200 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Batch Mode Form */}
          {isBatchMode && (
            <div className="mb-8 p-6 bg-stone-50 rounded-xl border-2 border-blue-200">
              <h3 className="text-xl font-bold mb-4">Add Multiple Products</h3>
              
              {submitError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg flex items-gap-2 gap-2">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-red-800">Error</div>
                    <div className="text-sm text-red-700">{submitError}</div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-100 border-b">
                      <th className="text-left p-2 font-bold">Name</th>
                      <th className="text-left p-2 font-bold">Description</th>
                      <th className="text-left p-2 font-bold">Price</th>
                      <th className="text-left p-2 font-bold">Colors</th>
                      <th className="text-left p-2 font-bold">Icon</th>
                      <th className="text-left p-2 font-bold">Min Order</th>
                      <th className="text-center p-2 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchProducts.map((product, idx) => (
                      <tr key={idx} className="border-b hover:bg-blue-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) => updateBatchProduct(idx, 'name', e.target.value)}
                            className="w-full p-1 border border-stone-300 rounded text-xs"
                            placeholder="Product name"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={product.description}
                            onChange={(e) => updateBatchProduct(idx, 'description', e.target.value)}
                            className="w-full p-1 border border-stone-300 rounded text-xs"
                            placeholder="Description"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={product.basePrice}
                            onChange={(e) => updateBatchProduct(idx, 'basePrice', e.target.value)}
                            className="w-full p-1 border border-stone-300 rounded text-xs"
                            placeholder="Price"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={product.colors}
                            onChange={(e) => updateBatchProduct(idx, 'colors', e.target.value)}
                            className="w-full p-1 border border-stone-300 rounded text-xs"
                            placeholder="Red, Blue, Green"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={product.iconName}
                            onChange={(e) => updateBatchProduct(idx, 'iconName', e.target.value)}
                            className="w-full p-1 border border-stone-300 rounded text-xs"
                            placeholder="Key"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={product.minOrder}
                            onChange={(e) => updateBatchProduct(idx, 'minOrder', e.target.value)}
                            className="w-full p-1 border border-stone-300 rounded text-xs"
                            placeholder="1"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {batchProducts.length > 1 && (
                            <button
                              onClick={() => removeBatchRow(idx)}
                              className="text-red-600 hover:text-red-800 font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={addBatchRow}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={18} /> Add Row
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBatchSubmit}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Adding Products...' : 'Add All Products'}
                </button>
                <button
                  onClick={() => setIsBatchMode(false)}
                  disabled={isLoading}
                  className="flex-1 bg-stone-300 text-stone-800 px-4 py-3 rounded-lg font-bold hover:bg-stone-400 disabled:bg-stone-200 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div>
            <h3 className="text-xl font-bold mb-4">Current Products ({products.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b-2 border-stone-300">
                    <th className="text-left p-3 font-bold">Name</th>
                    <th className="text-left p-3 font-bold">Price</th>
                    <th className="text-left p-3 font-bold">Colors</th>
                    <th className="text-left p-3 font-bold">Min Order</th>
                    <th className="text-center p-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-b border-stone-200 hover:bg-stone-50">
                      <td className="p-3">
                        <div>
                          <div className="font-bold text-stone-800">{product.name}</div>
                          <div className="text-xs text-stone-500">{product.description.substring(0, 40)}...</div>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-teal-600">₱{product.basePrice}</td>
                      <td className="p-3 text-sm">{Array.isArray(product.colors) ? product.colors.join(', ') : product.colors}</td>
                      <td className="p-3 text-center font-bold">{product.minOrder}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenForm(product)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                          >
                            <Edit2 size={18} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                          >
                            <Trash2 size={18} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

