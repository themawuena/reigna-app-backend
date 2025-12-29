import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Carer from "../models/Carer.js";
import Client from "../models/Client.js";

dotenv.config();

/**
 * ✅ Universal authentication middleware
 * Supports both Carers and Clients
 * - Verifies JWT
 * - Loads user from DB
 * - Attaches full user object to req.user
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(400).json({ message: "Invalid token structure" });
    }

    let user = null;

    // ✅ Dynamically fetch user based on role
    if (decoded.role === "carer") {
      user = await Carer.findByPk(decoded.id);
    } else if (decoded.role === "client") {
      user = await Client.findByPk(decoded.id);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Attach full user object to request
    req.user = {
      id: user.id,
      role: decoded.role,
      email: user.email,
      full_name: user.full_name,
      fcm_token: user.fcm_token || null,
    };

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
