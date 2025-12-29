import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Carer from "../models/Carer.js";
import pool from "../config/db.js";
import axios from "axios";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { sendMail } from "../utils/email.js";
import Booking from "../models/Booking.js";
import { Op } from "sequelize";
import { supabase } from "../config/supabase.js";
import { v4 as uuid } from "uuid";


dotenv.config();

export const registerCarer = async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      mobile_number,
      postcode,
      city,
      experience_years,
      care_types,
      availability,
      about_me,
      dbs_number,
      rtw_number,
    } = req.body;

    const existing = await Carer.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const carer = await Carer.create({
      full_name,
      email,
      password: hashedPassword,
      mobile_number,
      postcode,
      city,
      experience_years,
      care_types,
      availability,
      about_me,
      dbs_number,
      rtw_number,
    });

    return res.status(201).json({ message: "Carer registered successfully", carer });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const loginCarer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const carer = await Carer.findOne({ where: { email } });

    if (!carer) {
      return res.status(404).json({ message: "Carer not found" });
    }

    const isMatch = await bcrypt.compare(password, carer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Include role: 'carer'
    const token = jwt.sign(
      { id: carer.id, role: "carer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Carer logged in successfully",
      token,
      carer,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCarerProfile = async (req, res) => {
  try {
    const carer = await Carer.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });
    if (!carer) return res.status(404).json({ message: "Carer not found" });
    res.json(carer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ List all carers (Sequelize version)
export const getAllCarers = async (req, res, next) => {
  try {
    const carers = await Carer.findAll({
      attributes: ["id", "full_name", "email", "postcode", "mobile_number", "charge_hrs", "city", "experience_years", "care_types", "availability", "about_me", "right_to_work_status", "dbs_status", "fcm_token", "status" ],
      order: [["id", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: carers.length,
      carers,
    });
  } catch (error) {
    console.error("Error fetching carers:", error);
    next(error);
  }
};


/**
 * @desc Find carers near a given postcode
 * @route GET /api/carers/nearby?postcode=SW1A1AA
 * @access Public or Protected (your choice)
 */
export const getCarersByPostcode = async (req, res) => {
  try {
    const { postcode } = req.query;

    if (!postcode) {
      return res.status(400).json({ message: "Postcode is required" });
    }

    // 1️⃣ Get coordinates of the client's postcode using Postcodes.io
    const clientResponse = await axios.get(
      `https://api.postcodes.io/postcodes/${postcode}`
    );

    if (clientResponse.data.status !== 200) {
      return res.status(400).json({ message: "Invalid postcode" });
    }

    const clientLocation = clientResponse.data.result;
    const clientLat = clientLocation.latitude;
    const clientLng = clientLocation.longitude;

    // 2️⃣ Fetch all carers that have postcodes
    const carers = await Carer.findAll({
      where: { postcode: { [Symbol.for("ne")]: null } },
      attributes: [
        "id",
        "full_name",
        "email",
        "postcode",
        "charge_hrs",
        "city",
        "experience_years",
        "availability",
        "dbs_status",
        "care_types",
        "about_me",
        "right_to_work_status",
        "status",



      ],
    });

    // 3️⃣ Calculate distance (using Haversine formula)
    const R = 6371; // Earth radius in km
    const carersWithDistance = [];

    for (const carer of carers) {
      try {
        const response = await axios.get(
          `https://api.postcodes.io/postcodes/${carer.postcode}`
        );
        const data = response.data.result;
        const lat2 = data.latitude;
        const lng2 = data.longitude;

        const dLat = ((lat2 - clientLat) * Math.PI) / 180;
        const dLng = ((lng2 - clientLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((clientLat * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        carersWithDistance.push({
          ...carer.toJSON(),
          distance_km: distance.toFixed(2),
        });
      } catch (e) {
        console.warn(`⚠️ Could not get location for ${carer.postcode}`);
      }
    }

    // 4️⃣ Sort carers by distance
    carersWithDistance.sort((a, b) => a.distance_km - b.distance_km);

    // 5️⃣ Return top 10 nearest carers
    return res.status(200).json({
      count: carersWithDistance.length,
      carers: carersWithDistance.slice(0, 10),
    });
  } catch (error) {
    console.error("❌ Error fetching nearby carers:", error.message);
    res.status(500).json({
      message: "Error fetching nearby carers",
      error: error.message,
    });
  }
};

// ✅ Update carer details (including image)
export const updateCarerDetails = async (req, res) => {
  try {
    const carerId = req.user.id;
    const {
      full_name,
      email,
      password,
      mobile_number,
      charge_hrs,
      postcode,
      city,
      experience_years,
      care_types,
      availability,
      about_me,
      dbs_number,
      rtw_number,
      // passport_image,
    } = req.body;

    const carer = await Carer.findByPk(carerId);
    if (!carer) {
      return res.status(404).json({ message: "Carer not found" });
    }

    // 🔹 Handle email change
    if (email && email !== carer.email) {
      const existing = await Carer.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }
      carer.email = email;
    }

    // 🔹 Handle password change
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      carer.password = hashed;
    }

    // 🔹 Handle other fields
    if (full_name) carer.full_name = full_name;
    if (mobile_number) carer.mobile_number = mobile_number;
    if (charge_hrs) carer.charge_hrs = charge_hrs;
    if (postcode) carer.postcode = postcode;
    if (city) carer.city = city;
    if (experience_years) carer.experience_years = experience_years;
    if (care_types) carer.care_types = care_types;
    if (availability) carer.availability = availability;
    if (about_me) carer.about_me = about_me;
    if (dbs_number) carer.dbs_number = dbs_number;
    if (rtw_number) carer.rtw_number = rtw_number;
   

    // 🔹 Handle profile image upload
    if (req.file) {
      const imageUrl = `/uploads/${req.file.filename}`;
      carer.profile_image = imageUrl;
    }

    await carer.save();

    const { password: _, ...safeCarer } = carer.toJSON();

    return res.status(200).json({
      message: "Profile updated successfully",
      carer: safeCarer,
    });
  } catch (error) {
    console.error("❌ Error updating carer details:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateCarerFcmToken = async (req, res) => {
  try {
    const { fcm_token } = req.body;
    if (!fcm_token) {
      return res.status(400).json({ message: "FCM token required" });
    }

    const carer = await Carer.findByPk(req.user.id);
    if (!carer) {
      return res.status(404).json({ message: "Carer not found" });
    }

    carer.fcm_token = fcm_token;
    await carer.save();

    res.json({
      message: "FCM token updated successfully",
      carer: {
        id: carer.id,
        full_name: carer.full_name,
        fcm_token: carer.fcm_token,
      },
    });
  } catch (error) {
    console.error("Error updating FCM token:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    // Find the carer by email
    const carer = await Carer.findOne({ where: { email } });

    if (!carer) {
      return res
        .status(404)
        .json({ message: "No carer found with this email" });
    }

    // Generate new temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    // Hash password and save
    const hashed = await bcrypt.hash(tempPassword, 10);
    carer.password = hashed;
    await carer.save();

    // Send email using Mailgun
    const subject = "Your New Password – Reigna Carer App";

    const text = `
Your password has been reset.

Temporary Password: ${tempPassword}

Please login and change your password immediately.
    `;

    const html = `
<h2>Your Password Has Been Reset</h2>
<p>Here is your temporary login password:</p>

<h3 style="color:#ff4500;">${tempPassword}</h3>

<p>Please change your password after logging in.</p>
    `;

    await sendMail(email, subject, text, html);

    return res.json({
      message: "A new password has been sent to your email",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getWeeklyEarnings = async (req, res) => {
  try {
    const carerId = req.user.id; // carer authenticated
    const now = new Date();

    // 🔁 Determine week start (Monday) and end (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    // 🔍 Fetch completed PAID bookings for the week
    const bookings = await Booking.findAll({
      where: {
        carer_id: carerId,
        status: "completed",
        payment_status: "paid",
        date: { [Op.between]: [startOfWeek, endOfWeek] }, // weekly filter
      },
      attributes: ["id", "service_type", "service_hrs", "total_cost", "date"],
      order: [["date", "ASC"]],
    });

    // 💰 Calculate total earnings
    const totalEarnings = bookings.reduce((sum, b) => sum + (b.total_cost || 0), 0);

    return res.status(200).json({
      total_earnings: totalEarnings,
      currency: "GBP",
      week_start: startOfWeek,
      week_end: endOfWeek,
      bookings,
      count: bookings.length,
    });

  } catch (error) {
    console.error("❌ Error fetching weekly earnings:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const uploadCarerId = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileExt = req.file.originalname.split(".").pop();
    const filePath = `ids/${req.user.id}-${uuid()}.${fileExt}`;

    // upload to bucket
    const { error } = await supabase.storage
      .from("carer-ids")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    // generate signed URL (private access)
    const { data: signed } = await supabase.storage
      .from("carer-ids")
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

    // save file path in DB
    await Carer.update(
      { id_document: filePath },
      { where: { id: req.user.id } }
    );

    res.status(200).json({
      message: "ID uploaded successfully",
      url: signed.signedUrl,
      path: filePath,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload ID" });
  }
};








