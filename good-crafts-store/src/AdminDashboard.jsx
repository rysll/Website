import React, { useEffect, useState, useRef } from 'react';
import { useProducts } from './ProductContext';
import { useOrders, ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_LABELS, formatOrderId, getPaymentAmounts } from './OrderContext.jsx';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import {
  X, LogOut, LayoutDashboard, Package, ShoppingCart,
  Truck, Archive, AlertTriangle, Search, Menu,
  Plus, Minus, RefreshCw, ChevronRight, User, MapPin,
  Calendar, CheckCircle2, Phone, Mail, Banknote, CreditCard,
  Clock, AlertCircle, Edit2, Save, Check, Upload, Trash2,
  ChevronLeft, Image as ImageIcon, Loader2, FileDown, FileUp,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────
const BUCKET = 'product-images';

const CATEGORIES = [
  { key: 'Leather',    emoji: '🪡', label: 'Leather Goods' },
  { key: 'Keychains',  emoji: '🔑', label: 'Keychains & Pins' },
  { key: 'Magnets',    emoji: '🧲', label: 'Magnets' },
  { key: 'Stationery', emoji: '✏️', label: 'Stationery' },
  { key: 'Novelty',    emoji: '🎁', label: 'Novelty' },
];

const DELIVERY_STATUSES = ORDER_STATUSES;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (status) => {
  switch (status) {
    case 'delivered':  return 'bg-teal-100 text-teal-700';
    case 'in transit': return 'bg-blue-100 text-blue-700';
    case 'pending':    return 'bg-amber-100 text-amber-700';
    case 'failed':     return 'bg-red-100 text-red-700';
    default:           return 'bg-stone-100 text-stone-600';
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

const getImages = (p) => {
  let urls = p.image_urls;
  if (typeof urls === 'string') { try { urls = JSON.parse(urls); } catch { urls = null; } }
  if (Array.isArray(urls) && urls.length > 0) return urls;
  if (p.image_url) return [p.image_url];
  return [];
};

// ─── Upload helper ────────────────────────────────────────────────────────────
async function uploadFile(file, productName) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const safe = productName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
  const path = `${safe}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data: uploadData, error } = await supabase.storage
    .from(BUCKET).upload(path, file, {
      cacheControl: '3600', upsert: false,
      contentType: file.type || 'image/jpeg',
    });

  if (error) throw new Error(error.message || JSON.stringify(error));

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData?.publicUrl
    || `${supabase.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ─── Image Slider ─────────────────────────────────────────────────────────────
const ImageSlider = ({ images = [], productName = '', height = 'h-44' }) => {
  const [idx, setIdx] = useState(0);
  const imgs = images.filter(Boolean);
  useEffect(() => { setIdx(0); }, [imgs.length, imgs[0]]);

  if (imgs.length === 0) {
    return (
      <div className={`w-full ${height} bg-stone-100 rounded-xl flex flex-col items-center justify-center text-stone-300 gap-2`}>
        <ImageIcon size={28} />
        <span className="text-xs text-stone-400">No images</span>
      </div>
    );
  }

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + imgs.length) % imgs.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % imgs.length); };

  return (
    <div className={`relative w-full ${height} bg-stone-100 rounded-xl overflow-hidden group select-none`}>
      <img key={idx} src={imgs[idx]} alt={`${productName} ${idx + 1}`} className="w-full h-full object-cover" />
      {imgs.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow z-10"><ChevronLeft size={14} /></button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow z-10"><ChevronRight size={14} /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {imgs.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`rounded-full transition-all duration-200 ${i === idx ? 'bg-white w-4 h-1.5' : 'bg-white/50 w-1.5 h-1.5'}`} />
            ))}
          </div>
          <div className="absolute top-2 right-2 bg-black/55 text-white text-xs px-2 py-0.5 rounded-full z-10">{idx + 1}/{imgs.length}</div>
        </>
      )}
    </div>
  );
};

// ─── Image Upload Zone ────────────────────────────────────────────────────────
const ImageUploadZone = ({ images, onChange, productName }) => {
  const inputRef = useRef(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [uploading, setUploading] = useState([]);
  const [error, setError] = useState('');

  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSizeMB = 5;

  const processFiles = async (files) => {
    const fileArray = Array.from(files);
    const validationErrors = [];
    const valid = fileArray.filter(f => {
      if (!acceptedTypes.includes(f.type)) { validationErrors.push(`${f.name}: Only JPG, PNG, WEBP, GIF allowed.`); return false; }
      if (f.size > maxSizeMB * 1024 * 1024) { validationErrors.push(`${f.name}: Max ${maxSizeMB}MB.`); return false; }
      return true;
    });

    if (validationErrors.length > 0) { setError(validationErrors[0]); return; }
    if (valid.length === 0) { setError('No valid files.'); return; }
    setError('');

    const placeholders = valid.map((_, i) => `__uploading__${Date.now()}_${i}`);
    onChange(prev => [...(Array.isArray(prev) ? prev : []), ...placeholders]);
    setUploading(placeholders);

    try {
      const urls = await Promise.all(valid.map(f => uploadFile(f, productName || 'product')));
      onChange(prev => {
        const next = [...prev];
        placeholders.forEach((ph, i) => { const pi = next.indexOf(ph); if (pi !== -1) next[pi] = urls[i]; });
        return next;
      });
      setError('');
    } catch (err) {
      setError('Upload failed: ' + (err.message || 'Unknown error'));
      onChange(prev => prev.filter(u => !placeholders.includes(u)));
    } finally {
      setUploading([]);
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDraggingOver(false); processFiles(e.dataTransfer.files); };
  const handleInputChange = (e) => { processFiles(e.target.files); e.target.value = ''; };
  const removeImage = (idx) => onChange(images.filter((_, i) => i !== idx));
  const moveImage = (from, to) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const isUploading = uploading.length > 0;

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${draggingOver ? 'border-teal-500 bg-teal-50' : 'border-stone-200 hover:border-teal-400 hover:bg-stone-50'}`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInputChange} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-teal-600">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-sm font-semibold">Uploading {uploading.length} image{uploading.length > 1 ? 's' : ''}…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-stone-400">
            <Upload size={24} className={draggingOver ? 'text-teal-500' : ''} />
            <p className="text-sm font-semibold text-stone-600">{draggingOver ? 'Drop images here' : 'Click to upload or drag & drop'}</p>
            <p className="text-xs">JPG, PNG, WEBP, GIF · Max {maxSizeMB}MB · Multiple allowed</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl flex items-start gap-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => {
            const isLoading = url.startsWith('__uploading__');
            return (
              <div key={url} className="relative group rounded-xl overflow-hidden bg-stone-100 aspect-square border border-stone-200">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center"><Loader2 size={18} className="animate-spin text-teal-500" /></div>
                ) : (
                  <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                )}
                {i === 0 && !isLoading && (
                  <div className="absolute top-1 left-1 bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">Main</div>
                )}
                {!isLoading && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    {i > 0 && <button onClick={() => moveImage(i, i - 1)} className="bg-white/90 hover:bg-white text-stone-700 rounded-full p-1"><ChevronLeft size={13} /></button>}
                    <button onClick={() => removeImage(i)} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1"><Trash2 size={13} /></button>
                    {i < images.length - 1 && <button onClick={() => moveImage(i, i + 1)} className="bg-white/90 hover:bg-white text-stone-700 rounded-full p-1"><ChevronRight size={13} /></button>}
                  </div>
                )}
                {!isLoading && images.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-full">{i + 1}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {images.filter(u => !u.startsWith('__uploading__')).length > 1 && (
        <p className="text-xs text-stone-400 text-center">Hover to reorder ← → or remove. First image is the main photo.</p>
      )}
    </div>
  );
};

// ─── Variants Editor ──────────────────────────────────────────────────────────
const VariantsEditor = ({ variants, onChange }) => {
  const addVariant = () => onChange([...variants, { id: `v_${Date.now()}`, name: '', priceMod: 0 }]);
  const updateVariant = (idx, field, value) =>
    onChange(variants.map((v, i) => i === idx ? { ...v, [field]: field === 'priceMod' ? Number(value) : value } : v));
  const removeVariant = (idx) => onChange(variants.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {variants.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          ⚠️ No types added yet. Customers won't see any selection options.
        </p>
      )}
      {variants.map((v, i) => (
        <div key={v.id || i} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
          <input type="text" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)}
            placeholder="e.g. Plain (No Name)"
            className="flex-1 bg-transparent text-sm outline-none text-stone-700 placeholder:text-stone-300" />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-stone-400">+₱</span>
            <input type="number" min="0" step="1" value={v.priceMod}
              onChange={e => updateVariant(i, 'priceMod', e.target.value)}
              className="w-16 bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-1 focus:ring-teal-400" />
          </div>
          <button onClick={() => removeVariant(i)} className="text-stone-300 hover:text-red-500 transition-colors shrink-0"><Trash2 size={13} /></button>
        </div>
      ))}
      <button onClick={addVariant}
        className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-teal-300 text-teal-600 rounded-xl text-xs font-semibold hover:bg-teal-50 transition-colors">
        <Plus size={12} /> Add Type
      </button>
      {variants.length > 0 && (
        <p className="text-xs text-stone-400">Set price modifier to <strong>0</strong> for included types. First type is selected by default.</p>
      )}
    </div>
  );
};

// ─── Edit Product Modal ───────────────────────────────────────────────────────
const EditProductModal = ({ product, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name:        product.name        || '',
    description: product.description || '',
    basePrice:   product.basePrice   || 0,
    minOrder:    product.minOrder    || 1,
    colors: (() => {
      const raw = product.colors || '';
      if (raw.trim().startsWith('[')) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p.join(', ') : raw; } catch { return raw; } }
      return raw;
    })(),
    category:  product.category || '',
    imageUrls: (() => {
      let urls = product.image_urls;
      if (typeof urls === 'string') { try { urls = JSON.parse(urls); } catch { urls = null; } }
      if (Array.isArray(urls) && urls.length > 0) return urls;
      if (product.image_url) return [product.image_url];
      return [];
    })(),
    variants: (() => {
      let v = product.variants;
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
      return Array.isArray(v) && v.length > 0 ? v : [];
    })(),
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const hasUploading = form.imageUrls.some(u => u.startsWith('__uploading__'));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (hasUploading) { setError('Please wait for images to finish uploading.'); return; }
    setSaving(true); setError('');
    try {
      const imageUrls = form.imageUrls.filter(u => u && !u.startsWith('__uploading__'));
      const { data, error: supaErr } = await supabase.from('products').update({
        name:        form.name.trim(),
        description: form.description.trim(),
        basePrice:   Number(form.basePrice),
        minOrder:    Number(form.minOrder),
        colors:      form.colors.split(',').map(c => c.trim()).filter(Boolean).join(', '),
        image_url:   imageUrls[0] || null,
        image_urls:  imageUrls.length > 0 ? imageUrls : null,
        category:    form.category || null,
        variants:    form.variants.length > 0 ? form.variants : null,
        updated_at:  new Date().toISOString(),
      }).eq('id', product.id).select().single();

      if (supaErr) throw new Error(supaErr.message ? `DB error: ${supaErr.message}` : JSON.stringify(supaErr));
      setSaved(true);
      setTimeout(() => onSaved(data), 600);
    } catch (err) {
      setError(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Edit Product</h3>
            <p className="text-teal-200 text-xs mt-0.5">Changes save directly to Supabase</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-teal-600 rounded-full transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2"><AlertCircle size={15} /> {error}</div>}

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Product Name *</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Base Price (₱)</label>
              <input type="number" min="0" step="0.01" value={form.basePrice} onChange={e => setField('basePrice', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Min Order (pcs)</label>
              <input type="number" min="1" value={form.minOrder} onChange={e => setField('minOrder', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Colors (comma-separated)</label>
            <input value={form.colors} onChange={e => setField('colors', e.target.value)} placeholder="e.g. Tan, Red, Navy Blue, Black"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Category</label>
            <select value={form.category} onChange={e => setField('category', e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white">
              <option value="">— Select a category —</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Product Types <span className="text-stone-400 normal-case font-normal ml-1">(shown as "Select Type" on storefront)</span>
            </label>
            <VariantsEditor variants={form.variants} onChange={v => setField('variants', v)} />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Product Photos <span className="text-stone-400 normal-case font-normal ml-1">({form.imageUrls.filter(u => !u.startsWith('__uploading__')).length} uploaded)</span>
            </label>
            <ImageUploadZone
              images={form.imageUrls}
              onChange={newVal => {
                if (typeof newVal === 'function') setForm(f => ({ ...f, imageUrls: newVal(f.imageUrls) }));
                else setField('imageUrls', newVal);
              }}
              productName={form.name}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 border-t border-stone-100 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || saved || hasUploading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${saved ? 'bg-teal-500 text-white' : hasUploading ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60'}`}>
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
             : saved ? <><Check size={15} /> Saved!</>
             : hasUploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
             : <><Save size={15} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add Product Modal ────────────────────────────────────────────────────────
const AddProductModal = ({ onClose, onAdded }) => {
  const [form, setForm] = useState({ name: '', description: '', basePrice: '', minOrder: 1, colors: '', category: '', imageUrls: [], variants: [] });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const hasUploading = form.imageUrls.some(u => u.startsWith('__uploading__'));

  const handleAdd = async () => {
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    if (!form.basePrice || isNaN(Number(form.basePrice))) { setError('Valid base price is required.'); return; }
    if (hasUploading) { setError('Please wait for images to finish uploading.'); return; }
    setSaving(true); setError('');
    try {
      const imageUrls = form.imageUrls.filter(u => u && !u.startsWith('__uploading__'));
      const { data, error: supaErr } = await supabase.from('products').insert([{
        name:        form.name.trim(),
        description: form.description.trim(),
        basePrice:   Number(form.basePrice),
        minOrder:    Number(form.minOrder) || 1,
        colors:      form.colors.split(',').map(c => c.trim()).filter(Boolean).join(', '),
        image_url:   imageUrls[0] || null,
        image_urls:  imageUrls.length > 0 ? imageUrls : null,
        category:    form.category || null,
        variants:    form.variants.length > 0 ? form.variants : null,
      }]).select().single();

      if (supaErr) throw new Error(supaErr.message ? `DB error: ${supaErr.message}` : JSON.stringify(supaErr));
      onAdded(data);
    } catch (err) {
      setError(err.message || 'Failed to add product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-stone-900 px-6 py-4 text-white flex items-center justify-between">
          <h3 className="text-lg font-bold">Add New Product</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-700 rounded-full transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2"><AlertCircle size={15} /> {error}</div>}

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Product Name *</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Leather Keyholder"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3} placeholder="Brief description…"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Base Price (₱) *</label>
              <input type="number" min="0" step="0.01" value={form.basePrice} onChange={e => setField('basePrice', e.target.value)} placeholder="0.00"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Min Order (pcs)</label>
              <input type="number" min="1" value={form.minOrder} onChange={e => setField('minOrder', e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Colors (comma-separated)</label>
            <input value={form.colors} onChange={e => setField('colors', e.target.value)} placeholder="e.g. Tan, Red, Navy Blue, Black"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Category</label>
            <select value={form.category} onChange={e => setField('category', e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white">
              <option value="">— Select a category —</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Product Types <span className="text-stone-400 normal-case font-normal ml-1">(shown as "Select Type" on storefront)</span>
            </label>
            <VariantsEditor variants={form.variants} onChange={v => setField('variants', v)} />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Product Photos <span className="text-stone-400 normal-case font-normal ml-1">({form.imageUrls.filter(u => !u.startsWith('__uploading__')).length} uploaded)</span>
            </label>
            <ImageUploadZone
              images={form.imageUrls}
              onChange={newVal => {
                if (typeof newVal === 'function') setForm(f => ({ ...f, imageUrls: newVal(f.imageUrls) }));
                else setField('imageUrls', newVal);
              }}
              productName={form.name || 'product'}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 border-t border-stone-100 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={handleAdd} disabled={saving || hasUploading}
            className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Adding…</>
             : hasUploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
             : <><Plus size={15} /> Add Product</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Item Detail Row — reusable component for showing a single order item ─────
// Shows: product name, type, color, engraved names, qty, price
const ItemDetailRow = ({ it, idx, showIndex = false }) => {
  // Parse engraved names — could be comma-separated string or array
  const names = (() => {
    if (it.names && Array.isArray(it.names) && it.names.length > 0) return it.names;
    if (it.customText) return it.customText.split(',').map(n => n.trim()).filter(Boolean);
    return [];
  })();

  const CAT_MAP = { Leather:'🪡 Leather', Keychains:'🔑 Keychains', Magnets:'🧲 Magnets', Stationery:'✏️ Stationery', Novelty:'🎁 Novelty' };
  const category = it.product?.category
    ? (CAT_MAP[it.product.category] || it.product.category)
    : null;

  return (
    <li className="bg-stone-50 rounded-xl px-3 py-3 border border-stone-100 space-y-1.5">
      {/* Row 1: product name + qty + price */}
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-stone-800 text-sm leading-tight">
          {showIndex && <span className="text-stone-400 font-normal mr-1">#{idx + 1}</span>}
          {it.product?.name || '—'}
        </div>
        <div className="text-right shrink-0">
          <span className="font-bold text-teal-600 text-sm">₱{((it.price || 0) * (it.quantity || 1)).toFixed(2)}</span>
          <span className="text-xs text-stone-400 ml-1">×{it.quantity}</span>
        </div>
      </div>

      {/* Row 2: type · color · category badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        {it.variant?.name && (
          <span className="inline-flex items-center text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
            {it.variant.name}
          </span>
        )}
        {it.color && (
          <span className="inline-flex items-center text-xs font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
            🎨 {it.color}
          </span>
        )}
        {category && (
          <span className="inline-flex items-center text-xs font-medium bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
            {category}
          </span>
        )}
      </div>

      {/* Row 3: engraved names */}
      {names.length > 0 && (
        <div className="pt-0.5">
          <span className="text-xs text-stone-400 font-medium">
            {names.length === 1 ? '✏️ Engraved name:' : `✏️ Engraved names (${names.length}):`}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {names.map((name, i) => (
              <span key={i} className="inline-flex items-center text-xs font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </li>
  );
};

// ─── Mobile Order Card ────────────────────────────────────────────────────────
const OrderCard = ({ o, updatingId, setUpdatingId, updateOrderStatus, updatePaymentStatus }) => {
  const ps = o.payment_status || 'awaiting_downpayment';
  const { downpayment, remaining } = getPaymentAmounts(o.total);
  const isUpdating = updatingId === o.id;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-2 py-1 rounded-lg">{o.order_number || formatOrderId(o.id)}</span>
          <div className="text-xs text-stone-400 mt-1">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-teal-600">₱{Number(o.total || 0).toFixed(2)}</div>
          <div className="text-xs text-stone-400">DP: ₱{downpayment.toFixed(2)}</div>
        </div>
      </div>
      <div className="text-sm font-medium text-stone-800">{o.customer_name || '–'}</div>
      <div className="text-xs text-stone-400 mb-3">{o.customer_email}</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {o.status === 'delivered' ? (
          <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full"><CheckCircle2 size={11} /> Delivered</span>
        ) : (
          <select value={o.status} disabled={isUpdating}
            onChange={async e => { setUpdatingId(o.id); try { await updateOrderStatus(o.id, e.target.value); } catch (err) { alert(err.message); } finally { setUpdatingId(null); } }}
            className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white capitalize">
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${paymentBadgeColor(ps)}`}>
          <CreditCard size={10} /> {PAYMENT_LABELS[ps] || ps}
        </span>
      </div>
      <div className="border-t border-stone-50 pt-3">
        {ps === 'fully_paid' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-full border border-teal-200"><CheckCircle2 size={11} /> Fully Paid</span>
        ) : ps === 'awaiting_downpayment' ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-700 font-semibold flex items-center gap-1"><Clock size={11}/> Awaiting downpayment</div>
              <div className="text-xs text-stone-500">Due: <strong>₱{downpayment.toFixed(2)}</strong></div>
            </div>
            <button disabled={isUpdating} onClick={async () => { setUpdatingId(o.id); try { await updatePaymentStatus(o.id, 'downpayment_paid'); } catch(e){alert(e.message);} finally{setUpdatingId(null);} }}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">{isUpdating ? '…' : '✓ Mark Paid'}</button>
          </div>
        ) : ps === 'downpayment_paid' ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-blue-700 font-semibold flex items-center gap-1"><Banknote size={11}/> Downpayment received</div>
              <div className="text-xs text-stone-500">Remaining: <strong>₱{remaining.toFixed(2)}</strong></div>
            </div>
            <button disabled={isUpdating} onClick={async () => { setUpdatingId(o.id); try { await updatePaymentStatus(o.id, 'awaiting_remaining'); } catch(e){alert(e.message);} finally{setUpdatingId(null);} }}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">{isUpdating ? '…' : 'Request Balance'}</button>
          </div>
        ) : ps === 'awaiting_remaining' ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-orange-700 font-semibold flex items-center gap-1"><AlertCircle size={11}/> Awaiting remaining</div>
              <div className="text-xs text-stone-500">Due: <strong>₱{remaining.toFixed(2)}</strong></div>
            </div>
            <button disabled={isUpdating} onClick={async () => { setUpdatingId(o.id); try { await updatePaymentStatus(o.id, 'fully_paid'); } catch(e){alert(e.message);} finally{setUpdatingId(null);} }}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50">{isUpdating ? '…' : '✓ Mark Fully Paid'}</button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const AdminDashboard = ({ onClose, onOpenPanel }) => {
  const { products, fetchProducts } = useProducts();
  const { orders, inventory, loading, fetchOrders, updateOrderStatus, updatePaymentStatus, updateInventoryQty, restockInventory } = useOrders();
  const { logout } = useAuth();

  const [activeTab,       setActiveTab]       = useState('dashboard');
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [detailsOrder,    setDetailsOrder]    = useState(null);
  const [updatingId,      setUpdatingId]      = useState(null);
  const [searchDelivery,  setSearchDelivery]  = useState('');
  const [searchInventory, setSearchInventory] = useState('');
  const [searchOrders,    setSearchOrders]    = useState('');
  const [searchProducts,  setSearchProducts]  = useState('');
  const [orderFilter,     setOrderFilter]     = useState('all');
  const [deliveryFilter,  setDeliveryFilter]  = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState('all');

  // Products tab state
  const [editingProduct,  setEditingProduct]  = useState(null);
  const [addingProduct,   setAddingProduct]   = useState(false);
  const [deleteConfirm,   setDeleteConfirm]   = useState(null);
  const [deleting,        setDeleting]        = useState(false);
  const [localProducts,   setLocalProducts]   = useState(null);
  const [updatingCatId,   setUpdatingCatId]   = useState(null);

  // Inventory tab state
  const [editingInvId,    setEditingInvId]    = useState(null);
  const [editInvForm,     setEditInvForm]     = useState({});
  const [savingInv,       setSavingInv]       = useState(false);
  const [deleteInvConfirm,setDeleteInvConfirm]= useState(null);
  const [deletingInv,     setDeletingInv]     = useState(false);
  const [importingCsv,    setImportingCsv]    = useState(false);
  const csvInputRef = useRef(null);

  useEffect(() => { setLocalProducts(products); }, [products]);

  const displayedProducts = (localProducts ?? products).filter(p =>
    p.name?.toLowerCase().includes(searchProducts.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchProducts.toLowerCase())
  );

  const handleDeleteProduct = async (product) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      if (error) throw error;
      setLocalProducts(prev => (prev ?? products).filter(p => p.id !== product.id));
      await fetchProducts();
      setDeleteConfirm(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCategoryChange = async (product, newCategory) => {
    setUpdatingCatId(product.id);
    try {
      const { data, error } = await supabase.from('products').update({ category: newCategory || null }).eq('id', product.id).select().single();
      if (error) throw error;
      setLocalProducts(prev => (prev ?? products).map(p => p.id === data.id ? { ...p, ...data } : p));
    } catch (err) {
      alert('Failed to update category: ' + err.message);
    } finally {
      setUpdatingCatId(null);
    }
  };

  const deliveries = orders.filter(o => o.status && o.status !== 'order placed');
  const filteredDeliveries = deliveries.filter(o => {
    const matchSearch = (o.customer_name || '').toLowerCase().includes(searchDelivery.toLowerCase()) || String(o.id).includes(searchDelivery);
    const matchFilter = deliveryFilter === 'all' || o.status === deliveryFilter;
    return matchSearch && matchFilter;
  });

  useEffect(() => { fetchOrders(); }, []);

  const statusCounts = ORDER_STATUSES.reduce((acc, s) => { acc[s] = orders.filter(o => o.status === s).length; return acc; }, {});
  const activeOrders     = orders.filter(o => { const s = o.status?.toLowerCase(); return s !== 'completed' && s !== 'cancelled' && s !== 'delivered'; }).length;
  const activeDeliveries = orders.filter(o => o.status === 'in transit' || o.status === 'out for delivery').length;
  const lowStockCount    = inventory.filter(i => i.qty <= (i.low_threshold ?? 10)).length;

  const filteredInventory = inventory.filter(i => {
    const matchSearch = i.product_name.toLowerCase().includes(searchInventory.toLowerCase());
    const isLow = i.qty <= (i.low_threshold ?? 10);
    const matchFilter = inventoryFilter === 'all' || (inventoryFilter === 'low' && isLow) || (inventoryFilter === 'instock' && !isLow);
    return matchSearch && matchFilter;
  });

  const handleInventoryQtyChange = async (inventoryId, currentQty, delta) => {
    const newQty = Math.max(0, currentQty + delta);
    try { await updateInventoryQty(inventoryId, newQty); } catch { alert('Failed to update quantity.'); }
  };

  const handleRestock = async (inventoryId) => {
    try { await restockInventory(inventoryId, 50); } catch { alert('Failed to restock.'); }
  };

  // ── Inventory edit/delete/CSV ─────────────────────────────────────────────
  const startEditInv = (item) => {
    setEditingInvId(item.id);
    setEditInvForm({ product_name: item.product_name, location: item.location || '', qty: item.qty, low_threshold: item.low_threshold ?? 10 });
  };

  const saveEditInv = async (item) => {
    setSavingInv(true);
    try {
      const { error } = await supabase.from('inventory').update({
        product_name:  editInvForm.product_name,
        location:      editInvForm.location || null,
        qty:           Number(editInvForm.qty),
        low_threshold: Number(editInvForm.low_threshold),
      }).eq('id', item.id);
      if (error) throw error;
      await fetchOrders();
      setEditingInvId(null);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSavingInv(false);
    }
  };

  const deleteInvItem = async (item) => {
    setDeletingInv(true);
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', item.id);
      if (error) throw error;
      await fetchOrders();
      setDeleteInvConfirm(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingInv(false);
    }
  };

  const exportCsv = () => {
    const header = ['id', 'product_name', 'location', 'qty', 'low_threshold', 'last_restocked'];
    const rows = inventory.map(i => [
      i.id, i.product_name, i.location || '', i.qty, i.low_threshold ?? 10, i.last_restocked || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importCsv = async (file) => {
    setImportingCsv(true);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].replace(/"/g, '').split(',').map(h => h.trim());
      const nameIdx  = headers.indexOf('product_name');
      const locIdx   = headers.indexOf('location');
      const qtyIdx   = headers.indexOf('qty');
      const thrIdx   = headers.indexOf('low_threshold');
      if (nameIdx === -1 || qtyIdx === -1) { alert('CSV must have product_name and qty columns.'); return; }

      const rows = lines.slice(1).map(line => {
        const vals = line.match(/("([^"]|"")*"|[^,]*)/g).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        return {
          product_name:  vals[nameIdx] || '',
          location:      locIdx !== -1 ? vals[locIdx] : null,
          qty:           parseInt(vals[qtyIdx], 10) || 0,
          low_threshold: thrIdx !== -1 ? parseInt(vals[thrIdx], 10) : 10,
        };
      }).filter(r => r.product_name);

      for (const row of rows) {
        await supabase.from('inventory').insert([row]);
      }
      await fetchOrders();
      alert(`✅ Imported ${rows.length} item${rows.length !== 1 ? 's' : ''} successfully.`);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setImportingCsv(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // ── Real-time chart data ──────────────────────────────────────────────────
  const weeklySalesData = (() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const now = new Date();
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6);
    orders.forEach(o => {
      if (!o.created_at || !o.total) return;
      const d = new Date(o.created_at);
      if (d >= sevenDaysAgo) totals[days[d.getDay()]] += Number(o.total);
    });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i));
      const label = days[d.getDay()];
      return { day: label, sales: Math.round(totals[label]) };
    });
  })();

  const categoryChartData = (() => {
    const counts = {};
    (localProducts ?? products).forEach(p => {
      if (!p.category) return;
      const c = CATEGORIES.find(c => c.key === p.category);
      const label = c ? c.label.split(' ')[0] : p.category;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([cat, count]) => ({ cat, count }));
  })();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products',  label: 'Products',  icon: Package },
    { id: 'orders',    label: 'Orders',    icon: ShoppingCart },
    { id: 'delivery',  label: 'Delivery',  icon: Truck },
    { id: 'inventory', label: 'Inventory', icon: Archive },
  ];

  const switchTab = (id) => { setActiveTab(id); setSidebarOpen(false); };

  return (
    <div className="fixed inset-0 z-50 flex bg-stone-100 font-sans text-stone-800 overflow-hidden">

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col shrink-0 shadow-sm transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <h1 className="text-base font-bold text-stone-900">Admin Dashboard</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-stone-100 rounded-lg"><X size={18} className="text-stone-500" /></button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => switchTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`}>
              <Icon size={18} className={activeTab === id ? 'text-teal-600' : 'text-stone-400'} />
              {label}
              {id === 'orders' && activeOrders > 0 && <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{activeOrders}</span>}
              {id === 'inventory' && lowStockCount > 0 && <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{lowStockCount}</span>}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-stone-200 space-y-0.5">
          <button onClick={() => { logout(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 sm:px-6 h-14 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-stone-100 rounded-lg text-stone-500"><Menu size={20} /></button>
            <span className="text-stone-900 font-semibold capitalize text-sm sm:text-base">{activeTab}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto">

            {/* ═══ DASHBOARD TAB ═══ */}
            {activeTab === 'dashboard' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Dashboard Overview</h2>
                  <p className="text-stone-500 text-sm mt-1">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Total Products',    value: products.length,  sub: `${products.length} active`,  icon: Package,       iconColor: 'text-blue-500',  iconBg: 'bg-blue-50'  },
                    { label: 'Total Orders',      value: orders.length,    sub: `${activeOrders} active`,     icon: ShoppingCart,  iconColor: 'text-teal-600',  iconBg: 'bg-teal-50'  },
                    { label: 'Active Deliveries', value: activeDeliveries, sub: 'In transit',                 icon: Truck,         iconColor: 'text-stone-600', iconBg: 'bg-stone-100' },
                    { label: 'Low Stock Alerts',  value: lowStockCount,    sub: 'Need restocking',            icon: AlertTriangle, iconColor: 'text-red-500',   iconBg: 'bg-red-50'   },
                  ].map(({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                      <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-2`}><Icon size={18} className={iconColor} /></div>
                      <p className="text-xs text-stone-500 mb-0.5">{label}</p>
                      <p className="text-2xl sm:text-3xl font-bold text-stone-900">{value}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-stone-900">Weekly Sales (₱)</h3>
                      <span className="text-xs text-stone-400">Last 7 days</span>
                    </div>
                    {weeklySalesData.every(d => d.sales === 0) ? (
                      <div className="h-[180px] flex items-center justify-center text-stone-300 text-sm">No sales data yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={weeklySalesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `₱${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
                          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4', fontSize: 12 }} formatter={v => [`₱${Number(v).toFixed(2)}`, 'Sales']} />
                          <Line type="monotone" dataKey="sales" stroke="#0d9488" strokeWidth={2.5} dot={{ fill: '#0d9488', r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-stone-900">Products by Category</h3>
                      <span className="text-xs text-stone-400">{(localProducts ?? products).length} products</span>
                    </div>
                    {categoryChartData.length === 0 ? (
                      <div className="h-[180px] flex items-center justify-center text-stone-300 text-sm">No category data yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={categoryChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                          <XAxis dataKey="cat" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e7e5e4', fontSize: 12 }} formatter={v => [v, 'Products']} />
                          <Bar dataKey="count" fill="#0d9488" radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
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
                    <p className="text-stone-500 text-sm mt-1">{(localProducts ?? products).length} products in your catalog</p>
                  </div>
                  <button onClick={() => setAddingProduct(true)}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                    <Plus size={15} /> Add Product
                  </button>
                </div>

                <div className="mb-4">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="text" placeholder="Search products…" value={searchProducts} onChange={e => setSearchProducts(e.target.value)}
                      className="pl-8 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none w-full" />
                  </div>
                </div>

                {displayedProducts.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">
                    <Package size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="mb-4">No products yet.</p>
                    <button onClick={() => setAddingProduct(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">
                      <Plus size={15} /> Add First Product
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                    {displayedProducts.map(product => {
                      const images = getImages(product);
                      const variants = (() => {
                        let v = product.variants;
                        if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
                        return Array.isArray(v) ? v : [];
                      })();
                      return (
                        <div key={product.id} className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <ImageSlider images={images} productName={product.name} />
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-stone-800 text-sm leading-tight">{product.name}</h3>
                              <span className="font-bold text-teal-600 text-sm shrink-0">₱{Number(product.basePrice || 0).toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-stone-400 line-clamp-2 mb-2">{product.description}</p>

                            <div className="mb-2">
                              <select value={product.category || ''} disabled={updatingCatId === product.id}
                                onChange={e => handleCategoryChange(product, e.target.value)}
                                className={`w-full text-xs border rounded-lg px-2 py-1.5 outline-none transition-all ${product.category ? 'border-teal-200 bg-teal-50 text-teal-700 font-semibold' : 'border-amber-200 bg-amber-50 text-amber-600 font-semibold'} ${updatingCatId === product.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
                                <option value="">⚠️ No category set</option>
                                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                              </select>
                            </div>

                            <div className="flex items-center justify-between text-xs text-stone-400 mb-3">
                              <span>Min: {product.minOrder || 1}pcs</span>
                              <span className={`font-semibold px-2 py-0.5 rounded-full ${variants.length > 0 ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}`}>
                                {variants.length > 0 ? `${variants.length} type${variants.length !== 1 ? 's' : ''}` : '⚠️ No types'}
                              </span>
                            </div>

                            <div className="flex gap-2">
                              <button onClick={() => setEditingProduct(product)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-teal-200 text-teal-700 rounded-xl text-xs font-semibold hover:bg-teal-50 transition-colors">
                                <Edit2 size={13} /> Edit
                              </button>
                              <button onClick={() => setDeleteConfirm(product)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-100 text-red-500 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {editingProduct && (
                  <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)}
                    onSaved={freshData => {
                      setLocalProducts(prev => (prev ?? products).map(p => p.id === freshData.id ? { ...p, ...freshData } : p));
                      fetchProducts();
                      setEditingProduct(null);
                    }} />
                )}

                {addingProduct && (
                  <AddProductModal onClose={() => setAddingProduct(false)}
                    onAdded={newProduct => {
                      setLocalProducts(prev => [newProduct, ...(prev ?? products)]);
                      fetchProducts();
                      setAddingProduct(false);
                    }} />
                )}

                {deleteConfirm && (
                  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                      <h3 className="text-lg font-bold text-stone-900 mb-2">Delete Product?</h3>
                      <p className="text-sm text-stone-500 mb-6">Are you sure you want to delete <strong className="text-stone-800">{deleteConfirm.name}</strong>? This cannot be undone.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-xl font-semibold text-sm hover:bg-stone-50">Cancel</button>
                        <button onClick={() => handleDeleteProduct(deleteConfirm)} disabled={deleting} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-60">
                          {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                    <input type="text" placeholder="Search name or order ID..." value={searchOrders} onChange={e => setSearchOrders(e.target.value)}
                      className="pl-8 pr-4 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none w-full sm:w-56" />
                  </div>
                </div>

                <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
                  {['all', ...ORDER_STATUSES].map(s => {
                    const count = s === 'all' ? orders.length : orders.filter(o => o.status === s).length;
                    return (
                      <button key={s} onClick={() => setOrderFilter(s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize border shrink-0 ${orderFilter === s ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-white text-stone-600 border-stone-200 hover:border-teal-400 hover:text-teal-700'}`}>
                        {s === 'all' ? 'All' : s}
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${orderFilter === s ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>{count}</span>
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
                        <button onClick={() => setDetailsOrder(o)} className="text-teal-600 text-xs font-semibold hover:text-teal-800 flex items-center gap-1"><ChevronRight size={14} /></button>
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
                      <div className="md:hidden space-y-3">
                        {filtered.length === 0 ? (
                          <div className="bg-white rounded-2xl p-10 text-center text-stone-400 border border-stone-100">No orders match.</div>
                        ) : filtered.map(o => (
                          <OrderCard key={o.id} o={o} updatingId={updatingId} setUpdatingId={setUpdatingId} updateOrderStatus={updateOrderStatus} updatePaymentStatus={updatePaymentStatus} />
                        ))}
                      </div>
                      <div className="hidden md:block space-y-5">
                        {(orderFilter === 'all' || orderFilter !== 'delivered') && activeOrdList.length > 0 && (
                          <div>
                            {orderFilter === 'all' && <div className="flex items-center gap-2 mb-3"><span className="text-sm font-bold text-stone-700">Active Orders</span><span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{activeOrdList.length}</span></div>}
                            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-x-auto">
                              <table className="w-full text-sm"><thead><TableHeaders /></thead><tbody>{activeOrdList.map((o, i) => <OrderRow key={o.id} o={o} i={i} total={activeOrdList.length} />)}</tbody></table>
                            </div>
                          </div>
                        )}
                        {(orderFilter === 'all' || orderFilter === 'delivered') && completedOrdList.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3"><span className="text-sm font-bold text-stone-700">Completed Orders</span><span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">{completedOrdList.length}</span></div>
                            <div className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-x-auto">
                              <table className="w-full text-sm"><thead><TableHeaders teal /></thead><tbody>{completedOrdList.map((o, i) => <OrderRow key={o.id} o={o} i={i} total={completedOrdList.length} />)}</tbody></table>
                            </div>
                          </div>
                        )}
                        {filtered.length === 0 && <div className="bg-white rounded-2xl p-12 text-center text-stone-400 border border-stone-100">No orders match your filter.</div>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ═══ DELIVERY TAB ═══ */}
            {activeTab === 'delivery' && (() => {
              const DeliveryCard = ({ o }) => {
                const [courierName,  setCourierName]  = React.useState(o.courier_name  || '');
                const [deliveryType, setDeliveryType] = React.useState(o.delivery_type || 'delivery');
                const [trackingId,   setTrackingId]   = React.useState(o.tracking_id   || '');
                const [saving,       setSaving]       = React.useState(false);
                const [saved,        setSaved]        = React.useState(false);
                const isUpdating = updatingId === o.id;

                const handleSaveDelivery = async () => {
                  setSaving(true); setSaved(false);
                  try {
                    await supabase.from('orders').update({
                      courier_name:  courierName.trim()  || null,
                      delivery_type: deliveryType,
                      tracking_id:   trackingId.trim()   || null,
                    }).eq('id', o.id);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  } catch (err) {
                    alert('Failed to save: ' + err.message);
                  } finally {
                    setSaving(false);
                  }
                };

                return (
                  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-stone-900 font-mono text-sm">{o.order_number || formatOrderId(o.id)}</span>
                        <span className="text-xs text-stone-400 ml-2">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH') : ''}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor(o.status)}`}>{o.status}</span>
                    </div>

                    <div className="space-y-2 mb-4 border-t border-stone-50 pt-3">
                      {[{ icon: User, label: 'Customer', value: o.customer_name }, { icon: Phone, label: 'Phone', value: o.customer_phone }, { icon: MapPin, label: 'Address', value: o.customer_address }, { icon: Mail, label: 'Email', value: o.customer_email }].map(({ icon: Icon, label, value }) => value ? (
                        <div key={label} className="flex items-start gap-2.5">
                          <Icon size={14} className="text-stone-400 mt-0.5 shrink-0" />
                          <div><div className="text-xs text-stone-400">{label}</div><div className="text-sm font-medium text-stone-800 leading-tight">{value}</div></div>
                        </div>
                      ) : null)}
                    </div>

                    <div className="border-t border-stone-100 pt-3 space-y-3">
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Delivery Details</p>

                      <div className="flex rounded-xl border border-stone-200 overflow-hidden">
                        {['pickup', 'delivery'].map(type => (
                          <button key={type} onClick={() => setDeliveryType(type)}
                            className={`flex-1 py-2 text-xs font-semibold capitalize transition-all ${deliveryType === type ? 'bg-teal-600 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}>
                            {type === 'pickup' ? '🏪 Pick Up' : '🚚 Delivery'}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="block text-xs text-stone-500 mb-1 font-medium">
                          {deliveryType === 'pickup' ? 'Staff who prepared order' : 'Courier / Rider name'}
                        </label>
                        <input type="text" value={courierName} onChange={e => setCourierName(e.target.value)}
                          placeholder={deliveryType === 'pickup' ? 'e.g. Ate Mary' : 'e.g. Juan dela Cruz'}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
                      </div>

                      {deliveryType === 'delivery' && (
                        <div>
                          <label className="block text-xs text-stone-500 mb-1 font-medium">Tracking ID <span className="text-stone-300">(Lalamove, J&T, etc.)</span></label>
                          <input type="text" value={trackingId} onChange={e => setTrackingId(e.target.value)}
                            placeholder="e.g. LLM-123456789"
                            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono" />
                        </div>
                      )}

                      <button onClick={handleSaveDelivery} disabled={saving}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${saved ? 'bg-teal-500 text-white' : 'bg-stone-800 hover:bg-stone-700 text-white disabled:opacity-60'}`}>
                        {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                         : saved ? <><CheckCircle2 size={13} /> Saved!</>
                         : <><Save size={13} /> Save Delivery Info</>}
                      </button>

                      <div>
                        <p className="text-xs text-stone-500 mb-1.5 font-medium">Order Status</p>
                        <select value={o.status} disabled={isUpdating}
                          onChange={async e => { setUpdatingId(o.id); try { await updateOrderStatus(o.id, e.target.value); } catch (err) { alert(err.message); } finally { setUpdatingId(null); } }}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none capitalize">
                          {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <div>
                  <div className="mb-5">
                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Delivery Management</h2>
                    <p className="text-stone-500 text-sm mt-1">Assign couriers, set pickup or delivery, and add tracking IDs</p>
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
                      {DELIVERY_STATUSES.filter(s => s !== 'order placed').map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
                      {filteredDeliveries.map(o => <DeliveryCard key={o.id} o={o} />)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ═══ INVENTORY TAB ═══ */}
            {activeTab === 'inventory' && (
              <div>
                <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Inventory</h2>
                    <p className="text-stone-500 text-sm mt-1">Track, edit, and manage stock levels</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={exportCsv}
                      className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-colors">
                      <FileDown size={14} /> Export CSV
                    </button>
                    <button onClick={() => csvInputRef.current?.click()} disabled={importingCsv}
                      className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 bg-white text-stone-700 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-colors disabled:opacity-60">
                      {importingCsv ? <><Loader2 size={13} className="animate-spin" /> Importing…</> : <><FileUp size={14} /> Import CSV</>}
                    </button>
                    <input ref={csvInputRef} type="file" accept=".csv" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) importCsv(e.target.files[0]); }} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Total Items',      value: inventory.reduce((s, i) => s + i.qty, 0), icon: Package,       iconColor: 'text-blue-500',  iconBg: 'bg-blue-50'  },
                    { label: 'Products Tracked', value: inventory.length,                          icon: Archive,       iconColor: 'text-teal-600',  iconBg: 'bg-teal-50'  },
                    { label: 'Low Stock Alerts', value: lowStockCount,                             icon: AlertTriangle, iconColor: 'text-red-500',   iconBg: 'bg-red-50'   },
                  ].map(({ label, value, icon: Icon, iconColor, iconBg }) => (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-center gap-3">
                      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}><Icon size={18} className={iconColor} /></div>
                      <div><p className="text-xs text-stone-500">{label}</p><p className="text-2xl font-bold text-stone-900">{value}</p></div>
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

                <div className="mb-4 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-500">
                  💡 CSV import columns: <code className="font-mono bg-stone-100 px-1 rounded">product_name</code>, <code className="font-mono bg-stone-100 px-1 rounded">qty</code>, and optionally <code className="font-mono bg-stone-100 px-1 rounded">location</code>, <code className="font-mono bg-stone-100 px-1 rounded">low_threshold</code>
                </div>

                <div className="sm:hidden space-y-3 pb-10">
                  {filteredInventory.length === 0 ? (
                    <div className="text-center text-stone-400 py-10 text-sm">{inventory.length === 0 ? 'No inventory yet.' : 'No items match.'}</div>
                  ) : filteredInventory.map(item => {
                    const isEditing = editingInvId === item.id;
                    const isLow = item.qty <= (item.low_threshold ?? 10);
                    return (
                      <div key={item.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${isEditing ? 'border-teal-300 ring-1 ring-teal-300' : 'border-stone-100'}`}>
                        {isEditing ? (
                          <div className="space-y-2">
                            <input value={editInvForm.product_name} onChange={e => setEditInvForm(f => ({...f, product_name: e.target.value}))}
                              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" placeholder="Product name" />
                            <input value={editInvForm.location} onChange={e => setEditInvForm(f => ({...f, location: e.target.value}))}
                              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" placeholder="Location (e.g. Shelf A)" />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-stone-400 mb-1 block">Qty</label>
                                <input type="number" min="0" value={editInvForm.qty} onChange={e => setEditInvForm(f => ({...f, qty: e.target.value}))}
                                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                              </div>
                              <div>
                                <label className="text-xs text-stone-400 mb-1 block">Low threshold</label>
                                <input type="number" min="0" value={editInvForm.low_threshold} onChange={e => setEditInvForm(f => ({...f, low_threshold: e.target.value}))}
                                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveEditInv(item)} disabled={savingInv}
                                className="flex-1 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-60 flex items-center justify-center gap-1">
                                {savingInv ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : <><Check size={12} /> Save</>}
                              </button>
                              <button onClick={() => setEditingInvId(null)} className="flex-1 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-semibold hover:bg-stone-50">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-semibold text-stone-800 text-sm">{item.product_name}</div>
                                <div className="text-xs text-stone-400">{item.location || 'Main Storage'}</div>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isLow ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'}`}>{isLow ? '⚠️ Low' : 'In Stock'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-2xl font-bold ${isLow ? 'text-red-600' : 'text-stone-900'}`}>{item.qty} <span className="text-sm font-normal text-stone-400">units</span></span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleInventoryQtyChange(item.id, item.qty, -1)} className="w-8 h-8 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100"><Minus size={13} className="text-stone-600" /></button>
                                <button onClick={() => handleInventoryQtyChange(item.id, item.qty, 1)} className="w-8 h-8 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100"><Plus size={13} className="text-stone-600" /></button>
                                <button onClick={() => handleRestock(item.id)} className="flex items-center gap-1 bg-teal-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-700"><RefreshCw size={11} /> +50</button>
                                <button onClick={() => startEditInv(item)} className="w-8 h-8 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100"><Edit2 size={13} className="text-stone-500" /></button>
                                <button onClick={() => setDeleteInvConfirm(item)} className="w-8 h-8 border border-red-100 rounded-lg flex items-center justify-center hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="hidden sm:block bg-white rounded-2xl border border-stone-100 shadow-sm overflow-x-auto pb-10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        {['Product', 'Location', 'Qty', 'Low Threshold', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left p-4 font-semibold text-stone-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.length === 0 ? (
                        <tr><td colSpan={6} className="p-12 text-center text-stone-400 text-sm">
                          {inventory.length === 0 ? 'No inventory yet. Use "Import CSV" to add items.' : 'No items match.'}
                        </td></tr>
                      ) : filteredInventory.map((item, i) => {
                        const isEditing = editingInvId === item.id;
                        const isLow = item.qty <= (item.low_threshold ?? 10);
                        return (
                          <tr key={item.id} className={`border-b border-stone-50 transition-colors ${isEditing ? 'bg-teal-50/50' : 'hover:bg-stone-50'} ${i === filteredInventory.length - 1 ? 'border-0' : ''}`}>
                            {isEditing ? (
                              <>
                                <td className="p-3"><input value={editInvForm.product_name} onChange={e => setEditInvForm(f => ({...f, product_name: e.target.value}))} className="w-full border border-teal-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-400" /></td>
                                <td className="p-3"><input value={editInvForm.location} onChange={e => setEditInvForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Shelf A" className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-400" /></td>
                                <td className="p-3"><input type="number" min="0" value={editInvForm.qty} onChange={e => setEditInvForm(f => ({...f, qty: e.target.value}))} className="w-20 border border-stone-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-400" /></td>
                                <td className="p-3"><input type="number" min="0" value={editInvForm.low_threshold} onChange={e => setEditInvForm(f => ({...f, low_threshold: e.target.value}))} className="w-20 border border-stone-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-400" /></td>
                                <td className="p-3 text-xs text-stone-400 italic">editing…</td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => saveEditInv(item)} disabled={savingInv} className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-60">
                                      {savingInv ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                                    </button>
                                    <button onClick={() => setEditingInvId(null)} className="px-3 py-1.5 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold hover:bg-stone-50">Cancel</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-4"><div className="font-semibold text-stone-800">{item.product_name}</div><div className="text-xs text-stone-400">ID: {item.product_id}</div></td>
                                <td className="p-4 text-stone-600 text-sm">{item.location || 'Main Storage'}</td>
                                <td className="p-4"><span className={`text-xl font-bold ${isLow ? 'text-red-600' : 'text-stone-900'}`}>{item.qty}</span></td>
                                <td className="p-4 text-stone-500 text-sm">{item.low_threshold ?? 10}</td>
                                <td className="p-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isLow ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'}`}>{isLow ? 'Low Stock' : 'In Stock'}</span></td>
                                <td className="p-4">
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => handleInventoryQtyChange(item.id, item.qty, -1)} className="w-7 h-7 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100"><Minus size={12} className="text-stone-600" /></button>
                                    <button onClick={() => handleInventoryQtyChange(item.id, item.qty, 1)} className="w-7 h-7 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100"><Plus size={12} className="text-stone-600" /></button>
                                    <button onClick={() => handleRestock(item.id)} className="flex items-center gap-1 bg-teal-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-700"><RefreshCw size={11} /> +50</button>
                                    <button onClick={() => startEditInv(item)} className="w-7 h-7 border border-stone-200 rounded-lg flex items-center justify-center hover:bg-stone-100"><Edit2 size={12} className="text-stone-500" /></button>
                                    <button onClick={() => setDeleteInvConfirm(item)} className="w-7 h-7 border border-red-100 rounded-lg flex items-center justify-center hover:bg-red-50"><Trash2 size={12} className="text-red-400" /></button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {deleteInvConfirm && (
                  <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                      <h3 className="text-lg font-bold text-stone-900 mb-2">Remove Inventory Item?</h3>
                      <p className="text-sm text-stone-500 mb-6">Are you sure you want to remove <strong className="text-stone-800">{deleteInvConfirm.product_name}</strong> from inventory? This cannot be undone.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setDeleteInvConfirm(null)} className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-xl font-semibold text-sm hover:bg-stone-50">Cancel</button>
                        <button onClick={() => deleteInvItem(deleteInvConfirm)} disabled={deletingInv} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-60">
                          {deletingInv ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ── ORDER DETAILS MODAL — FIXED: shows type, color, category, engraved names ── */}
      {detailsOrder && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h4 className="text-lg font-bold text-stone-900">Order Details</h4>
                <p className="text-xs text-stone-400 font-mono mt-0.5">{detailsOrder.order_number || formatOrderId(detailsOrder.id)}</p>
              </div>
              <button onClick={() => setDetailsOrder(null)} className="p-2 hover:bg-stone-100 rounded-full"><X size={18} className="text-stone-500" /></button>
            </div>

            {/* Order meta */}
            <div className="space-y-1.5 text-sm mb-5 bg-stone-50 rounded-2xl p-4 border border-stone-100">
              {[
                { label: 'Status',   value: <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${orderStatusColor(detailsOrder.status)}`}>{detailsOrder.status}</span> },
                { label: 'Payment',  value: <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${paymentBadgeColor(detailsOrder.payment_status)}`}>{PAYMENT_LABELS[detailsOrder.payment_status] || '–'}</span> },
                { label: 'Total',    value: <span className="font-bold text-teal-600">₱{Number(detailsOrder.total || 0).toFixed(2)}</span> },
                { label: 'Placed',   value: detailsOrder.created_at ? new Date(detailsOrder.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '–' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-stone-100 last:border-0">
                  <span className="text-stone-500 text-xs font-medium">{label}</span>
                  <span className="font-medium text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Customer info */}
            <div className="mb-5">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Customer</p>
              <div className="space-y-2">
                {[
                  { icon: User,   label: 'Name',    value: detailsOrder.customer_name },
                  { icon: Mail,   label: 'Email',   value: detailsOrder.customer_email },
                  { icon: Phone,  label: 'Phone',   value: detailsOrder.customer_phone },
                  { icon: MapPin, label: 'Address', value: detailsOrder.customer_address },
                ].map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 bg-stone-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={13} className="text-stone-500" />
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">{label}</p>
                      <p className="text-sm font-medium text-stone-800 leading-tight">{value}</p>
                    </div>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Items — full detail */}
            {detailsOrder.items && detailsOrder.items.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
                  Items Ordered
                  <span className="ml-2 text-teal-600 normal-case font-semibold">({detailsOrder.items.length} {detailsOrder.items.length === 1 ? 'item' : 'items'})</span>
                </p>
                <ul className="space-y-3">
                  {detailsOrder.items.map((it, idx) => (
                    <ItemDetailRow key={idx} it={it} idx={idx} showIndex={detailsOrder.items.length > 1} />
                  ))}
                </ul>
                <div className="mt-3 flex justify-between items-center pt-3 border-t border-stone-100">
                  <span className="text-sm font-bold text-stone-700">Order Total</span>
                  <span className="text-lg font-extrabold text-teal-600">₱{Number(detailsOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            <button onClick={() => setDetailsOrder(null)} className="w-full py-2.5 bg-stone-100 text-stone-700 rounded-xl font-semibold hover:bg-stone-200 transition-colors text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};