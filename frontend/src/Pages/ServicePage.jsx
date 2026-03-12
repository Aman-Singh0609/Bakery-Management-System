import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cake, Home, Loader2, Plus, Search } from 'lucide-react';
import ProductForm from "../components/ProductForm";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import axios from "axios";

function ServicePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [toast, setToast] = useState(null);

  // Toast function
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/listproducts');
      console.log("Fetched response:", response.data);

      // Handle various possible structures
      if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else if (Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else {
        console.warn("Unexpected data structure:", response.data);
        setProducts([]);
      }

    } catch (error) {
      console.error("Error fetching products:", error);
      showToast("Failed to fetch products. Please try again.", "error");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Add product
  const addProduct = async (product) => {
    try {
      // Send POST request to backend with the full product object
      const response = await axios.post('/api/addproduct', product);

      // Assuming backend returns the saved product with ID
      const savedProduct = response.data;

      setProducts([...products, savedProduct]);
      setShowAddForm(false);
      showToast("Product added successfully!");
    } catch (error) {
      console.error("Error adding product:", error);
      showToast("Failed to add product. Please try again.", "error");
    }
  };


  // Update product
  const updateProduct = async (updatedProduct) => {
    try {
      // Send the updated product data to the backend
      const response = await axios.put(`/api/updateproduct/${updatedProduct.id}`, updatedProduct);

      // Assuming the backend returns the updated product
      const updatedProductFromDB = response.data;

      // Update local state with the updated product
      setProducts(products.map((p) => (p.id === updatedProductFromDB.id ? updatedProductFromDB : p)));

      setEditingProduct(null);
      showToast("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      showToast("Failed to update product. Please try again.", "error");
    }
  };

  // Delete product
  const confirmDelete = async () => {
    if (!deleteProduct) return;

    try {
      // Send DELETE request to the backend to remove the product
      const response = await axios.delete(`/api/deleteproduct/${deleteProduct.id}`);

      // Filter out the deleted product from the local state
      setProducts(products.filter((p) => p.id !== deleteProduct.id));
      setDeleteProduct(null); // Close the delete confirmation dialog

      showToast("Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error);
      showToast("Failed to delete product. Please try again.", "error");
    }
  };


  // Filter products
  const filteredProducts = products.filter((product) => {
    const name = (product.name || "").toLowerCase();
    const category = (product.category || "").toLowerCase();
    return (
      name.includes(searchQuery.toLowerCase()) ||
      category.includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-600 to-amber-500 py-4 px-4 text-black md:px-8 shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Cake className="h-6 w-6" />
            <h1 className="font-serif text-xl font-bold">Sweet Dreams Bakery</h1>
          </div>
          <Link to="/">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <Home className="h-4 w-4" /> Back to Home
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl py-8 px-4 md:px-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-rose-600">Inventory Management</h1>
          <p className="mt-2 text-amber-700">Manage your bakery products and stock levels</p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search products..."
              className="w-full rounded-full border border-gray-300 pl-8 pr-4 py-2 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-6 py-2 bg-pink-200 text-black rounded-full font-medium hover:bg-pink-500 transition-colors"

          >
            <Plus className="h-4 w-4 text-black" /> Add New Product
          </button>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            <span className="ml-2 text-rose-600">Loading products...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full h-24 flex items-center justify-center text-gray-500">
                No products found.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                  <div className="h-48 overflow-hidden">
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-serif text-xl font-semibold text-rose-600">{product.name}</h3>
                        <p className="text-amber-700">{product.category}</p>
                      </div>
                      <div className="text-xl font-bold text-rose-500">₹{product.price}</div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${product.stock < 10
                            ? "bg-red-100 text-red-800"
                            : product.stock < 20
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                      >
                        Stock: {product.stock}
                      </span>

                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 border border-rose-200 text-rose-600 rounded-full hover:bg-rose-50"
                          onClick={() => setEditingProduct(product)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 border border-red-200 text-red-500 rounded-full hover:bg-red-50"
                          onClick={() => setDeleteProduct(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${toast.type === "error" ? "bg-red-500" : "bg-green-500"
              } text-white`}
          >
            {toast.message}
          </div>
        )}

        {/* Add/Edit Product Form */}
        {(showAddForm || editingProduct) && (
          <ProductForm
            product={editingProduct}
            onSubmit={editingProduct ? updateProduct : addProduct}
            onCancel={() => {
              setShowAddForm(false);
              setEditingProduct(null);
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {deleteProduct && (
          <DeleteConfirmDialog
            productName={deleteProduct.name}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteProduct(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-rose-900 py-4 px-4 text-center text-black/80 md:px-8">
        <p>© 2023 Sweet Dreams Bakery. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default ServicePage;
