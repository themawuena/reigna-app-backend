import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Admin from "../models/Admin.js";
import Carer from "../models/Carer.js";
import Client from "../models/Client.js";
import Booking from "../models/Booking.js";
import { sendMail } from "../utils/email.js"; // Mailgun

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;


// ===================================================================
//  ADMIN LOGIN
// ===================================================================
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ where: { email } });
    if (!admin)
      return res.status(404).json({ message: "Admin account not found" });

    // compare plaintext password with hashed password
    const match = await bcrypt.compare(password, admin.password);
    if (!match)
      return res.status(400).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { id: admin.id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Admin logged in successfully",
      token,
      admin,
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};




// ===================================================================
//  CREATE NEW ADMIN (OPTIONAL)
// ===================================================================
export const createAdmin = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    const exists = await Admin.findOne({ where: { email } });
    if (exists)
      return res.status(400).json({ message: "Email already in use" });

    const admin = await Admin.create({
      full_name,
      email,
      password,  // ⚠️ SEND PLAIN, model will hash
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin,
    });
  } catch (error) {
    console.error("❌ Create admin error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// ===================================================================
//  GET ALL CARERS
// ===================================================================
export const getAllCarers = async (req, res) => {
  try {
    const carers = await Carer.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json({ count: carers.length, carers });
  } catch (error) {
    console.error("❌ Error getting carers:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ===================================================================
//  GET ALL CLIENTS
// ===================================================================
export const getAllClients = async (req, res) => {
  try {
    const clients = await Client.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json({ count: clients.length, clients });
  } catch (error) {
    console.error("❌ Error getting clients:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ===================================================================
//  GET ALL BOOKINGS
// ===================================================================
export const adminGetAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        { model: Carer, attributes: ["full_name", "email"] },
        { model: Client, attributes: ["full_name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ count: bookings.length, bookings });
  } catch (error) {
    console.error("❌ Error getting bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ===================================================================
//  ADMIN UPDATE BOOKING STATUS (Override Carer restrictions)
// ===================================================================
export const adminUpdateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "accepted", "declined", "started", "completed"];
    if (!allowed.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Client, attributes: ["full_name", "email"] },
        { model: Carer, attributes: ["full_name", "charge_hrs"] },
      ],
    });

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    // Calculate total cost if completed
    if (status === "completed") {
      const hours = booking.service_hrs || 0;
      const rate = booking.Carer?.charge_hrs || 0;
      booking.total_cost = hours * rate;
    }

    booking.status = status;
    await booking.save();

    res.json({
      message: `Booking updated by admin to ${status}`,
      booking,
    });

    // Email client
    if (booking.Client) {
      const subject = `Booking Update (Admin Action): ${status}`;
      const text = `Your booking has been updated to ${status}`;
      sendMail(booking.Client.email, subject, text, `<b>${text}</b>`);
    }
  } catch (error) {
    console.error("❌ Admin update booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ===================================================================
//  APPROVE / REJECT CARER
// ===================================================================
export const updateCarerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved | rejected | pending

    const carer = await Carer.findByPk(id);
    if (!carer) return res.status(404).json({ message: "Carer not found" });

    carer.status = status;
    await carer.save();

    res.json({
      message: `Carer status updated to ${status}`,
      carer,
    });

  } catch (error) {
    console.error("❌ Update carer status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ===================================================================
//  DELETE CARER
// ===================================================================
export const deleteCarer = async (req, res) => {
  try {
    const { id } = req.params;

    const carer = await Carer.findByPk(id);
    if (!carer)
      return res.status(404).json({ message: "Carer not found" });

    await carer.destroy();

    res.json({ message: "Carer deleted successfully" });
  } catch (error) {
    console.error("❌ Delete carer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ===================================================================
//  DELETE CLIENT
// ===================================================================
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await Client.findByPk(id);
    if (!client)
      return res.status(404).json({ message: "Client not found" });

    await client.destroy();

    res.json({ message: "Client removed successfully" });
  } catch (error) {
    console.error("❌ Delete client error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ===================================================================
//  ADMIN RESET PASSWORD (Send email with new password)
// ===================================================================
export const adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await Admin.findOne({ where: { email } });
    if (!admin)
      return res.status(404).json({ message: "Admin not found" });

    const newPass = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(newPass, 10);

    admin.password = hashed;
    await admin.save();

    await sendMail(
      admin.email,
      "Admin Password Reset",
      `Your new password is: ${newPass}`,
      `<p>Your new password is: <strong>${newPass}</strong></p>`
    );

    res.json({ message: "New password sent to email" });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ---------------- ADMIN: VIEW A CARER DETAILS ----------------
export const viewCarerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const carer = await Carer.findByPk(id);

    if (!carer) {
      return res.status(404).json({
        message: "Carer not found",
      });
    }

    res.json({
      message: "Carer details fetched",
      carer,
    });
  } catch (error) {
    console.error("❌ View carer error:", error);
    res.status(500).json({ message: "Server error" });
  }
};




