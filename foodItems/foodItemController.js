const foodItemService = require('./foodItemService');

async function createFoodItem(req, res, next) {
  try {
    const foodItem = await foodItemService.createFoodItem(
      req.restaurantId,
      req.body
    );
    res.status(201).json({
      message: 'Food item created',
      data: foodItem,
    });
  } catch (error) {
    next(error);
  }
}

async function updateFoodItem(req, res, next) {
  try {
    const foodItem = await foodItemService.updateFoodItem(
      req.restaurantId,
      req.params.foodId,
      req.body
    );
    res.status(200).json({
      message: 'Food item updated',
      data: foodItem,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteFoodItem(req, res, next) {
  try {
    await foodItemService.deleteFoodItem(
      req.restaurantId,
      req.params.foodId
    );
    res.status(200).json({ message: 'Food item deleted' });
  } catch (error) {
    next(error);
  }
}

async function getFoodItems(req, res, next) {
  try {
    const foodItems = await foodItemService.getFoodItems(req.restaurantId);
    res.status(200).json({
      message: 'Food items retrieved',
      data: foodItems,
    });
  } catch (error) {
    next(error);
  }
}

async function getFoodItemsByRestaurantName(req, res, next) {
  try {
    const result = await foodItemService.getFoodItemsByRestaurantName(
      req.params.restaurantName
    );
    res.status(200).json({
      message: 'Food items retrieved',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getPublicFoodItems(req, res, next) {
  try {
    const foodItems = await foodItemService.getFoodItems(req.params.restaurantId);
    res.status(200).json({
      message: 'Public food items retrieved',
      data: foodItems,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  getFoodItems,
  getFoodItemsByRestaurantName,
  getPublicFoodItems,
};
