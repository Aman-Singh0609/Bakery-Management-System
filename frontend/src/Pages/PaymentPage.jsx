import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Cake, CreditCard, ShoppingBag, Check, Lock } from "lucide-react";
import axios from "axios";
import { useCart } from "../context/CartContext";

function PaymentPage() {
    const { cart, totalAmount, clearCart } = useCart();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState("card");
    const [step, setStep] = useState(1); // 1: details, 2: processing, 3: done
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        cardNumber: "",
        cardExpiry: "",
        cardCvv: "",
        upiId: "",
    });
    const [errors, setErrors] = useState({});

    if (cart.length === 0 && step !== 3) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white">
                <div className="text-center">
                    <div className="text-7xl mb-4">🛒</div>
                    <h2 className="font-serif text-2xl font-bold text-gray-700 mb-4">No items to pay for!</h2>
                    <Link to="/menu">
                        <button className="px-8 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors">
                            Go to Menu
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Name is required";
        if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Valid email required";
        if (!form.phone.match(/^\d{10}$/)) e.phone = "Valid 10-digit phone required";
        if (paymentMethod === "card") {
            if (!form.cardNumber.replace(/\s/g, "").match(/^\d{16}$/)) e.cardNumber = "Valid 16-digit card number required";
            if (!form.cardExpiry.match(/^\d{2}\/\d{2}$/)) e.cardExpiry = "Format MM/YY";
            if (!form.cardCvv.match(/^\d{3}$/)) e.cardCvv = "3-digit CVV required";
        }
        if (paymentMethod === "upi" && !form.upiId.includes("@")) e.upiId = "Valid UPI ID required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setStep(2); // processing

        const payload = {
            customer_name: form.name,
            customer_email: form.email,
            customer_phone: form.phone,
            customer_address: form.address,
            payment_method: paymentMethod,
            items: cart.map((item) => ({
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: parseFloat(item.price),
            })),
        };

        try {
            await axios.post("/api/placeorder", payload);
            // Simulate payment gateway delay
            await new Promise((r) => setTimeout(r, 2000));
            clearCart();
            setStep(3);
        } catch (err) {
            console.error("Order failed:", err);
            setStep(1);
            setErrors({ submit: "Order failed. Please try again." });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let formatted = value;
        if (name === "cardNumber") {
            formatted = value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
        }
        if (name === "cardExpiry") {
            formatted = value.replace(/\D/g, "").slice(0, 4);
            if (formatted.length >= 3) formatted = formatted.slice(0, 2) + "/" + formatted.slice(2);
        }
        if (name === "cardCvv") {
            formatted = value.replace(/\D/g, "").slice(0, 3);
        }
        setForm((prev) => ({ ...prev, [name]: formatted }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const InputField = ({ label, name, type = "text", placeholder }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 ${errors[name] ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
            />
            {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
        </div>
    );

    // Processing screen
    if (step === 2) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="w-20 h-20 rounded-full border-4 border-rose-200 border-t-rose-500 animate-spin"></div>
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-gray-700 mb-2">Processing Payment...</h2>
                    <p className="text-gray-500">Please wait while we confirm your order</p>
                </div>
            </div>
        );
    }

    // Success screen
    if (step === 3) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="font-serif text-3xl font-bold text-green-700 mb-2">Order Confirmed! 🎉</h2>
                    <p className="text-gray-500 mb-4">
                        Thank you for your order! Your fresh bakery items will be ready soon.
                    </p>
                    <div className="bg-green-50 rounded-xl p-4 mb-6 text-sm text-gray-600">
                        A confirmation has been sent to <strong>{form.email}</strong>
                    </div>
                    <Link to="/menu">
                        <button className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-full hover:shadow-lg transition-all">
                            Continue Shopping 🍞
                        </button>
                    </Link>
                    <Link to="/">
                        <button className="w-full mt-3 py-3 border border-gray-300 text-gray-600 font-medium rounded-full hover:bg-gray-50 transition-colors">
                            Back to Home
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
            {/* Header */}
            <header className="bg-gradient-to-r from-rose-600 to-amber-500 py-4 px-4 md:px-8 shadow-lg">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <div className="flex items-center gap-2 text-black">
                        <Cake className="h-6 w-6" />
                        <h1 className="font-serif text-xl font-bold">Sweet Dreams Bakery</h1>
                    </div>
                    <Link to="/cart">
                        <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-black transition-colors text-sm">
                            ← Back to Cart
                        </button>
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-5xl py-8 px-4 md:px-8">
                <h2 className="font-serif text-3xl font-bold text-rose-600 mb-8 flex items-center gap-2">
                    <Lock className="h-7 w-7" /> Secure Checkout
                </h2>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Customer Details */}
                            <div className="bg-white rounded-2xl shadow-md p-6">
                                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <ShoppingBag className="h-5 w-5 text-rose-500" /> Delivery Details
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <InputField label="Full Name *" name="name" placeholder="Amy Singh" />
                                    <InputField label="Email *" name="email" type="email" placeholder="amy@example.com" />
                                    <InputField label="Phone *" name="phone" placeholder="9876543210" />
                                    <InputField label="Delivery Address" name="address" placeholder="123, Baker Street, Mumbai" />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="bg-white rounded-2xl shadow-md p-6">
                                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-rose-500" /> Payment Method
                                </h3>
                                <div className="flex gap-3 mb-5">
                                    {["card", "upi", "cod"].map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={`flex-1 py-2.5 px-4 rounded-xl border-2 font-medium text-sm transition-all ${paymentMethod === method
                                                    ? "border-rose-500 bg-rose-50 text-rose-600"
                                                    : "border-gray-200 text-gray-600 hover:border-rose-300"
                                                }`}
                                        >
                                            {method === "card" ? "💳 Card" : method === "upi" ? "📱 UPI" : "💵 Cash on Delivery"}
                                        </button>
                                    ))}
                                </div>

                                {paymentMethod === "card" && (
                                    <div className="space-y-4">
                                        <InputField label="Card Number *" name="cardNumber" placeholder="1234 5678 9012 3456" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputField label="Expiry (MM/YY) *" name="cardExpiry" placeholder="12/27" />
                                            <InputField label="CVV *" name="cardCvv" placeholder="123" />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                            <Lock className="h-3 w-3" />
                                            Your payment info is encrypted and secure
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === "upi" && (
                                    <InputField label="UPI ID *" name="upiId" placeholder="name@upi" />
                                )}

                                {paymentMethod === "cod" && (
                                    <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
                                        💵 Pay in cash when your order arrives at your doorstep.
                                    </div>
                                )}

                                {errors.submit && (
                                    <p className="text-red-500 text-sm mt-3">{errors.submit}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold rounded-full text-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                <Lock className="h-5 w-5" />
                                Pay ₹{totalAmount.toFixed(2)} Now
                            </button>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                            <h3 className="font-serif text-lg font-bold text-gray-800 mb-4">Order Summary</h3>
                            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex gap-3 items-center">
                                        <img
                                            src={item.image || "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=80&q=80"}
                                            alt={item.name}
                                            className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm text-gray-800 leading-tight">{item.name}</p>
                                            <p className="text-xs text-gray-500">× {item.quantity}</p>
                                        </div>
                                        <p className="font-semibold text-rose-600 text-sm">
                                            ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-4 space-y-1">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal</span><span>₹{totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Delivery</span><span className="text-green-600 font-medium">FREE</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg text-gray-800 border-t pt-2 mt-2">
                                    <span>Total</span>
                                    <span className="text-rose-600">₹{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default PaymentPage;
