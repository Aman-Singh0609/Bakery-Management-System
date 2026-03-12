const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const publishProductEvent = require('../services/productPublisher');

// POST /placeorder
router.post('/placeorder', async (req, res) => {
    const { customer_name, customer_email, customer_phone, customer_address, items, payment_method } = req.body;

    if (!customer_name || !customer_email || !items || items.length === 0) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const total_amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

        const orderResult = await client.query(
            `INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, total_amount, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [customer_name, customer_email, customer_phone || '', customer_address || '', total_amount, payment_method || 'card']
        );
        const order = orderResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
                [order.id, item.product_id, item.product_name, item.quantity, item.unit_price]
            );

            // Decrement stock
            await client.query(
                `UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1`,
                [item.quantity, item.product_id]
            );
        }

        await client.query('COMMIT');

        publishProductEvent('order_placed', { order_id: order.id, total_amount });
        console.log(`✅ Order #${order.id} placed for ${customer_name}`);
        res.status(201).json({ message: 'Order placed successfully', order });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error placing order:', error);
        res.status(500).json({ message: 'Error placing order' });
    } finally {
        client.release();
    }
});

// GET /listorders
router.get('/listorders', async (req, res) => {
    try {
        const ordersResult = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        const orders = ordersResult.rows;

        for (const order of orders) {
            const itemsResult = await pool.query(
                'SELECT * FROM order_items WHERE order_id = $1',
                [order.id]
            );
            order.items = itemsResult.rows;
        }

        res.json(orders);
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

module.exports = router;
