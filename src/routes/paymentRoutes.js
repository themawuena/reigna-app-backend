// src/routes/paymentRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { createCheckoutSession, stripeWebhook } from "../controllers/paymentController.js";

const router = express.Router();

// Client creates Checkout session for booking payment
router.post("/client/checkout/:id", authMiddleware, createCheckoutSession);

// Stripe webhook endpoint (no auth)
router.post("/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhook);

export default router;
