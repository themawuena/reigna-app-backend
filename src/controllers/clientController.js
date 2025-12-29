import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Client from "../models/Client.js";
import { sendMail } from "../utils/email.js";

// ✅ Register new client (Sequelize version)
export const registerClient = async (req, res, next) => {
  try {
    const { full_name, email, password, phone, postcode } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: "Full name, email, and password are required." });
    }

    // Check if client exists
    const existing = await Client.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already registered." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create client
    const newClient = await Client.create({
      full_name,
      email,
      password: hashedPassword,
      phone,
      postcode,
    });

    // Generate JWT
    const token = jwt.sign({ id: newClient.id, role: "client" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Client registered successfully",
      client: {
        id: newClient.id,
        full_name: newClient.full_name,
        email: newClient.email,
        phone: newClient.phone,
        postcode: newClient.postcode,
      },
      token,
    });
  } catch (error) {
    console.error("Error registering client:", error);
    next(error);
  }
};

// ✅ Client Login
export const loginClient = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Find client by email
    const client = await Client.findOne({ where: { email } });
    if (!client) {
      return res.status(404).json({ message: "Client not found." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: client.id, role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Respond
    res.status(200).json({
      message: "Login successful",
      client: {
        id: client.id,
        full_name: client.full_name,
        email: client.email,
        phone: client.phone,
        postcode: client.postcode,
      },
      token,
    });
  } catch (error) {
    console.error("Error logging in client:", error);
    next(error);
  }
};

export const getClientProfile = async (req, res, next) => {
  try {
    // req.user is set by authMiddleware
    const client = await Client.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.status(200).json({
      success: true,
      client,
    });
  } catch (error) {
    console.error("Error fetching client profile:", error);
    next(error);
  }
};


/**
 * @desc Get all clients
 * @route GET /api/clients
 * @access Protected (Admin / Carer)
 */
export const getAllClients = async (req, res) => {
  try {
    const clients = await Client.findAll({
      attributes: [
        "id",
        "full_name",
        "email",
        "phone",
        "postcode",
        // "createdAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("❌ Error fetching clients:", error);
    res.status(500).json({
      message: "Failed to fetch clients",
      error: error.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    // Find client by email
    const client = await Client.findOne({ where: { email } });

    if (!client) {
      return res
        .status(404)
        .json({ message: "No client found with this email" });
    }

    // Generate new temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    // Hash password and save
    const hashed = await bcrypt.hash(tempPassword, 10);
    client.password = hashed;
    await client.save();

    // Email content
    const subject = "Your New Password – Reigna Client App";

    const text = `
Your password has been reset.

Temporary Password: ${tempPassword}

Use this temporary password to login and change your password immediately.
    `;

    const html = `
<h2>Your Password Has Been Reset</h2>
<p>Here is your temporary login password:</p>

<h3 style="color:#ff4500;">${tempPassword}</h3>

<p>Please change your password after logging in.</p>
    `;

    // Send email via Mailgun
    await sendMail(email, subject, text, html);

    return res.json({
      message: "A new password has been sent to your email",
    });
  } catch (error) {
    console.error("❌ Forgot password (client) error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
