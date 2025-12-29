import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createBooking,
  getClientBookings,
  getCarerBookings,
  getCarerNotifications,
  getAllBookings,
  updateBookingStatus,
  getLatestCarerBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

// Client creates a booking
router.post("/", authMiddleware, createBooking);

// Client views their bookings
router.get("/client", authMiddleware, getClientBookings);

// Carer views their bookings
router.get("/carer", authMiddleware, getCarerBookings);

// Carer views notifications
router.get("/notifications", authMiddleware, getCarerNotifications);

// ✅ GET all bookings (can protect with auth if needed)
router.get("/", authMiddleware, getAllBookings);

//
router.put("/:id/status", authMiddleware, updateBookingStatus);

router.get("/carer/latest", authMiddleware, getLatestCarerBooking);





export default router;
