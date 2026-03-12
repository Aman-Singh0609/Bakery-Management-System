"use client"

import { useState } from "react"
import { X } from "lucide-react"

function ProductForm({ product, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    id: product?.id || 0,
    name: product?.name || "",
    category: product?.category || "",
    price: product?.price || 0,
    stock: product?.stock || 0,
    image: product?.image || "",
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: name === "price" || name === "stock" ? Number.parseFloat(value) || 0 : value,
    })

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required"
    }

    if (!formData.category) {
      newErrors.category = "Category is required"
    }

    if (formData.price <= 0) {
      newErrors.price = "Price must be greater than 0"
    }

    if (formData.stock < 0 || !Number.isInteger(formData.stock)) {
      newErrors.stock = "Stock must be a non-negative integer"
    }

    if (formData.image && !/^https?:\/\/\S+\.\S+$/.test(formData.image)) {
      newErrors.image = "Please enter a valid image URL"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-amber-400 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-black">{product ? "Edit Product" : "Add New Product"}</h2>
          <button onClick={onCancel} className="text-white hover:bg-white/20 p-1 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name
            </label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Sourdough Bread"
              className={`w-full rounded-lg border p-2 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 ${errors.name ? "border-red-500" : "border-gray-300"
                }`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full rounded-lg border p-2 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 ${errors.category ? "border-red-500" : "border-gray-300"
                }`}
            >
              <option value="" disabled>
                Select a category
              </option>
              <option value="Bread">Bread</option>
              <option value="Cake">Cake</option>
              <option value="Pastry">Pastry</option>
              <option value="Cookie">Cookie</option>
              <option value="Snack">Snack</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price ($)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleChange}
              placeholder="0.00"
              className={`w-full rounded-lg border p-2 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 ${errors.price ? "border-red-500" : "border-gray-300"
                }`}
            />
            {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
              Stock Quantity
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              step="1"
              value={formData.stock}
              onChange={handleChange}
              placeholder="0"
              className={`w-full rounded-lg border p-2 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 ${errors.stock ? "border-red-500" : "border-gray-300"
                }`}
            />
            {errors.stock && <p className="text-xs text-red-500">{errors.stock}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              Image URL
            </label>
            <input
              id="image"
              name="image"
              type="text"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className={`w-full rounded-lg border p-2 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 ${errors.image ? "border-red-500" : "border-gray-300"
                }`}
            />
            {errors.image && <p className="text-xs text-red-500">{errors.image}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-100 text-black rounded-lg hover:bg-rose-600">
              {product ? "Update Product" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm
