import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Cake, Home, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";

function CartPage() {
    const { cart, removeFromCart, updateQuantity, totalItems, totalAmount } = useCart();
    const navigate = useNavigate();

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
                <header className="bg-gradient-to-r from-rose-600 to-amber-500 py-4 px-4 md:px-8 shadow-lg">
                    <div className="mx-auto flex max-w-6xl items-center justify-between">
                        <div className="flex items-center gap-2 text-black">
                            <Cake className="h-6 w-6" />
                            <h1 className="font-serif text-xl font-bold">Sweet Dreams Bakery</h1>
                        </div>
                        <div className="flex gap-2">
                            <Link to="/">
                                <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-black transition-colors text-sm">
                                    <Home className="h-4 w-4" /> Home
                                </button>
                            </Link>
                            <Link to="/menu">
                                <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-white text-rose-600 font-medium transition-colors text-sm">
                                    Menu
                                </button>
                            </Link>
                        </div>
                    </div>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-4">
                    <div className="text-8xl">🛒</div>
                    <h2 className="font-serif text-3xl font-bold text-gray-700">Your cart is empty</h2>
                    <p className="text-gray-500 text-lg">Add some delicious items from our menu!</p>
                    <Link to="/menu">
                        <button className="mt-2 px-8 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors flex items-center gap-2">
                            Browse Menu <ArrowRight className="h-4 w-4" />
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
            {/* Header */}
            <header className="bg-gradient-to-r from-rose-600 to-amber-500 py-4 px-4 md:px-8 shadow-lg sticky top-0 z-30">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div className="flex items-center gap-2 text-black">
                        <Cake className="h-6 w-6" />
                        <h1 className="font-serif text-xl font-bold">Sweet Dreams Bakery</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/">
                            <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-black transition-colors text-sm">
                                <Home className="h-4 w-4" /> Home
                            </button>
                        </Link>
                        <Link to="/menu">
                            <button className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-white text-rose-600 font-medium hover:bg-rose-50 transition-colors text-sm shadow">
                                <ShoppingCart className="h-4 w-4" />
                                Cart
                                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {totalItems}
                                </span>
                            </button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl py-8 px-4 md:px-8">
                <h2 className="font-serif text-3xl font-bold text-rose-600 mb-6">
                    🛒 Your Cart
                </h2>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {cart.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl shadow-md p-4 flex gap-4 hover:shadow-lg transition-shadow"
                            >
                                <img
                                    src={item.image || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&q=80"}
                                    alt={item.name}
                                    className="h-24 w-24 rounded-xl object-cover flex-shrink-0"
                                />
                                <div className="flex-1 flex flex-col">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-gray-800 text-lg leading-tight">{item.name}</h3>
                                            <p className="text-sm text-gray-500">{item.category}</p>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-red-400 hover:text-red-600 transition-colors p-1"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between">
                                        <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-1">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="text-gray-600 hover:text-rose-600 transition-colors"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <span className="font-semibold text-gray-800 w-6 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="text-gray-600 hover:text-rose-600 transition-colors"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <span className="font-bold text-rose-600 text-lg">
                                            ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                            <h3 className="font-serif text-xl font-bold text-gray-800 mb-4">Order Summary</h3>
                            <div className="space-y-2 mb-4">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm text-gray-600">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span>₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-dashed border-gray-200 pt-4 mb-4">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal</span>
                                    <span>₹{totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500 mt-1">
                                    <span>Delivery</span>
                                    <span className="text-green-600 font-medium">FREE</span>
                                </div>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-gray-800 border-t pt-4 mb-6">
                                <span>Total</span>
                                <span className="text-rose-600">₹{totalAmount.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={() => navigate("/payment")}
                                className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-full hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                            >
                                Proceed to Payment <ArrowRight className="h-5 w-5" />
                            </button>
                            <Link to="/menu">
                                <button className="w-full mt-3 py-3 border border-rose-300 text-rose-500 font-medium rounded-full hover:bg-rose-50 transition-colors">
                                    Continue Shopping
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default CartPage;
