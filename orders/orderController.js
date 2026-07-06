const pool = require('../db');
const AppError = require('../shared/AppError');

async function createOrder(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { restaurant_id, table_number, items } = req.body;
    
    if (!restaurant_id || !items || !items.length) {
      throw new AppError('Missing required order information', 400);
    }

    // Insert the order
    const orderResult = await client.query(
      `INSERT INTO orders (restaurant_id, table_number, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, status, created_at`,
      [restaurant_id, table_number]
    );
    const order = orderResult.rows[0];

    // Insert the order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, food_item_id, quantity, special_instructions)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.food_item_id, item.quantity || 1, item.special_instructions || '']
      );
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Order created successfully',
      data: order
    });

    // Emit real-time event to the restaurant's dashboard
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant_${restaurant_id}`).emit('new_order', order);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new AppError('Invalid order ID format', 400);
    }

    const orderResult = await pool.query(
      `SELECT o.id, o.restaurant_id, o.table_number, o.status, o.created_at
       FROM orders o
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rowCount === 0) {
      throw new AppError('Order not found', 404);
    }
    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT oi.id, oi.quantity, oi.special_instructions, f.food_name, f.price
       FROM order_items oi
       JOIN food_items f ON oi.food_item_id = f.food_id
       WHERE oi.order_id = $1`,
      [id]
    );
    order.items = itemsResult.rows;

    res.status(200).json({
      message: 'Order retrieved',
      data: order
    });
  } catch (error) {
    next(error);
  }
}

async function getTodaysOrders(req, res, next) {
  try {
    const restaurantId = req.restaurantId;
    
    // Get orders from the beginning of the current day
    const ordersResult = await pool.query(
      `SELECT o.id, o.table_number, o.status, o.created_at,
         (SELECT json_agg(json_build_object(
           'food_name', f.food_name,
           'quantity', oi.quantity,
           'special_instructions', oi.special_instructions
         ))
         FROM order_items oi
         JOIN food_items f ON oi.food_item_id = f.food_id
         WHERE oi.order_id = o.id
         ) as items
       FROM orders o
       WHERE o.restaurant_id = $1 AND DATE(o.created_at) = CURRENT_DATE
       ORDER BY o.created_at DESC`,
      [restaurantId]
    );

    res.status(200).json({
      message: "Today's orders retrieved",
      data: ordersResult.rows
    });
  } catch (error) {
    next(error);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const restaurantId = req.restaurantId;

    if (!status) {
      throw new AppError('Status is required', 400);
    }

    const result = await pool.query(
      `UPDATE orders 
       SET status = $1 
       WHERE id = $2 AND restaurant_id = $3
       RETURNING id, status`,
      [status, id, restaurantId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Order not found or unauthorized', 404);
    }

    res.status(200).json({
      message: 'Order status updated',
      data: result.rows[0]
    });

    // Emit real-time event to the customer's device
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('order_status_updated', result.rows[0]);
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getOrder,
  getTodaysOrders,
  updateOrderStatus
};
