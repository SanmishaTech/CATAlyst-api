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
const executionRoutes = require("./routes/executions");
const enumRoutes = require("./routes/enums");
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
// Consolidated allowlist (can be overridden by ALLOWED_ORIGINS env, comma-separated)
const defaultAllowedOrigins = [
  "http://localhost:5000",
  "http://localhost:3000",
  "http://localhost:5173",
  // deployed hostnames
  "https://catalyst.3.7.237.251.sslip.io",
  "https://catalystc.3.7.237.251.sslip.io",
  // raw IP if needed
  "http://18.138.7.88"
];

const allowedOriginsList = Array.from(
  new Set([
    ...defaultAllowedOrigins,
    ...((allowedOriginsEnv ? allowedOriginsEnv.split(",") : [])
      .map((o) => o.trim())
      .filter(Boolean)),
  ])
);


// CORS configuration: Allow specific origins (with credentials if needed)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check env-driven allowlist first
    if (allowedOriginsList.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Allow localhost variants in development
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  credentials: true, // This allows cookies and credentials to be included in the requests
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
  preflightContinue: false
};

// Add explicit OPTIONS handling for preflight requests
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory (HTML/CSS/JS frontend)
const publicPath = path.resolve(__dirname, "..", "public");
console.log(`Serving static files from: ${publicPath}`);
app.use(express.static(publicPath));

// Frontend serving - only enable if SERVE_FRONTEND is true
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
app.use("/api/executions", executionRoutes);
app.use("/api/enums", enumRoutes);
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
