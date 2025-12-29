import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import sequelize from "./config/db.js";

// 🧩 Import models in correct order
import "./models/Client.js";
import "./models/Carer.js";       // must load before Booking
import "./models/Booking.js";
import "./models/Notification.js";


dotenv.config();
const PORT = process.env.PORT || 4000;

// ✅ Create a single HTTP + Socket.IO server
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: "*", // TODO: change this to your Flutter app domain later
    methods: ["GET", "POST"],
  },
});

// ✅ Track carers that are connected (socket.id ⇔ carerId)
const connectedCarers = new Map();

io.on("connection", (socket) => {
  console.log("🟢 New socket connected:", socket.id);

  // When a carer joins
  socket.on("carer_join", (carerId) => {
    connectedCarers.set(carerId, socket.id);
    console.log(`✅ Carer ${carerId} connected via socket ${socket.id}`);
  });

  // When a carer disconnects
  socket.on("disconnect", () => {
    for (const [carerId, id] of connectedCarers.entries()) {
      if (id === socket.id) {
        connectedCarers.delete(carerId);
        console.log(`❌ Carer ${carerId} disconnected`);
        break;
      }
    }
  });
});

// ✅ Helper: send notification to a carer
export const sendCarerNotification = (carerId, data) => {
  const socketId = connectedCarers.get(carerId);
  if (socketId) {
    io.to(socketId).emit("new-notification", data);
    console.log(`📩 Sent notification to carer ${carerId}`);
  } else {
    console.log(`⚠️ Carer ${carerId} is offline, storing notification`);
  }
};

// ✅ Start server only after DB connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to PostgreSQL successfully");

    // Sync models (create or update tables)
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced successfully");

    // 🟢 Start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server + WebSocket running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
})();
