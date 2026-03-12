import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cake, Home, Loader2, Search, ShoppingCart, Plus, Star } from "lucide-react";
import axios from "axios";
import { useCart } from "../context/CartContext";

const CATEGORIES = ["All", "Bread", "Cake", "Pastry", "Cookie", "Snack"];

function MenuPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [addedId, setAddedId] = useState(null);
    const { addToCart, totalItems } = useCart();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await axios.get("/api/listproducts");
                setProducts(Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                console.error("Error fetching products:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const filtered = products.filter((p) => {
        const matchSearch =
            (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.category || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat =
            activeCategory === "All" || p.category === activeCategory;
        return matchSearch && matchCat;
    });

    const handleAddToCart = (product) => {
        addToCart(product);
        setAddedId(product.id);
        setTimeout(() => setAddedId(null), 1200);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
            {/* Header */}
            <header className="bg-gradient-to-r from-rose-600 to-amber-500 py-4 px-4 md:px-8 shadow-lg sticky top-0 z-30">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div className="flex items-center gap-2 text-black">
                        <Cake className="h-6 w-6" />
                        <h1 className="font-serif text-xl font-bold">Sweet Dreams Bakery</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/">
                            <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-black transition-colors text-sm">
                                <Home className="h-4 w-4" /> Home
                            </button>
                        </Link>
                        <Link to="/cart">
                            <button className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-white text-rose-600 font-medium hover:bg-rose-50 transition-colors text-sm shadow">
                                <ShoppingCart className="h-4 w-4" />
                                Cart
                                {totalItems > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                        {totalItems}
                                    </span>
                                )}
                            </button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Banner */}
            <section className="bg-gradient-to-r from-rose-500 to-amber-400 py-10 px-4 text-center">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2">
                    🍞 Our Bakery Menu
                </h2>
                <p className="text-white/90 text-lg">
                    Fresh baked goods made with love every day
                </p>
            </section>

            <main className="mx-auto max-w-6xl py-8 px-4 md:px-8">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Search items..."
                            className="w-full rounded-full border border-gray-300 pl-9 pr-4 py-2 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === cat
                                        ? "bg-rose-500 text-white shadow-md"
                                        : "bg-white text-gray-600 border border-gray-300 hover:border-rose-400"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                        <span className="ml-2 text-rose-600 text-lg">Loading menu...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-lg">
                        No items found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map((product) => (
                            <div
                                key={product.id}
                                className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                            >
                                <div className="relative h-44 overflow-hidden">
                                    <img
                                        src={product.image || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80"}
                                        alt={product.name}
                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <span className="absolute top-2 left-2 bg-white/90 text-rose-600 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                                        {product.category}
                                    </span>
                                    {product.stock < 10 && (
                                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                                            Low Stock
                                        </span>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="font-serif text-lg font-semibold text-gray-800 leading-tight">
                                        {product.name}
                                    </h3>
                                    <div className="flex items-center gap-1 mt-1 mb-3">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                        ))}
                                        <span className="text-xs text-gray-500 ml-1">(4.8)</span>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between">
                                        <span className="text-xl font-bold text-rose-600">₹{product.price}</span>
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            disabled={product.stock === 0}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${addedId === product.id
                                                    ? "bg-green-500 text-white scale-95"
                                                    : product.stock === 0
                                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                        : "bg-rose-500 text-white hover:bg-rose-600 hover:shadow-md active:scale-95"
                                                }`}
                                        >
                                            <Plus className="h-4 w-4" />
                                            {addedId === product.id ? "Added!" : product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer className="bg-rose-700 py-6 px-4 text-center text-white/80 mt-10">
                <p>© 2024 Sweet Dreams Bakery. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default MenuPage;
