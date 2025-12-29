import express from "express";
import { registerCarer, loginCarer, getCarerProfile, getAllCarers, getCarersByPostcode, updateCarerDetails, updateCarerFcmToken, getWeeklyEarnings, uploadIdDocument, } from "../controllers/carerController.js";
import { authMiddleware } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { forgotPassword } from "../controllers/carerController.js";
import uploadId from "../middleware/uploadId.js";


const router = express.Router();

router.post("/register", registerCarer);
router.post("/login", loginCarer);
router.get("/profile", authMiddleware, getCarerProfile);

// ✅ NEW: List all carers (protected route)
router.get("/list", authMiddleware, getAllCarers);

router.get("/nearby", getCarersByPostcode);

// ✅ Correct usage of auth middleware
router.put("/update", authMiddleware, upload.single("profile_image"), updateCarerDetails);

router.put("/update-fcm", authMiddleware, updateCarerFcmToken);

router.post("/forgot-password", forgotPassword);

// ✔️ Carer must be logged in
router.get("/earnings/weekly", authMiddleware, getWeeklyEarnings);


router.post(
  "/upload-id",
  authMiddleware,
  uploadId.single("id_document"),
  uploadIdDocument
);



export default router;

