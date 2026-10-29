import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../../components/Modal';
import ProductImage from '../../components/ProductImage';
import { apiErrorMessage, apiFieldErrors } from '../../lib/api';
import { ErrorNote } from '../../components/Feedback';

export default function ProductForm({ product, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? categories[0]?.name ?? '',
    price: product?.price?.toString() ?? '',
    stock: product?.stock?.toString() ?? '0',
    image: product?.image ?? '',
    active: product?.active ?? true,
    featured: product?.featured ?? false,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter a product name';
    if (!(Number(form.price) > 0)) next.price = 'Enter a price above 0';
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) next.stock = 'Enter a whole number, 0 or more';
    if (form.image && !/^https?:\/\/\S+$/i.test(form.image.trim())) next.image = 'Use a link starting with https://';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setError('');
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        price: Number(form.price),
        stock: Number(form.stock),
        image: form.image.trim() || null,
        active: form.active,
        featured: form.featured,
      });
    } catch (err) {
      setErrors(apiFieldErrors(err));
      setError(apiErrorMessage(err, 'Could not save the product.'));
      setSaving(false);
    }
  };

  return (
    <Modal title={product ? `Edit ${product.name}` : 'Add a product'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block">
          <span className="field-label">Name</span>
          <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} />
          {errors.name && <span className="field-error block">{errors.name}</span>}
        </label>
        <label className="block">
          <span className="field-label">Description</span>
          <textarea rows={2} className="input" value={form.description} onChange={set('description')} placeholder="One or two lines customers will see on the menu" />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-3 block sm:col-span-1">
            <span className="field-label">Category</span>
            <input className="input" list="category-options" value={form.category} onChange={set('category')} />
            <datalist id="category-options">
              {categories.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </label>
          <label className="block">
            <span className="field-label">Price (₹)</span>
            <input className={`input ${errors.price ? 'input-error' : ''}`} inputMode="decimal" value={form.price} onChange={set('price')} />
            {errors.price && <span className="field-error block">{errors.price}</span>}
          </label>
          <label className="block">
            <span className="field-label">In stock</span>
            <input className={`input ${errors.stock ? 'input-error' : ''}`} inputMode="numeric" value={form.stock} onChange={set('stock')} />
            {errors.stock && <span className="field-error block">{errors.stock}</span>}
          </label>
        </div>
        <div className="flex gap-3">
          <ProductImage src={form.image || null} alt="Preview" category={form.category} className="h-16 w-16 shrink-0 rounded-xl" iconClass="h-6 w-6" />
          <label className="block flex-1">
            <span className="field-label">Photo link</span>
            <input className={`input ${errors.image ? 'input-error' : ''}`} value={form.image} onChange={set('image')} placeholder="https://…" />
            {errors.image ? <span className="field-error block">{errors.image}</span> : <span className="field-hint block">Leave empty to show a simple illustration</span>}
          </label>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-berry" checked={form.active} onChange={set('active')} />
            Show on the menu
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-berry" checked={form.featured} onChange={set('featured')} />
            Feature on the home page
          </label>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {product ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
