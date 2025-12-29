import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import { io } from "../server.js"; // import the socket server
import Carer from "../models/Carer.js";
import Client from "../models/Client.js";
import { sendPushNotification } from "../utils/fcmHelper.js";
import { sendMail } from "../utils/email.js";


export const createBooking = async (req, res) => {
  try {
    const { carer_id, service_type, service_hrs, date, location, time, notes } = req.body;

    const booking = await Booking.create({
      client_id: req.user.id,
      carer_id,
      service_type,
      service_hrs,
      date,
      location,
      time,
      notes,
      status: "pending",
    });

    // 🔔 Notify the carer via FCM
    const carer = await Carer.findByPk(carer_id);

    
    await Notification.create({
      carer_id,
      message: `New ${service_type} booking for ${date} at ${time}`,
      is_read: false,
    });

    if (carer?.fcm_token) {
      await sendPushNotification(
        carer.fcm_token,
        "📅 New Booking Request",
        `You have a new ${service_type} booking on ${date}`,
        {
          booking_id: booking.id.toString(),
          type: "new-booking",
        }
      );
    } else {
      console.warn("⚠️ Carer has no FCM token, skipping notification");
    }

    res.status(201).json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper to find socket ID for carer
function getCarerSocket(carerId) {
  const connectedCarers = io.sockets.sockets;
  for (const [id, socket] of connectedCarers) {
    if (socket.carerId === carerId) return id;
  }
  return null;
}

//✅ List client’s bookings
export const getClientBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      where: { client_id: req.user.id },
      include: [
        {
          model: Carer,
          attributes: ["full_name", "email", "postcode", "city", "charge_hrs"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      count: bookings.length,
      bookings: bookings.map((b) => {
        // Compute total cost ONLY if completed
        let total_cost = null;

        if (b.status === "completed") {
          const charge = b.Carer?.charge_hrs || 0;
          const hrs = b.service_hrs || 0;
          total_cost = charge * hrs;
        }

        return {
          id: b.id,
          service_type: b.service_type,
          service_hrs: b.service_hrs,
          date: b.date,
          time: b.time,
          status: b.status,
          location: b.location,
          notes: b.notes,
          createdAt: b.createdAt,
          total_cost, // 👈 Added here

          carer: b.Carer
            ? {
                name: b.Carer.full_name,
                email: b.Carer.email,
                postcode: b.Carer.postcode,
                city: b.Carer.city,
                charge_hrs: b.Carer.charge_hrs,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("❌ Error fetching client bookings:", error);
    next(error);
  }
};


//✅ List carer's bookings
export const getCarerBookings = async (req, res, next) => {
  try {
    const carerId = req.user.id; // retrieved from auth middleware

    const bookings = await Booking.findAll({
      where: { carer_id: carerId },
      include: [
        {
          model: Client,
          attributes: ["full_name", "email", "phone", "postcode"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      count: bookings.length,
      bookings: bookings.map((b) => ({
        id: b.id,
        service_type: b.service_type,
        service_hrs: b.service_hrs,
        date: b.date,
        time: b.time,
        status: b.status,
        location: b.location,
        notes: b.notes,
        createdAt: b.createdAt,
        client: b.Client
          ? {
              name: b.Client.full_name,
              email: b.Client.email,
              phone: b.Client.phone,
              postcode: b.Client.postcode,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching carer bookings:", error);
    next(error);
  }
};

//✅ Carer gets notifications
export const getCarerNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { carer_id: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};


/**
 * @desc Get all bookings
 * @route GET /api/bookings
 * @access Public (or protected if needed)
 */
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        {
          model: Client,
          attributes: ["id", "full_name", "email", "postcode"],
        },
        {
          model: Carer,
          attributes: ["id", "full_name", "email", "postcode"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    return res.status(500).json({
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// Update booking status (Accept / Decline)
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["accepted", "declined", "started", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Client,
          attributes: ["full_name", "email"],
        },
        {
          model: Carer,
          attributes: ["full_name", "charge_hrs"],
        }
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure only assigned carer can update
    if (booking.carer_id !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Allowed status transitions
    const current = booking.status;
    const allowedTransitions = {
      pending: ["accepted", "declined"],
      accepted: ["started"],
      started: ["completed"],
    };

    const allowedNext = allowedTransitions[current] || [];

    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from "${current}" to "${status}"`,
      });
    }

    // ---------------------------------------------------------
    // ✅ If COMPLETED → Calculate total cost
    // ---------------------------------------------------------
    if (status === "completed") {
      const hours = booking.service_hrs || 0;
      const rate = booking.Carer?.charge_hrs || 0;

      const totalCost = hours * rate;
      booking.total_cost = totalCost;
    }

    // ---------------------------------------------------------
    // 🔔 Email Notification to Client
    // ---------------------------------------------------------
    const clientEmail = booking.Client?.email;
    const clientName = booking.Client?.full_name;
    const carerName = booking.Carer?.full_name;

    if (clientEmail) {
      const subject = `Booking Updated: ${status.toUpperCase()}`;
      const text = `
Hello ${clientName},

Your booking has been updated.

Status: ${status.toUpperCase()}
Carer: ${carerName}
Service: ${booking.service_type}

${status === "completed" ? `Total Cost: £${booking.total_cost}` : ""}

Thank you,
Reigna Care Team
      `;

      const html = `
<h2>Booking Update</h2>

<p>Hello <strong>${clientName}</strong>,</p>

<p>Your booking has been updated.</p>

<p><strong>Status:</strong> ${status.toUpperCase()}</p>
<p><strong>Carer:</strong> ${carerName}</p>
<p><strong>Service:</strong> ${booking.service_type}</p>

${status === "completed"
  ? `<p><strong>Total Cost: £${booking.total_cost}</strong></p>`
  : ""
}

<br/>
<p>Thank you,<br/>Reigna Care Team</p>
      `;

      await sendMail(clientEmail, subject, text, html);
    }

    // Update status
    booking.status = status;
    await booking.save();

    // Notify all sockets
    io.emit("booking-updated", booking.toJSON());

    return res.status(200).json({
      message: `Booking updated to ${status}`,
      booking,
    });

  } catch (error) {
    console.error("❌ Error updating booking:", error);
    next(error);
  }
};


export const getLatestCarerBooking = async (req, res, next) => {
  try {
    const carerId = req.user.id; // comes from authMiddleware

    const booking = await Booking.findOne({
      where: { carer_id: carerId },
      include: [
        {
          model: Client,
          attributes: ["full_name", "phone", "email"],
        },
        {
          model: Carer,
          attributes: ["full_name", "charge_hrs"],
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!booking) {
      return res.status(200).json({
        message: "No bookings yet",
        upcoming: null,
      });
    }

    return res.status(200).json({
      message: "Latest booking retrieved",
      upcoming: {
        id: booking.id,
        service_type: booking.service_type,
        status: booking.status,
        date: booking.date,
        time: booking.time,
        service_hrs: booking.service_hrs,
        location: booking.location,
        client_name: booking.Client.full_name,
        charge_hrs: booking.Carer.charge_hrs,
      },
    });

  } catch (error) {
    console.error("❌ Error fetching latest carer booking:", error);
    next(error);
  }
};




