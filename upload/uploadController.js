const { uploadImage } = require('../shared/uploadService');
const AppError = require('../shared/AppError');

async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No image file provided', 400);
    }

    const imageUrl = await uploadImage(req.file.buffer);

    res.status(200).json({
      message: 'Image uploaded successfully',
      data: {
        url: imageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadFile };
