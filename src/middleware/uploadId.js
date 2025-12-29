import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/id_documents";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `id_${req.user.id}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Only JPG, PNG, or PDF files are allowed"), false);
  } else {
    cb(null, true);
  }
};

const uploadId = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default uploadId;
