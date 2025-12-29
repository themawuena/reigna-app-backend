import express from "express";
import { registerClient, loginClient, getClientProfile, getAllClients } from "../controllers/clientController.js";
import { authMiddleware } from "../middleware/auth.js";
import { payForBooking } from "../controllers/paymentController.js";
import { forgotPassword } from "../controllers/clientController.js";

const router = express.Router();

// Public routes
router.post("/register", registerClient);
router.post("/login", loginClient);

// Protected route (requires JWT)
router.get("/profile", authMiddleware, getClientProfile);

// ✅ Get all clients
router.get("/", authMiddleware, getAllClients);

// pay for booking
router.post("/pay/:id", authMiddleware, payForBooking);

router.post("/forgot-password", forgotPassword);


export default router;
