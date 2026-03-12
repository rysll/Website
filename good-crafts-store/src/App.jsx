import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Menu, Trash2, Check, ExternalLink, Key, Wallet, Coins, Heart, Star, Instagram, Facebook, Settings, Package } from 'lucide-react';
import { useOrders, ORDER_STATUSES } from './OrderContext.jsx';
import logo from './assets/GoodCraftslogo.jpg';
import { useProducts } from './ProductContext';
import { useAuth } from './AuthContext';
import { AdminPanel } from './AdminPanel';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { OrderTracker } from './OrderTracker';

const App = () => {
  const { getProductsWithIcons, loading } = useProducts();
  const { isAdminLoggedIn } = useAuth();
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [customization, setCustomization] = useState({
    variant: null,
    color: '',
    customText: ''
  });
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [isCheckoutFormOpen, setIsCheckoutFormOpen] = useState(false);
  const [checkoutInfo, setCheckoutInfo] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: ''
  });
  const [checkoutErrors, setCheckoutErrors] = useState({});
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  const { createOrder } = useOrders();

  const products = getProductsWithIcons();

  const handleAdminClick = () => {
    if (isAdminLoggedIn) {
      setIsAdminOpen(true);
      setIsDashboardOpen(false);
    } else {
      setIsLoginOpen(true);
    }
  };

  const parseColors = (colors) => {
    if (Array.isArray(colors)) return colors;
    if (typeof colors === 'string') return colors.split(',').map(c => c.trim()).filter(c => c);
    return [];
  };

  const openProductModal = (product) => {
    const colorsList = parseColors(product.colors);
    setSelectedProduct(product);
    setCustomization({
      variant: product.variants[0],
      color: colorsList[0] || '',
      customText: ''
    });
  };

  const closeProductModal = () => setSelectedProduct(null);

  const handleAddToCart = () => {
    if (!selectedProduct || !customization.variant) return;
    const finalPrice = selectedProduct.basePrice + customization.variant.priceMod;
    const newItem = {
      cartId: Date.now(),
      product: selectedProduct,
      variant: customization.variant,
      color: customization.color,
      customText: customization.customText,
      price: finalPrice,
      quantity: 1
    };
    setCart([...cart, newItem]);
    closeProductModal();
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId) => setCart(cart.filter(item => item.cartId !== cartId));

  const updateQuantity = (cartId, change) => {
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const generateOrderSummary = (order = null) => {
    const items = order ? order.items : cart;
    const total = order ? order.total : cartTotal;
    let summary = "Hi Good Crafts! I'd like to place an order:\n\n";
    items.forEach(item => {
      summary += `• ${item.product.name} (${item.variant.name})\n`;
      summary += `  Color: ${item.color}\n`;
      if (item.customText) summary += `  Name: ${item.customText}\n`;
      summary += `  Qty: ${item.quantity} x ₱${item.price}\n\n`;
    });
    if (order?.id) summary += `Order Number: ${order.id}\n\n`;
    summary += `Total: ₱${Number(total).toFixed(2)}`;
    return summary;
  };

  const copyOrderToClipboard = (order = null) => {
    const text = generateOrderSummary(order);
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert("Order copied! You can now paste this into Facebook Messenger/DM.");
    } catch (err) {
      console.error('Unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  // Validate checkout fields
  const validateCheckout = () => {
    const errors = {};
    if (!checkoutInfo.customer_name.trim()) errors.customer_name = 'Name is required';
    if (!checkoutInfo.customer_email.trim()) {
      errors.customer_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutInfo.customer_email)) {
      errors.customer_email = 'Enter a valid email address';
    }
    if (!checkoutInfo.customer_phone.trim()) {
      errors.customer_phone = 'Phone number is required';
    } else if (!/^(\+?63|0)\d{10}$/.test(checkoutInfo.customer_phone.replace(/\s/g, ''))) {
      errors.customer_phone = 'Enter a valid PH number (e.g. 09XXXXXXXXX)';
    }
    if (!checkoutInfo.customer_address.trim()) errors.customer_address = 'Delivery address is required';
    return errors;
  };

  const handleConfirmOrder = async () => {
    const errors = validateCheckout();
    if (Object.keys(errors).length > 0) {
      setCheckoutErrors(errors);
      return;
    }
    setCheckoutErrors({});

    try {
      const orderItems = cart.map(i => ({
        product: { id: i.product.id, name: i.product.name },
        variant: i.variant,
        color: i.color,
        customText: i.customText,
        price: i.price,
        quantity: i.quantity
      }));

      const orderData = {
        items: orderItems,
        total: cartTotal,
        customer_name: checkoutInfo.customer_name.trim(),
        customer_email: checkoutInfo.customer_email.trim(),
        customer_phone: checkoutInfo.customer_phone.trim(),
        customer_address: checkoutInfo.customer_address.trim()
      };

      const ord = await createOrder(orderData);
      setCreatedOrder(ord);
      setShowCheckoutSuccess(true);
      setCart([]);
      setIsCartOpen(false);
      setIsCheckoutFormOpen(false);
      setCheckoutInfo({ customer_name: '', customer_email: '', customer_phone: '', customer_address: '' });
    } catch (err) {
      console.error('Failed to create order', err);
      alert('Unable to place order. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">

      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              <img src={logo} alt="Good Crafts Logo" className="w-8 h-8 rounded-full object-cover" />
            </div>
            <span className="font-bold text-xl tracking-tight text-stone-900">
              Good Crafts<span className="hidden sm:inline"> by kmmk</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Track Order Button */}
            <button
              onClick={() => setIsTrackerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-stone-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
              title="Track your order"
            >
              <Package size={16} />
              <span className="hidden sm:inline">Track Order</span>
            </button>

            <button
              onClick={handleAdminClick}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600 hover:text-stone-900"
              title="Admin Panel"
            >
              <Settings className="w-6 h-6" />
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-stone-700" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative bg-teal-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leather.png')]"></div>
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 relative z-10 text-center">
          <div className="inline-block mb-4 px-3 py-1 bg-teal-800 rounded-full text-xs font-semibold tracking-wider uppercase text-teal-200">
            Handcrafted in Taytay, Rizal
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
            Personalized Leather Gifts <br className="hidden sm:block" /> for Every Occasion
          </h1>
          <p className="text-lg sm:text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            From birthdays to corporate giveaways. Affordable, durable, and uniquely yours.
            Bulk discounts available for 25+ pieces!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#products" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 shadow-lg">
              Shop Now
            </a>
            <button
              onClick={() => setIsTrackerOpen(true)}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-full transition-colors border border-white/20"
            >
              <Package size={18} /> Track My Order
            </button>
          </div>
        </div>
      </header>

      {/* --- PRODUCT GRID --- */}
      <main id="products" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4 text-stone-800">Our Collections</h2>
        <p className="text-center text-stone-500 mb-12 max-w-lg mx-auto">
          Choose your base item below. You can customize colors and names after clicking "Customize".
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-stone-500 text-lg">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-stone-500 text-lg">No products available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-stone-100 overflow-hidden flex flex-col">
                <div className={`h-48 ${product.imageColor} flex items-center justify-center relative group overflow-hidden`}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="transform transition-transform group-hover:scale-110 duration-500">
                      {product.icon}
                    </div>
                  )}
                  {product.minOrder > 1 && (
                    <div className="absolute top-3 left-3 bg-white/90 px-2 py-1 rounded text-xs font-bold text-stone-700">
                      Min. Order: {product.minOrder}pcs
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-stone-800 mb-1">{product.name}</h3>
                  <p className="text-stone-500 text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="text-stone-900 font-bold text-lg">₱{product.basePrice.toFixed(2)}</div>
                    <button
                      onClick={() => openProductModal(product)}
                      className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
                    >
                      Customize
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-20 bg-amber-50 border border-amber-100 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-amber-900 mb-2 flex items-center justify-center gap-2">
            <Star className="fill-amber-500 text-amber-500" /> Bulk Orders Available <Star className="fill-amber-500 text-amber-500" />
          </h3>
          <p className="text-amber-800">
            Planning for Christmas, Weddings, or Company Anniversaries? <br />
            We offer special discounts for orders of <strong>25 pieces and up</strong>. DM us directly for a quote!
          </p>
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-stone-900 text-stone-400 py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h4 className="text-white font-bold text-lg mb-2">Good Crafts by kmmk</h4>
            <p className="text-sm">Personalized Leathercrafts & Souvenirs.</p>
            <p className="text-sm">Taytay, Rizal, Philippines</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setIsTrackerOpen(true)}
              className="text-sm text-stone-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Package size={14} /> Track Order
            </button>
            <a href="https://www.facebook.com/profile.php?id=61561955998791" className="p-2 bg-stone-800 rounded-full hover:bg-stone-700 hover:text-white transition-colors">
              <Facebook size={20} />
            </a>
            <a href="https://www.instagram.com/goodcrafts_by_kmmk?igsh=MTN3aHhveDAzMXZoZA==" className="p-2 bg-stone-800 rounded-full hover:bg-stone-700 hover:text-white transition-colors">
              <Instagram size={20} />
            </a>
          </div>
        </div>
      </footer>

      {/* --- PRODUCT MODAL --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeProductModal}></div>
          <div className="bg-white rounded-2xl w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl">
            <button onClick={closeProductModal} className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full text-stone-500">
              <X size={20} />
            </button>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-xl ${selectedProduct.imageColor} flex items-center justify-center shrink-0`}>
                  {React.cloneElement(selectedProduct.icon, { size: 24 })}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{selectedProduct.name}</h3>
                  <p className="text-stone-500 text-sm">Base Price: ₱{selectedProduct.basePrice}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Select Type</label>
                  <div className="space-y-2">
                    {selectedProduct.variants.map(v => (
                      <label key={v.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${customization.variant?.id === v.id ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600' : 'border-stone-200 hover:border-stone-300'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${customization.variant?.id === v.id ? 'border-teal-600' : 'border-stone-300'}`}>
                            {customization.variant?.id === v.id && <div className="w-2 h-2 rounded-full bg-teal-600"></div>}
                          </div>
                          <span className="text-stone-700 font-medium">{v.name}</span>
                        </div>
                        <span className="text-stone-500 text-sm">{v.priceMod > 0 ? `+₱${v.priceMod}` : 'Included'}</span>
                        <input type="radio" name="variant" className="hidden" checked={customization.variant?.id === v.id} onChange={() => setCustomization({ ...customization, variant: v })} />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Select Color</label>
                  <div className="flex flex-wrap gap-2">
                    {parseColors(selectedProduct.colors).map(color => (
                      <button key={color} onClick={() => setCustomization({ ...customization, color })}
                        className={`px-4 py-2 rounded-full text-sm border transition-all ${customization.color === color ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}>
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {customization.variant?.id !== 'plain' && customization.variant?.id !== 'std' && (
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">
                      Name/Text to Engrave <span className="text-stone-400 font-normal">(Max 10 chars)</span>
                    </label>
                    <input
                      type="text" maxLength={10}
                      placeholder="Type name here (e.g. T. REZA)"
                      value={customization.customText}
                      onChange={(e) => setCustomization({ ...customization, customText: e.target.value.toUpperCase().trim() })}
                      className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none uppercase tracking-widest placeholder:normal-case"
                    />
                    <p className="text-xs text-stone-400 mt-1">Text will be capitalized automatically.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs text-stone-500">Total Price</span>
                  <span className="text-2xl font-bold text-teal-700">
                    ₱{(selectedProduct.basePrice + (customization.variant?.priceMod || 0)).toFixed(2)}
                  </span>
                </div>
                <button onClick={handleAddToCart} className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-transform active:scale-95 shadow-lg shadow-teal-200">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CART DRAWER --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <ShoppingCart size={20} /> Your Cart ({cartCount})
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-stone-200 rounded-full text-stone-500">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
                  <ShoppingCart size={48} className="opacity-20" />
                  <p>Your cart is empty.</p>
                  <button onClick={() => setIsCartOpen(false)} className="text-teal-600 font-bold hover:underline">Start Shopping</button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.cartId} className="flex gap-4 p-3 border border-stone-100 rounded-xl bg-white hover:border-stone-200 transition-colors">
                    <div className={`w-20 h-20 rounded-lg ${item.product.imageColor} flex items-center justify-center shrink-0`}>
                      {React.cloneElement(item.product.icon, { size: 20 })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-stone-800 truncate pr-2">{item.product.name}</h4>
                        <button onClick={() => removeFromCart(item.cartId)} className="text-stone-300 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-stone-500 mb-1">{item.variant.name} • {item.color}</p>
                      {item.customText && (
                        <div className="inline-block bg-stone-100 px-2 py-0.5 rounded text-xs font-mono text-stone-600 mb-2">
                          "{item.customText}"
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center border border-stone-200 rounded-lg">
                          <button onClick={() => updateQuantity(item.cartId, -1)} className="p-1 hover:bg-stone-100 text-stone-500"><Minus size={14} /></button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartId, 1)} className="p-1 hover:bg-stone-100 text-stone-500"><Plus size={14} /></button>
                        </div>
                        <span className="font-bold text-stone-800">₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-stone-50 border-t border-stone-200">
                <div className="flex justify-between mb-4 text-sm">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="font-bold text-stone-800">₱{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-6 text-lg">
                  <span className="font-bold text-stone-800">Total</span>
                  <span className="font-extrabold text-teal-700">₱{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setIsCheckoutFormOpen(true)}
                  className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CHECKOUT FORM MODAL --- */}
      {isCheckoutFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-stone-900 px-6 py-5 text-white">
              <h3 className="text-xl font-bold">Confirm Your Order</h3>
              <p className="text-stone-400 text-sm mt-1">We'll email you updates on your delivery status.</p>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={checkoutInfo.customer_name}
                  onChange={e => { setCheckoutInfo({ ...checkoutInfo, customer_name: e.target.value }); setCheckoutErrors(prev => ({ ...prev, customer_name: '' })); }}
                  placeholder="e.g. Maria Santos"
                  className={`w-full p-3 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-teal-500 ${checkoutErrors.customer_name ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-stone-50 focus:bg-white'}`}
                />
                {checkoutErrors.customer_name && <p className="text-xs text-red-500 mt-1">{checkoutErrors.customer_name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={checkoutInfo.customer_email}
                  onChange={e => { setCheckoutInfo({ ...checkoutInfo, customer_email: e.target.value }); setCheckoutErrors(prev => ({ ...prev, customer_email: '' })); }}
                  placeholder="e.g. maria@email.com"
                  className={`w-full p-3 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-teal-500 ${checkoutErrors.customer_email ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-stone-50 focus:bg-white'}`}
                />
                {checkoutErrors.customer_email && <p className="text-xs text-red-500 mt-1">{checkoutErrors.customer_email}</p>}
                <p className="text-xs text-stone-400 mt-1">You'll receive order & delivery status updates here.</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  value={checkoutInfo.customer_phone}
                  onChange={e => { setCheckoutInfo({ ...checkoutInfo, customer_phone: e.target.value }); setCheckoutErrors(prev => ({ ...prev, customer_phone: '' })); }}
                  placeholder="e.g. 09XXXXXXXXX"
                  className={`w-full p-3 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-teal-500 ${checkoutErrors.customer_phone ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-stone-50 focus:bg-white'}`}
                />
                {checkoutErrors.customer_phone && <p className="text-xs text-red-500 mt-1">{checkoutErrors.customer_phone}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Delivery Address *</label>
                <textarea
                  value={checkoutInfo.customer_address}
                  onChange={e => { setCheckoutInfo({ ...checkoutInfo, customer_address: e.target.value }); setCheckoutErrors(prev => ({ ...prev, customer_address: '' })); }}
                  placeholder="House no., Street, Barangay, City, Province"
                  rows={3}
                  className={`w-full p-3 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-teal-500 resize-none ${checkoutErrors.customer_address ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-stone-50 focus:bg-white'}`}
                />
                {checkoutErrors.customer_address && <p className="text-xs text-red-500 mt-1">{checkoutErrors.customer_address}</p>}
              </div>

              {/* Order Summary */}
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Order Summary</p>
                {cart.map(item => (
                  <div key={item.cartId} className="flex justify-between text-sm py-1">
                    <span className="text-stone-700 truncate pr-2">{item.product.name} ×{item.quantity}</span>
                    <span className="font-semibold text-stone-900 shrink-0">₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold text-teal-700 pt-2 border-t border-stone-200 mt-2">
                  <span>Total</span>
                  <span>₱{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setIsCheckoutFormOpen(false); setCheckoutErrors({}); }}
                className="flex-1 py-3 border border-stone-200 text-stone-700 rounded-xl font-semibold hover:bg-stone-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOrder}
                className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors text-sm"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CHECKOUT SUCCESS MODAL --- */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-teal-600 w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">Order Placed!</h3>

            {/* Prominent Order ID */}
            <div className="bg-stone-50 border-2 border-stone-200 rounded-xl px-6 py-4 mb-4">
              <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-1">Your Order ID</p>
              <p className="text-3xl font-extrabold text-teal-700 font-mono">#{createdOrder?.id}</p>
              <p className="text-xs text-stone-400 mt-1">Save this — you'll need it to track your order</p>
            </div>

            <p className="text-stone-500 text-sm mb-6">
              A confirmation has been sent to <strong className="text-stone-700">{createdOrder?.customer_email}</strong>. We'll also email you as your order progresses.
            </p>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-left mb-6 text-xs text-stone-600 overflow-auto max-h-40">
              <pre className="whitespace-pre-wrap font-sans">{generateOrderSummary(createdOrder)}</pre>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => copyOrderToClipboard(createdOrder)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} /> Copy & Send to Messenger
              </button>
              <button
                onClick={() => { setIsTrackerOpen(true); setShowCheckoutSuccess(false); }}
                className="w-full bg-teal-50 text-teal-700 py-3 rounded-xl font-bold hover:bg-teal-100 transition-colors flex items-center justify-center gap-2 border border-teal-200"
              >
                <Package size={18} /> Track My Order
              </button>
              <button
                onClick={() => { setShowCheckoutSuccess(false); setCreatedOrder(null); }}
                className="text-stone-400 text-sm hover:text-stone-600 pt-1"
              >
                Close & Start New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ORDER TRACKER --- */}
      {isTrackerOpen && <OrderTracker onClose={() => setIsTrackerOpen(false)} />}

      {/* --- ADMIN PANEL --- */}
      {isAdminOpen && (
        <AdminPanel
          onClose={() => setIsAdminOpen(false)}
          onOpenDashboard={() => { setIsAdminOpen(false); setIsDashboardOpen(true); }}
        />
      )}

      {/* --- ADMIN DASHBOARD --- */}
      {isDashboardOpen && (
        <AdminDashboard
          onClose={() => setIsDashboardOpen(false)}
          onOpenPanel={() => { setIsDashboardOpen(false); setIsAdminOpen(true); }}
        />
      )}

      {/* --- ADMIN LOGIN --- */}
      {isLoginOpen && <AdminLogin onClose={() => setIsLoginOpen(false)} />}
    </div>
  );
};

export default App;