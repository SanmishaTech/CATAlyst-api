//Vipul
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const createError = require("http-errors");
const path = require("path");
require("dotenv").config();
const roleRoutes = require("./routes/roles");
const userRoutes = require("./routes/users");
const clientRoutes = require("./routes/clients");
const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");
const batchRoutes = require("./routes/batches");
const swaggerRouter = require("./swagger");

const app = express();

app.use(morgan("dev"));

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
  })
);

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(",")
  : ["http://localhost:5173", "http://18.138.7.88"];


const corsOptions = {
  origin: "*", // Specify the origin of your frontend application
  credentials: true, // This allows cookies and credentials to be included in the requests
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend serving - only enable if   is true
if (process.env.SERVE_FRONTEND === 'true') {
  const frontendDistPath =
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_PATH ||
        path.resolve(__dirname, "..", "..", "Catalyst", "dist")
      : path.resolve(__dirname, "..", "..", "Catalyst_api", "dist");
  console.log(frontendDistPath);
  console.log(`Frontend build path: ${frontendDistPath}`);

  console.log(`Serving frontend static files from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
}

const uploadsPath =
  process.env.NODE_ENV === "production"
    ? process.env.UPLOADS_PATH || path.resolve(__dirname, "..", "uploads")
    : path.resolve(__dirname, "..", "uploads");

console.log(`Serving uploads from: ${uploadsPath}`);
app.use("/uploads", express.static(uploadsPath));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/batches", batchRoutes);
app.use(swaggerRouter);

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.includes(".")) {
    return next();
  }

  // Only serve frontend if SERVE_FRONTEND is enabled
  if (process.env.SERVE_FRONTEND === 'true') {
    const frontendDistPath =
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_PATH ||
          path.resolve(__dirname, "..", "..", "Catalyst", "dist")
        : path.resolve(__dirname, "..", "..", "Catalyst_api", "dist");
    
    const indexPath = path.join(frontendDistPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        if (err.code === "ENOENT") {
          res
            .status(404)
            .send(
              "Frontend entry point (index.html) not found. Ensure the frontend is built and paths are correctly configured."
            );
        } else {
          res
            .status(500)
            .send(
              "An error occurred while trying to serve the frontend application."
            );
        }
      }
    });
  } else {
    // API-only mode - return 404 for non-API routes
    next();
  }
});

app.use((req, res, next) => {
  if (res.headersSent) {
    return next();
  }
  next(createError(404, "The requested resource was not found."));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(
    "[ERROR HANDLER]:",
    err.status,
    err.message,
    process.env.NODE_ENV === "development" ? err.stack : ""
  );
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message || "An unexpected error occurred.",
      status: err.status || 500,
    },
  });
});

module.exports = app;
