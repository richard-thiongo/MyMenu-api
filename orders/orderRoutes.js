const express = require('express');
const orderController = require('./orderController');
const authMiddleware = require('../shared/authMiddleware');

const router = express.Router();

// Public route to create an order
router.post('/', orderController.createOrder);

// Public route to get a specific order's status and details
router.get('/:id', orderController.getOrder);

// Protected routes for restaurants to manage their orders
router.get('/restaurant/today', authMiddleware, orderController.getTodaysOrders);
router.put('/:id/status', authMiddleware, orderController.updateOrderStatus);

module.exports = router;
