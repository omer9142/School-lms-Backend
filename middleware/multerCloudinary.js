// middleware/multerCloudinary.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Optionally create per-school folder if provided in request body
    const folder = req.body.schoolId ? `SchoolLMS/${req.body.schoolId}` : 'SchoolLMS';
    return {
      folder,
      allowed_formats: ['jpg','jpeg','png','pdf','doc','docx'],
      // use timestamp + originalname (without ext) as public_id to keep unique
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`
    };
  }
});

// limits: set file size limit (e.g. 5 MB)
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = upload;
