const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp');
const AppError = require('./AppError');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
  },
});

// Upload image to Cloudinary
const uploadImage = async (fileBuffer) => {
  try {
    // Process image with sharp: resize, compress, and convert to webp
    const processedBuffer = await sharp(fileBuffer)
      .resize(800, 800, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'mymenu_images',
          format: 'webp',
          timeout: 120000, // 2 minutes
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new AppError('Image upload failed', 500));
          } else {
            resolve(result.secure_url);
          }
        }
      );

      uploadStream.end(processedBuffer);
    });

    // Race the upload against a manual 2-minute timeout guard
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new AppError('Image upload timed out. Please try again.', 504)), 120000)
    );

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Image processing error:', error);
    throw new AppError('Image processing failed', 500);
  }
};

// Delete image from Cloudinary using its URL
const deleteImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return;
  }

  try {
    // Example URL: https://res.cloudinary.com/dzwituw4t/image/upload/v1234567890/mymenu_images/abcde12345.webp
    // We need to extract 'mymenu_images/abcde12345'
    const parts = imageUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return;

    // The public ID is everything after the version folder (which starts with 'v' and is optional, but usually present)
    // Actually, everything after 'upload/' (skipping the version) without the file extension
    let pathParts = parts.slice(uploadIndex + 1);
    
    // If the first part after 'upload' starts with 'v' and is followed by numbers, it's the version string
    if (pathParts[0].startsWith('v') && !isNaN(parseInt(pathParts[0].substring(1)))) {
      pathParts.shift(); // remove version folder
    }

    const publicIdWithExtension = pathParts.join('/');
    const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));

    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Non-critical error, we don't throw to avoid breaking the delete operation
  }
};

module.exports = {
  upload,
  uploadImage,
  deleteImage,
};
