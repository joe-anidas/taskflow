import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { CORS_ORIGIN, MONGO_URI, PORT } from "./config/env";
import authRoutes from "./routes/authRoutes";
import taskRoutes from "./routes/taskRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { notificationService } from "./notification";
import { initializeFirebase } from "./config/firebase";

const app = express();

// Initialize Firebase Admin
initializeFirebase();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  ...CORS_ORIGIN,
]);

const allowedOriginsArray = Array.from(allowedOrigins);

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📍 Database: ${MONGO_URI}`);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "taskflow-backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize notification service with Socket.IO
notificationService.initialize(httpServer, allowedOriginsArray);

const server = httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/api`);
});

process.on("SIGTERM", () => {
  console.log("⚠️  SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("✅ HTTP server closed");
    mongoose.connection.close();
  });
});
