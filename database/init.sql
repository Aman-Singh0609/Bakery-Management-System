-- init.sql

-- ── Products ────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL,
  image TEXT
);

INSERT INTO products (name, category, price, stock, image)
VALUES
  -- Breads
  ('Classic Sourdough', 'Bread', 120.00, 60, 'https://images.unsplash.com/photo-1585478259715-876acc6b7c37?w=600&q=80'),
  ('Whole Wheat Loaf', 'Bread', 80.00, 80, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80'),
  ('Garlic Herb Focaccia', 'Bread', 95.00, 50, 'https://images.unsplash.com/photo-1571047521944-c6194f2816b2?w=600&q=80'),
  ('Multigrain Baguette', 'Bread', 75.00, 70, 'https://images.unsplash.com/photo-1597079910443-60c43fc4a729?w=600&q=80'),
  -- Cakes
  ('Chocolate Truffle Cake', 'Cake', 350.00, 25, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80'),
  ('Honey Almond Cake', 'Cake', 280.00, 30, 'https://gingerskillet.com/wp-content/uploads/2021/02/HONEYALMONDCAKE_F.jpg'),
  ('Strawberry Shortcake', 'Cake', 320.00, 20, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80'),
  ('Fruit Cake', 'Cake', 250.00, 40, 'https://cookingfromheart.com/wp-content/uploads/2023/01/Eggless-Rum-Fruit-Cake-Recipe.jpg'),
  -- Pastries
  ('Butter Croissant', 'Pastry', 65.00, 100, 'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?w=600&q=80'),
  ('Blueberry Danish', 'Pastry', 75.00, 80, 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=600&q=80'),
  ('Cinnamon Roll', 'Pastry', 55.00, 120, 'https://images.unsplash.com/photo-1556711905-b0bda2e58d40?w=600&q=80'),
  ('Almond Croissant', 'Pastry', 80.00, 70, 'https://images.unsplash.com/photo-1568471173242-461f0a730452?w=600&q=80'),
  -- Cookies
  ('Nankhatai', 'Cookie', 50.00, 90, 'https://aromaticessence.co/wp-content/uploads/2015/06/nankhatai_featured-500x500.jpg'),
  ('Jeera Cookies', 'Cookie', 45.00, 80, 'https://m.media-amazon.com/images/I/71dnbT7RL9L._AC_UF1000,1000_QL80_.jpg'),
  ('Choco Chip Cookies', 'Cookie', 60.00, 150, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80'),
  ('Khari Biscuit', 'Cookie', 35.00, 120, 'https://www.swadishtrecipe.com/wp-content/uploads/2024/07/IMG_20240726_101657-768x432.jpg'),
  -- Snacks
  ('Veg Puff', 'Snack', 25.00, 200, 'https://easyindiancookbook.com/wp-content/uploads/2022/08/veg-puff-recipe-2.jpg'),
  ('Paneer Puff', 'Snack', 35.00, 150, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80'),
  ('Cake Rusk', 'Snack', 60.00, 60, 'https://www.generalmillsindiabfs.in/wp-content/uploads/2020/10/Pillsbury-India-ElaichiPremiumCakeRusk-770x513-1.jpg'),
  ('Atta Biscuit', 'Snack', 30.00, 150, 'https://m.media-amazon.com/images/I/515NBDLAfwL._AC_UF1000,1000_QL80_.jpg');

-- ── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'card',
  status VARCHAR(50) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL
);

