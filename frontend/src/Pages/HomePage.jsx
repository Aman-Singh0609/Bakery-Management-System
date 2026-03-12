import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import {
  ArrowRight,
  Cake,
  Coffee,
  Cookie,
  UtensilsCrossed,
} from "lucide-react";

function HomePage() {
  const { totalItems } = useCart();
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-pink-50 to-white">
      {/* Hero Section */}
      <section className="relative h-[600px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/70 to-amber-400/50 z-10" />
        <img
          src="https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"
          alt="Fresh baked goods"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 flex h-full w-full flex-col items-center justify-center px-4 text-center">
          <h1 className="font-serif text-4xl font-bold text-black md:text-6xl mt-2">
            Sweet Dreams Bakery
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-white/90 md:text-xl">
            Artisanal pastries and breads that bring joy to every bite
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link to="/menu">
              <button className="px-6 py-3 bg-white text-rose-600 rounded-full font-bold hover:bg-pink-100 transition-colors shadow-lg">
                🛒 Order Online
              </button>
            </Link>
            <Link to="/menu">
              <button className="px-6 py-3 bg-pink-100 text-black rounded-full font-medium border border-pink-300 hover:bg-pink-400 transition-colors">
                🍞 Our Menu
              </button>
            </Link>
            {totalItems > 0 && (
              <Link to="/cart">
                <button className="px-6 py-3 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-colors shadow-lg">
                  🛒 View Cart ({totalItems})
                </button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="w-full py-16 px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-bold text-rose-600 md:text-4xl">
              Our Specialties
            </h2>
            <p className="mt-2 text-amber-700">
              Discover our most loved creations
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Artisan Bread",
                description: "Crusty on the outside, soft on the inside",
                icon: <Cookie className="h-10 w-10 text-rose-500" />,
                image:
                  "https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
              },
              {
                title: "French Pastries",
                description: "Delicate, flaky, and utterly delicious",
                icon: <Cake className="h-10 w-10 text-rose-500" />,
                image:
                  "https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
              },
              {
                title: "Custom Cakes",
                description:
                  "Celebrate special moments with our custom designs",
                icon: <UtensilsCrossed className="h-10 w-10 text-rose-500" />,
                image:
                  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
              },
              {
                title: "Specialty Coffee",
                description: "The perfect companion to our baked goods",
                icon: <Coffee className="h-10 w-10 text-rose-500" />,
                image:
                  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="group overflow-hidden rounded-xl bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-rose-100 p-2">
                      {item.icon}
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-rose-600">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-amber-700">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-gradient-to-br from-amber-50 to-rose-50 py-16 px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-3xl font-bold text-rose-600 md:text-4xl">
                Our Story
              </h2>
              <p className="mt-4 text-amber-700 leading-relaxed">
                Sweet Dreams Bakery was founded with a passion for creating
                delicious, handcrafted baked goods using traditional methods and
                the finest ingredients.
              </p>
              <p className="mt-4 text-amber-700 leading-relaxed">
                Our master bakers combine time-honored techniques with
                innovative flavors to create pastries and breads that delight
                the senses and warm the soul.
              </p>
              <button className="mt-6 px-6 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors">
                Learn More About Us
              </button>
            </div>
            <div className="relative h-[400px] overflow-hidden rounded-xl shadow-xl">
              <img
                src="https://img.freepik.com/free-photo/portrait-man-working-as-baker_23-2151230009.jpg?semt=ais_hybrid&w=740"
                alt="Bakery interior"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-full py-16 px-4 md:px-8 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-bold text-rose-600 md:text-4xl">
              What Our Customers Say
            </h2>
            <p className="mt-2 text-amber-700">
              The sweet reviews from our happy customers
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Saransh",
                quote:
                  "The croissants are absolutely divine! Reminds me of the ones I had in Paris.",
                image: "https://img.freepik.com/premium-photo/face-young-handsome-indian-man_251136-20626.jpg?semt=ais_hybrid&w=740",
              },
              {
                name: "Manav",
                quote:
                  "Their sourdough bread is the best in town. I'm a regular customer and never disappointed.",
                image: "https://www.shutterstock.com/image-photo/studio-portrait-smile-indian-student-260nw-2453208639.jpg",
              },
              {
                name: "Riya",
                quote:
                  "Ordered a custom cake for my daughter's birthday. It was not only beautiful but delicious too!",
                image: "https://thumbs.dreamstime.com/b/face-young-happy-indian-businesswoman-smiling-face-young-happy-indian-businesswoman-smiling-isolated-against-white-128979240.jpg",
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="rounded-xl bg-gradient-to-br from-rose-50 to-amber-50 p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.image || "/placeholder.svg"}
                    alt={testimonial.name}
                    className="h-14 w-14 rounded-full object-cover border-2 border-rose-200"
                  />
                  <div>
                    <p className="font-semibold text-rose-600">
                      {testimonial.name}
                    </p>
                    <div className="text-amber-500">★★★★</div>
                  </div>
                </div>
                <p className="italic text-amber-700">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-rose-500 to-amber-400 py-16 px-4 md:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="font-serif text-3xl font-bold text-black md:text-4xl">
            Ready to Manage Your Inventory?
          </h2>
          <p className="mt-4 text-white/90">
            Access our service page to check stock, update products, and manage
            your bakery inventory
          </p>
          <Link to="/service">
            <button className="mt-8 px-8 py-4 bg-white text-rose-500 rounded-full font-medium hover:bg-white/90 transition-colors flex items-center mx-auto">
              Go to Service Page <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-rose-700 py-8 px-4 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-4 font-serif text-xl font-semibold">
                Sweet Dreams Bakery
              </h3>
              <p className="text-white/90">123 Flour Street</p>
              <p className="text-white/90">Bakerytown, BT 12345</p>
              <p className="text-white/90">Phone: (555) 123-4567</p>
            </div>
            <div>
              <h3 className="mb-4 font-serif text-xl font-semibold">Hours</h3>
              <p className="text-white/90">Monday - Friday: 7am - 7pm</p>
              <p className="text-white/90">Saturday: 8am - 8pm</p>
              <p className="text-white/90">Sunday: 8am - 5pm</p>
            </div>
            <div>
              <h3 className="mb-4 font-serif text-xl font-semibold">
                Connect With Us
              </h3>
              <div className="flex gap-4">
                <a href="#" className="text-blue hover:text-yellow-300">
                  Facebook
                </a>
                <a href="#" className="text-lightblue hover:text-yellow-300">
                  Instagram
                </a>
                <a href="#" className="text-lightblue hover:text-yellow-300">
                  Twitter
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-white/30 pt-6 text-center text-white/70">
            <p>© 2024 Sweet Dreams Bakery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
