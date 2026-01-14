import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Menu, Trash2, Check, ExternalLink, Key, Wallet, Coins, Heart, Star, Instagram, Facebook, Settings } from 'lucide-react';
import { useProducts } from './ProductContext';
import { useAuth } from './AuthContext';
import { AdminPanel } from './AdminPanel';
import { AdminLogin } from './AdminLogin';

// Legacy PRODUCTS - now using ProductContext instead
const PRODUCTS = [
  {
    id: 1,
    name: "Leather Keyholder with Card",
    description: "Best seller! Perfect for birthdays, reunions, and corporate giveaways. Comes with a backing card.",
    basePrice: 50,
    imageColor: "bg-amber-700",
    icon: <Key size={48} className="text-amber-100" />,
    variants: [
      { id: 'plain', name: 'Plain (No Name)', priceMod: 0 },
      { id: 'stamp', name: 'Heatstamped Name', priceMod: 15 },
      { id: 'laser', name: 'Laser Engraved', priceMod: 20 },
    ],
    colors: ['Tan', 'Red', 'Navy Blue', 'Black', 'Pastel Pink', 'Light Blue'],
    minOrder: 1
  },
  {
    id: 2,
    name: "Leather Wallet",
    description: "Useful, handy, and symbolizes financial blessings. A perfect holiday gift.",
    basePrice: 85,
    imageColor: "bg-amber-800",
    icon: <Wallet size={48} className="text-amber-100" />,
    variants: [
      { id: 'plain', name: 'Plain (No Name)', priceMod: 0 },
      { id: 'personalized', name: 'Personalized (With Name)', priceMod: 15 },
    ],
    colors: ['Tan', 'Red', 'Navy Blue', 'Black', 'Green'],
    minOrder: 1
  },
  {
    id: 3,
    name: "Triangle Coin Purse",
    description: "Cute and functional triangle shape. Fits coins and folded bills perfectly.",
    basePrice: 75,
    imageColor: "bg-red-700",
    icon: <Coins size={48} className="text-red-100" />,
    variants: [
      { id: 'plain', name: 'Plain (No Name)', priceMod: 0 },
      { id: 'personalized', name: 'Personalized (With Name)', priceMod: 15 },
    ],
    colors: ['Red', 'Green', 'Tan', 'Navy Blue'],
    minOrder: 1
  },
  {
    id: 4,
    name: "Personalized Button Pin",
    description: "Affordable customized pins. Great for kids' bags or event tags.",
    basePrice: 35,
    imageColor: "bg-green-700",
    icon: <Heart size={48} className="text-green-100" />,
    variants: [
      { id: 'std', name: 'Standard Design', priceMod: 0 },
    ],
    colors: ['Assorted Designs'],
    minOrder: 5
  }
];

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

  // Use products from context
  const products = getProductsWithIcons();

  // Handle admin button click - show login if not logged in
  const handleAdminClick = () => {
    if (isAdminLoggedIn) {
      setIsAdminOpen(true);
    } else {
      setIsLoginOpen(true);
    }
  };

  // -- HANDLERS --

  // Helper function to parse colors - handle both string and array
  const parseColors = (colors) => {
    if (Array.isArray(colors)) {
      return colors;
    }
    if (typeof colors === 'string') {
      return colors.split(',').map(c => c.trim()).filter(c => c);
    }
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

  const closeProductModal = () => {
    setSelectedProduct(null);
  };

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

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

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

  // Generate a text summary for the user to copy
  const generateOrderSummary = () => {
    let summary = "Hi Good Crafts! I'd like to place an order:\n\n";
    cart.forEach(item => {
      summary += `• ${item.product.name} (${item.variant.name})\n`;
      summary += `  Color: ${item.color}\n`;
      if (item.customText) summary += `  Name: ${item.customText}\n`;
      summary += `  Qty: ${item.quantity} x ₱${item.price}\n\n`;
    });
    summary += `Total: ₱${cartTotal.toFixed(2)}`;
    return summary;
  };

  const copyOrderToClipboard = () => {
    const text = generateOrderSummary();
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

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              GC
            </div>
            <span className="font-bold text-xl tracking-tight text-stone-900">Good Crafts<span className="hidden sm:inline"> by kmmk</span></span>
          </div>
          
          <div className="flex items-center gap-2">
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
          <a href="#products" className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 shadow-lg">
            Shop Now
          </a>
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
                {/* Product Image Placeholder */}
                <div className={`h-48 ${product.imageColor} flex items-center justify-center relative group overflow-hidden`}>
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
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
                  <div className="text-stone-900 font-bold text-lg">
                    ₱{product.basePrice.toFixed(2)}
                  </div>
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

        {/* Bulk Info */}
        <div className="mt-20 bg-amber-50 border border-amber-100 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-bold text-amber-900 mb-2 flex items-center justify-center gap-2">
                <Star className="fill-amber-500 text-amber-500" /> Bulk Orders Available <Star className="fill-amber-500 text-amber-500" />
            </h3>
            <p className="text-amber-800">
                Planning for Christmas, Weddings, or Company Anniversaries? <br/>
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
          <div className="flex gap-4">
            <a href="#" className="p-2 bg-stone-800 rounded-full hover:bg-stone-700 hover:text-white transition-colors">
              <Facebook size={20} />
            </a>
            <a href="#" className="p-2 bg-stone-800 rounded-full hover:bg-stone-700 hover:text-white transition-colors">
              <Instagram size={20} />
            </a>
          </div>
        </div>
      </footer>

      {/* --- PRODUCT MODAL --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeProductModal}></div>
          <div className="bg-white rounded-2xl w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={closeProductModal}
              className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full text-stone-500"
            >
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
                {/* Variant Selection */}
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
                                <span className="text-stone-500 text-sm">
                                    {v.priceMod > 0 ? `+₱${v.priceMod}` : 'Included'}
                                </span>
                                <input 
                                    type="radio" 
                                    name="variant" 
                                    className="hidden"
                                    checked={customization.variant?.id === v.id}
                                    onChange={() => setCustomization({...customization, variant: v})} 
                                />
                            </label>
                        ))}
                    </div>
                </div>

                {/* Color Selection */}
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Select Color</label>
                    <div className="flex flex-wrap gap-2">
                        {parseColors(selectedProduct.colors).map(color => (
                            <button
                                key={color}
                                onClick={() => setCustomization({...customization, color})}
                                className={`px-4 py-2 rounded-full text-sm border transition-all ${
                                    customization.color === color 
                                    ? 'bg-stone-800 text-white border-stone-800' 
                                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                                }`}
                            >
                                {color}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Name Input */}
                {customization.variant?.id !== 'plain' && customization.variant?.id !== 'std' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-bold text-stone-700 mb-2">
                            Name/Text to Engrave <span className="text-stone-400 font-normal">(Max 10 chars)</span>
                        </label>
                        <input 
                            type="text" 
                            maxLength={10}
                            placeholder="Type name here (e.g. T. REZA)"
                            value={customization.customText}
                            onChange={(e) => setCustomization({...customization, customText: e.target.value.toUpperCase().trim()})}
                            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none uppercase tracking-widest placeholder:normal-case"
                        />
                        <p className="text-xs text-stone-400 mt-1">Text will be capitalized automatically.</p>
                    </div>
                )}
              </div>

              {/* Total & Action */}
              <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between">
                <div>
                    <span className="block text-xs text-stone-500">Total Price</span>
                    <span className="text-2xl font-bold text-teal-700">
                        ₱{(selectedProduct.basePrice + (customization.variant?.priceMod || 0)).toFixed(2)}
                    </span>
                </div>
                <button 
                    onClick={handleAddToCart}
                    className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-700 transition-transform active:scale-95 shadow-lg shadow-teal-200"
                >
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
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
            
            {/* Drawer */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                    <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                        <ShoppingCart size={20} /> Your Cart ({cartCount})
                    </h2>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-stone-200 rounded-full text-stone-500" >
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
                                            <button onClick={() => updateQuantity(item.cartId, -1)} className="p-1 hover:bg-stone-100 text-stone-500"><Minus size={14}/></button>
                                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.cartId, 1)} className="p-1 hover:bg-stone-100 text-stone-500"><Plus size={14}/></button>
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
                            onClick={() => setShowCheckoutSuccess(true)}
                            className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* --- CHECKOUT SUCCESS MODAL (SIMULATION) --- */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="text-green-600 w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-2">Order Ready!</h3>
                <p className="text-stone-500 mb-6">
                    Because we handle personalized orders with care, please send your order summary directly to our Facebook Messenger to finalize payment and shipping.
                </p>
                
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-left mb-6 font-mono text-xs text-stone-600 overflow-auto max-h-40">
                    <pre className="whitespace-pre-wrap font-sans">{generateOrderSummary()}</pre>
                </div>

                <button 
                    onClick={copyOrderToClipboard}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors mb-3 flex items-center justify-center gap-2"
                >
                    <ExternalLink size={18} /> Copy & Send to Messenger
                </button>
                <button 
                    onClick={() => {
                        setShowCheckoutSuccess(false);
                        setCart([]);
                        setIsCartOpen(false);
                    }}
                    className="text-stone-400 text-sm hover:text-stone-600"
                >
                    Close & Start New Order
                </button>
            </div>
        </div>
      )}

      {/* --- ADMIN PANEL --- */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}

      {/* --- ADMIN LOGIN --- */}
      {isLoginOpen && <AdminLogin onClose={() => setIsLoginOpen(false)} />}

    </div>
  );
};

export default App;