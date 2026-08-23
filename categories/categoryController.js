const categoryService = require('./categoryService');

async function getCategories(req, res, next) {
  try {
    const categories = await categoryService.getCategories(req.restaurantId);
    res.status(200).json({
      message: 'Categories retrieved',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(
      req.restaurantId,
      req.body.category_name,
      req.body.image_url
    );
    res.status(201).json({
      message: 'Category created',
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await categoryService.updateCategory(
      req.restaurantId,
      req.params.categoryId,
      req.body.category_name,
      req.body.image_url
    );
    res.status(200).json({
      message: 'Category updated',
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await categoryService.deleteCategory(
      req.restaurantId,
      req.params.categoryId
    );
    res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
}

async function getPublicCategories(req, res, next) {
  try {
    const categories = await categoryService.getCategories(req.params.restaurantId);
    res.status(200).json({
      message: 'Public categories retrieved',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory, getPublicCategories };
