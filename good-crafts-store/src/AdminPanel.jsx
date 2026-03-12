import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Trash2, ChevronLeft, ChevronRight, Edit2, Save,
  LayoutDashboard, Package, Check, AlertCircle, Upload,
  Image as ImageIcon, Loader2, GripVertical
} from 'lucide-react';
import { useProducts } from './ProductContext';
import { supabase } from './supabaseClient';

// ─── Supabase Storage bucket name ─────────────────────────────────────────────
const BUCKET = 'product-images';

// Shared category list — single source of truth
const CATEGORIES = [
  { key: 'Leather',    emoji: '🪡', label: 'Leather Goods' },
  { key: 'Keychains',  emoji: '🔑', label: 'Keychains & Pins' },
  { key: 'Magnets',    emoji: '🧲', label: 'Magnets' },
  { key: 'Stationery', emoji: '✏️', label: 'Stationery' },
  { key: 'Novelty',    emoji: '🎁', label: 'Novelty' },
];

const categoryLabel = (key) => {
  const c = CATEGORIES.find(c => c.key === key);
  return c ? `${c.emoji} ${c.label}` : key || '—';
};

// ─── Upload a single File object to Supabase Storage ──────────────────────────
async function uploadFile(file, productName) {
  console.log('[Upload] Starting upload:', file.name, file.type, file.size);
  const ext  = file.name.split('.').pop().toLowerCase();
  const safe = productName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
  const path = `${safe}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  console.log('[Upload] Path:', path, '| Bucket:', BUCKET);

  const { data: uploadData, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

  if (error) {
    console.error('[Upload] FAILED:', JSON.stringify(error, null, 2));
    throw new Error(error.message || error.error || JSON.stringify(error));
  }

  console.log('[Upload] Success:', uploadData);

  // Try getPublicUrl first
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  console.log('[Upload] urlData:', urlData);

  // If getPublicUrl fails, build the URL manually from supabase client
  const publicUrl = urlData?.publicUrl
    || `${supabase.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

  console.log('[Upload] Final public URL:', publicUrl);
  return publicUrl;
}

// ─── Image Slider ─────────────────────────────────────────────────────────────
const ImageSlider = ({ images = [], productName = '', height = 'h-44' }) => {
  const [idx, setIdx] = useState(0);
  const imgs = images.filter(Boolean);

  useEffect(() => { setIdx(0); }, [imgs.length, imgs[0]]);

  if (imgs.length === 0) {
    return (
      <div className={`w-full ${height} bg-stone-100 rounded-xl flex flex-col items-center justify-center text-stone-300 gap-2`}>
        <ImageIcon size={32} />
        <span className="text-xs text-stone-400">No images yet</span>
      </div>
    );
  }

  const prev = (e) => { e.stopPropagation(); setIdx(i => (i - 1 + imgs.length) % imgs.length); };
  const next = (e) => { e.stopPropagation(); setIdx(i => (i + 1) % imgs.length); };

  return (
    <div className={`relative w-full ${height} bg-stone-100 rounded-xl overflow-hidden group select-none`}>
      <img
        key={idx}
        src={imgs[idx]}
        alt={`${productName} ${idx + 1}`}
        className="w-full h-full object-cover"
      />
      {imgs.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow z-10">
            <ChevronLeft size={15} />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow z-10">
            <ChevronRight size={15} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {imgs.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
                className={`rounded-full transition-all duration-200 ${i === idx ? 'bg-white w-4 h-1.5' : 'bg-white/50 w-1.5 h-1.5 hover:bg-white/80'}`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 bg-black/55 text-white text-xs font-medium px-2 py-0.5 rounded-full z-10">
            {idx + 1} / {imgs.length}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Image Upload Zone ─────────────────────────────────────────────────────────
const ImageUploadZone = ({ images, onChange, productName }) => {
  const inputRef  = useRef(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [uploading, setUploading]       = useState([]);
  const [error, setError]               = useState('');

  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSizeMB     = 5;

  const processFiles = async (files) => {
    const fileArray = Array.from(files);
    const validationErrors = [];

    const valid = fileArray.filter(f => {
      if (!acceptedTypes.includes(f.type)) {
        validationErrors.push(`${f.name}: Only JPG, PNG, WEBP, GIF allowed.`);
        return false;
      }
      if (f.size > maxSizeMB * 1024 * 1024) {
        validationErrors.push(`${f.name}: Max file size is ${maxSizeMB}MB.`);
        return false;
      }
      return true;
    });

    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    if (valid.length === 0) {
      setError('No valid files to upload.');
      return;
    }

    setError('');

    const placeholders = valid.map((_, i) => `__uploading__${Date.now()}_${i}`);
    onChange(prev => [...(Array.isArray(prev) ? prev : []), ...placeholders]);
    setUploading(placeholders);

    try {
      console.log('[Upload] Uploading', valid.length, 'file(s)...');
      const urls = await Promise.all(valid.map(f => uploadFile(f, productName || 'product')));
      console.log('[Upload] All URLs:', urls);
      onChange(prev => {
        const next = [...prev];
        placeholders.forEach((ph, i) => {
          const pi = next.indexOf(ph);
          if (pi !== -1) next[pi] = urls[i];
        });
        return next;
      });
      setError('');
    } catch (err) {
      console.error('[Upload] processFiles error:', err);
      setError('Upload failed: ' + (err.message || 'Unknown error'));
      onChange(prev => prev.filter(u => !placeholders.includes(u)));
    } finally {
      setUploading([]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDraggingOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const moveImage = (from, to) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const isUploading = uploading.length > 0;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          draggingOver
            ? 'border-teal-500 bg-teal-50'
            : 'border-stone-200 hover:border-teal-400 hover:bg-stone-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-teal-600">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm font-semibold">Uploading {uploading.length} image{uploading.length > 1 ? 's' : ''}…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-stone-400">
            <Upload size={28} className={draggingOver ? 'text-teal-500' : ''} />
            <p className="text-sm font-semibold text-stone-600">
              {draggingOver ? 'Drop images here' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-xs text-stone-400">JPG, PNG, WEBP, GIF · Max {maxSizeMB}MB each · Multiple allowed</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl flex items-start gap-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => {
            const isLoading = url.startsWith('__uploading__');
            return (
              <div key={url} className="relative group rounded-xl overflow-hidden bg-stone-100 aspect-square border border-stone-200">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-teal-500" />
                  </div>
                ) : (
                  <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                )}

                {i === 0 && !isLoading && (
                  <div className="absolute top-1 left-1 bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    Main
                  </div>
                )}

                {!isLoading && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                    {i > 0 && (
                      <button
                        title="Move left"
                        onClick={() => moveImage(i, i - 1)}
                        className="bg-white/90 hover:bg-white text-stone-700 rounded-full p-1 transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                    <button
                      title="Remove image"
                      onClick={() => removeImage(i)}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {i < images.length - 1 && (
                      <button
                        title="Move right"
                        onClick={() => moveImage(i, i + 1)}
                        className="bg-white/90 hover:bg-white text-stone-700 rounded-full p-1 transition-colors"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                )}

                {!isLoading && images.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {i + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {images.filter(u => !u.startsWith('__uploading__')).length > 1 && (
        <p className="text-xs text-stone-400 text-center">Hover a photo to reorder ← → or remove it. First image is the main display photo.</p>
      )}
    </div>
  );
};

// ─── Variants Editor ─────────────────────────────────────────────────────────
const VariantsEditor = ({ variants, onChange }) => {
  const addVariant = () => {
    const newVariant = { id: `v_${Date.now()}`, name: '', priceMod: 0 };
    onChange([...variants, newVariant]);
  };

  const updateVariant = (idx, field, value) => {
    const updated = variants.map((v, i) =>
      i === idx ? { ...v, [field]: field === 'priceMod' ? Number(value) : value } : v
    );
    onChange(updated);
  };

  const removeVariant = (idx) => {
    onChange(variants.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {variants.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          ⚠️ No types added yet. Customers won't see any options to select.
        </p>
      )}

      {variants.map((v, i) => (
        <div key={v.id || i} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
          {/* Type name */}
          <input
            type="text"
            value={v.name}
            onChange={e => updateVariant(i, 'name', e.target.value)}
            placeholder="e.g. Plain (No Name)"
            className="flex-1 bg-transparent text-sm outline-none text-stone-700 placeholder:text-stone-300"
          />
          {/* Price modifier */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-stone-400">+₱</span>
            <input
              type="number"
              min="0"
              step="1"
              value={v.priceMod}
              onChange={e => updateVariant(i, 'priceMod', e.target.value)}
              className="w-16 bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>
          {/* Remove */}
          <button
            onClick={() => removeVariant(i)}
            className="text-stone-300 hover:text-red-500 transition-colors shrink-0"
            title="Remove type"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        onClick={addVariant}
        className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-teal-300 text-teal-600 rounded-xl text-xs font-semibold hover:bg-teal-50 transition-colors"
      >
        <Plus size={13} /> Add Type
      </button>

      {variants.length > 0 && (
        <p className="text-xs text-stone-400">
          Set price modifier to <strong>0</strong> for included types (e.g. "Plain"). First type is selected by default.
        </p>
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
      if (raw.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.join(', ') : raw;
        } catch { return raw; }
      }
      return raw;
    })(),
    category:    product.category || '',
    imageUrls: (() => {
      let urls = product.image_urls;
      if (typeof urls === 'string') {
        try { urls = JSON.parse(urls); } catch { urls = null; }
      }
      if (Array.isArray(urls) && urls.length > 0) return urls;
      if (product.image_url) return [product.image_url];
      return [];
    })(),
    variants: (() => {
      let v = product.variants;
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = null; } }
      if (Array.isArray(v) && v.length > 0) return v;
      return [];
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
    setSaving(true);
    setError('');
    try {
      const imageUrls = form.imageUrls.filter(u => u && !u.startsWith('__uploading__'));
      console.log('[Save] imageUrls to save:', imageUrls);
      const updatePayload = {
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
      };
      console.log('[Save] Payload:', updatePayload);

      const { data, error: supaErr } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', product.id)
        .select()
        .single();

      if (supaErr) {
        console.error('[Save] Supabase error:', JSON.stringify(supaErr, null, 2));
        throw new Error(
          supaErr.message
            ? `DB error: ${supaErr.message}${supaErr.details ? ` — ${supaErr.details}` : ''}`
            : JSON.stringify(supaErr)
        );
      }

      console.log('[Save] Saved successfully:', data);
      setSaved(true);
      setTimeout(() => onSaved(data), 600);
    } catch (err) {
      console.error('[Save] handleSave error:', err);
      setError(err.message || 'Failed to save. Please try again.');
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
          <button onClick={onClose} className="p-1.5 hover:bg-teal-600 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle size={15} /> {error}
            </div>
          )}

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
            <input value={form.colors} onChange={e => setField('colors', e.target.value)}
              placeholder="e.g. Tan, Red, Navy Blue, Black"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            >
              <option value="">— Select a category —</option>
              {CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Product Types <span className="text-stone-400 normal-case font-normal ml-1">(shown as "Select Type" on product page)</span>
              <span className="ml-1 text-stone-400 normal-case font-normal">— {form.variants.length} type{form.variants.length !== 1 ? 's' : ''}</span>
            </label>
            <VariantsEditor
              variants={form.variants}
              onChange={v => setField('variants', v)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Product Photos
              <span className="ml-1 text-stone-400 normal-case font-normal">
                ({form.imageUrls.filter(u => !u.startsWith('__uploading__')).length} uploaded)
              </span>
            </label>
            <ImageUploadZone
              images={form.imageUrls}
              onChange={newVal => {
                if (typeof newVal === 'function') {
                  setForm(f => ({ ...f, imageUrls: newVal(f.imageUrls) }));
                } else {
                  setField('imageUrls', newVal);
                }
              }}
              productName={form.name}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 border-t border-stone-100 pt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || saved || hasUploading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              saved ? 'bg-teal-500 text-white'
              : hasUploading ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60'
            }`}>
            {saving ? (
              <><Loader2 size={15} className="animate-spin" /> Saving…</>
            ) : saved ? (
              <><Check size={15} /> Saved!</>
            ) : hasUploading ? (
              <><Loader2 size={15} className="animate-spin" /> Uploading…</>
            ) : (
              <><Save size={15} /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add Product Modal ────────────────────────────────────────────────────────
const AddProductModal = ({ onClose, onAdded }) => {
  const [form, setForm] = useState({
    name: '', description: '', basePrice: '', minOrder: 1, colors: '', category: '', imageUrls: [], variants: [],
  });
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
      console.log('[AddProduct] imageUrls:', imageUrls);
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim(),
        basePrice:   Number(form.basePrice),
        minOrder:    Number(form.minOrder) || 1,
        colors:      form.colors.split(',').map(c => c.trim()).filter(Boolean).join(', '),
        image_url:   imageUrls[0] || null,
        image_urls:  imageUrls.length > 0 ? imageUrls : null,
        category:    form.category || null,
        variants:    form.variants.length > 0 ? form.variants : null,
      };
      console.log('[AddProduct] Payload:', payload);

      const { data, error: supaErr } = await supabase
        .from('products')
        .insert([payload])
        .select()
        .single();

      if (supaErr) {
        console.error('[AddProduct] Supabase error:', JSON.stringify(supaErr, null, 2));
        throw new Error(
          supaErr.message
            ? `DB error: ${supaErr.message}${supaErr.details ? ` — ${supaErr.details}` : ''}`
            : JSON.stringify(supaErr)
        );
      }

      console.log('[AddProduct] Added successfully:', data);
      onAdded(data);
    } catch (err) {
      console.error('[AddProduct] handleAdd error:', err);
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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Product Name *</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)}
              placeholder="e.g. Leather Keyholder"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3}
              placeholder="Brief description of the product…"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Base Price (₱) *</label>
              <input type="number" min="0" step="0.01" value={form.basePrice} onChange={e => setField('basePrice', e.target.value)}
                placeholder="0.00"
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
            <input value={form.colors} onChange={e => setField('colors', e.target.value)}
              placeholder="e.g. Tan, Red, Navy Blue, Black"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            >
              <option value="">— Select a category —</option>
              {CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Product Types <span className="text-stone-400 normal-case font-normal ml-1">(shown as "Select Type" on product page)</span>
              <span className="ml-1 text-stone-400 normal-case font-normal">— {form.variants.length} type{form.variants.length !== 1 ? 's' : ''}</span>
            </label>
            <VariantsEditor
              variants={form.variants}
              onChange={v => setField('variants', v)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Product Photos
              <span className="ml-1 text-stone-400 normal-case font-normal">
                ({form.imageUrls.filter(u => !u.startsWith('__uploading__')).length} uploaded)
              </span>
            </label>
            <ImageUploadZone
              images={form.imageUrls}
              onChange={newVal => {
                if (typeof newVal === 'function') {
                  setForm(f => ({ ...f, imageUrls: newVal(f.imageUrls) }));
                } else {
                  setField('imageUrls', newVal);
                }
              }}
              productName={form.name || 'product'}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 border-t border-stone-100 pt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors">
            Cancel
          </button>
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

// ─── Admin Panel ──────────────────────────────────────────────────────────────
export const AdminPanel = ({ onClose, onOpenDashboard }) => {
  const { products, fetchProducts } = useProducts();
  const [editingProduct, setEditingProduct] = useState(null);
  const [addingProduct,  setAddingProduct]  = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const [deleting,       setDeleting]       = useState(false);
  const [search,         setSearch]         = useState('');
  const [localProducts,  setLocalProducts]  = useState(null);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);

  const handleCategoryChange = async (product, newCategory) => {
    setUpdatingCategoryId(product.id);
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ category: newCategory || null })
        .eq('id', product.id)
        .select()
        .single();
      if (error) throw error;
      setLocalProducts(prev => (prev ?? products).map(p => p.id === data.id ? { ...p, ...data } : p));
    } catch (err) {
      alert('Failed to update category: ' + err.message);
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  useEffect(() => { setLocalProducts(products); }, [products]);

  const displayed = (localProducts ?? products).filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (product) => {
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

  const getImages = (p) => {
    let urls = p.image_urls;
    if (typeof urls === 'string') { try { urls = JSON.parse(urls); } catch { urls = null; } }
    if (Array.isArray(urls) && urls.length > 0) return urls;
    if (p.image_url) return [p.image_url];
    return [];
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="bg-stone-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Package size={20} /> Product Manager</h2>
              <p className="text-stone-400 text-xs mt-0.5">{(localProducts ?? products).length} products in store</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAddingProduct(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-lg transition-colors">
                <Plus size={15} /> Add Product
              </button>
              <button onClick={onOpenDashboard}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors">
                <LayoutDashboard size={15} /> Dashboard
              </button>
              <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-stone-100 shrink-0">
            <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-stone-50" />
          </div>

          {/* Product List */}
          <div className="flex-1 overflow-y-auto p-6">
            {displayed.length === 0 ? (
              <div className="text-center text-stone-400 py-12">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="mb-4">No products yet.</p>
                <button onClick={() => setAddingProduct(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
                  <Plus size={15} /> Add First Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayed.map(product => {
                  const images = getImages(product);
                  return (
                    <div key={product.id} className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <ImageSlider images={images} productName={product.name} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold text-stone-800 text-sm leading-tight">{product.name}</h3>
                          <span className="font-bold text-teal-600 text-sm shrink-0">₱{Number(product.basePrice || 0).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-stone-400 line-clamp-2 mb-2">{product.description}</p>
                        {/* Quick category selector */}
                        <div className="mb-2">
                          <select
                            value={product.category || ''}
                            disabled={updatingCategoryId === product.id}
                            onChange={e => handleCategoryChange(product, e.target.value)}
                            className={`w-full text-xs border rounded-lg px-2 py-1.5 outline-none transition-all ${
                              product.category
                                ? 'border-teal-200 bg-teal-50 text-teal-700 font-semibold focus:ring-2 focus:ring-teal-400'
                                : 'border-amber-200 bg-amber-50 text-amber-600 font-semibold focus:ring-2 focus:ring-amber-400'
                            } ${updatingCategoryId === product.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                          >
                            <option value="">⚠️ No category set</option>
                            {CATEGORIES.map(c => (
                              <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                            ))}
                          </select>
                          {updatingCategoryId === product.id && (
                            <p className="text-xs text-teal-500 mt-0.5 flex items-center gap-1">
                              <span className="animate-spin inline-block w-3 h-3 border border-teal-400 border-t-transparent rounded-full" />
                              Saving…
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-stone-400">
                          <span>Min: {product.minOrder || 1}pcs</span>
                          {images.length > 1 && (
                            <span className="text-teal-600 font-medium flex items-center gap-1">
                              <ImageIcon size={11} /> {images.length} photos
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
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
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={(freshData) => {
            setLocalProducts(prev => (prev ?? products).map(p => p.id === freshData.id ? { ...p, ...freshData } : p));
            fetchProducts();
            setEditingProduct(null);
          }}
        />
      )}

      {/* Add Modal */}
      {addingProduct && (
        <AddProductModal
          onClose={() => setAddingProduct(false)}
          onAdded={(newProduct) => {
            setLocalProducts(prev => [newProduct, ...(prev ?? products)]);
            fetchProducts();
            setAddingProduct(false);
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-stone-900 mb-2">Delete Product?</h3>
            <p className="text-sm text-stone-500 mb-6">
              Are you sure you want to delete <strong className="text-stone-800">{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-700 rounded-xl font-semibold text-sm hover:bg-stone-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};