import Volunteer from "../models/Volunteer.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export const signupVolunteer = async (req, res) => {
  try {
    const { full_name, email, password, postcode } = req.body;

    // Check required fields
    if (!full_name || !email || !password || !postcode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email exists
    const existing = await Volunteer.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const volunteer = await Volunteer.create({
      full_name,
      email,
      password,
      postcode,
    });

    res.status(201).json({ message: "Volunteer registered successfully", volunteer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const signinVolunteer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const volunteer = await Volunteer.findOne({ where: { email } });
    if (!volunteer) return res.status(404).json({ message: "Volunteer not found" });

    const isMatch = await bcrypt.compare(password, volunteer.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: volunteer.id, role: "volunteer" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ message: "Signin successful", token, volunteer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
