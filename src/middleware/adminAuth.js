import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Admin from "../models/Admin.js";

dotenv.config();

export const adminAuthMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({ message: "Not an admin token" });
    }

    const admin = await Admin.findByPk(decoded.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error("❌ Admin auth error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
