import express from "express";
import {
  adminLogin,
  createAdmin,
  getAllCarers,
  getAllClients,
  adminGetAllBookings,
  adminUpdateBookingStatus,
  updateCarerStatus,
  deleteCarer,
  deleteClient,
  adminForgotPassword,
  viewCarerDetails,
} from "../controllers/adminController.js";
// import { getCarerDetails } from "../controllers/carerController.js";

import { adminAuthMiddleware } from "../middleware/adminAuth.js";

const router = express.Router();


// ======================================================
//  PUBLIC ROUTES
// ======================================================

// ➤ Admin Login
router.post("/login", adminLogin);

// ➤ Forgot Password (send new one to email)
router.post("/forgot-password", adminForgotPassword);

// ➤ Create admin (optional – remove if not needed)
router.post("/create-admin", createAdmin);


// router.get(
//   "/admin/carers/:id",
//   adminAuthMiddleware,
//   getCarerDetails
// );



// ======================================================
//  PROTECTED ADMIN ROUTES (require admin token)
// ======================================================
router.use(adminAuthMiddleware);

// ========== CARERS ==========
router.get("/carers", getAllCarers);
router.put("/carers/:id/status", updateCarerStatus);
router.delete("/carers/:id", deleteCarer);
router.get("/carers/:id", adminAuthMiddleware, viewCarerDetails);

// ========== CLIENTS ==========
router.get("/clients", getAllClients);
router.delete("/clients/:id", deleteClient);

// ========== BOOKINGS ==========
router.get("/bookings", adminGetAllBookings);
router.put("/bookings/:id/status", adminUpdateBookingStatus);

export default router;
