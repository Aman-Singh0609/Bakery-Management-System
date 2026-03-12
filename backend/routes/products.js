const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const publishProductEvent = require('../services/productPublisher');

// Add Product
router.post('/addproduct', async (req, res) => {
  const { name, category, price, stock, image } = req.body;
  console.log('POST /addproduct called with:', req.body);

  if (!name || !price || stock === undefined) {
    console.warn('Missing required fields while adding product');
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const insertQuery = `
      INSERT INTO products (name, category, price, stock, image)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [name, category, price, stock, image]);

    console.log('✅ Product added:', result.rows[0]);
    publishProductEvent("added", result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error adding product:", error);
    res.status(500).json({ message: "Error adding product" });
  }
});

// Update Product
router.put('/updateproduct/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock, image } = req.body;
  console.log(`PUT /updateproduct/${id} called with:`, req.body);

  if (!name || !price || stock === undefined) {
    console.warn('Missing required fields while updating product');
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const updateQuery = `
      UPDATE products
      SET name = $1, category = $2, price = $3, stock = $4, image = $5
      WHERE id = $6
      RETURNING *;
    `;
    const result = await pool.query(updateQuery, [name, category, price, stock, image, id]);

    if (result.rows.length === 0) {
      console.warn(`⚠️ Product with ID ${id} not found for update`);
      return res.status(404).json({ message: "Product not found" });
    }

    console.log('✅ Product updated:', result.rows[0]);
    publishProductEvent("updated", result.rows[0]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error updating product:", error);
    res.status(500).json({ message: "Error updating product" });
  }
});

// Delete Product
router.delete('/deleteproduct/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`DELETE /deleteproduct/${id} called`);

  try {
    const deleteQuery = `
      DELETE FROM products
      WHERE id = $1
      RETURNING *;
    `;
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      console.warn(`⚠️ Product with ID ${id} not found for deletion`);
      return res.status(404).json({ message: "Product not found" });
    }

    console.log('✅ Product deleted:', result.rows[0]);
    publishProductEvent("deleted", result.rows[0]);

    res.status(200).json({ message: "Product deleted", product: result.rows[0] });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
});

// List All Products
router.get('/listproducts', async (req, res) => {
  console.log('GET /listproducts called');

  try {
    const result = await pool.query('SELECT * FROM products');
    console.log(`✅ ${result.rows.length} products fetched`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

module.exports = router;
