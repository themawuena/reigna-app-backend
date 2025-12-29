import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import carerRoutes from "./routes/carerRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.get("/list", (req, res) => res.send("Carer Finder API Running"));
app.use("/api/carers", carerRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);


app.use("/uploads", express.static(path.resolve("uploads")));

// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

await sequelize.sync({ alter: true });
console.log("✅ Database synced");

export default app;
