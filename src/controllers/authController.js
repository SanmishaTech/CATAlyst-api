const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");
const prisma = require("../config/db");
const emailService = require("../services/emailService");
const validateRequest = require("../utils/validateRequest");
const config = require("../config/config");
const createError = require("http-errors");
const { SUPER_ADMIN } = require("../config/roles");

const login = async (req, res, next) => {
  const schema = z.object({
    email: z.string().email("Invalid Email format").min(1, "email is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  });

  try {
    const validationErrors = await validateRequest(schema, req.body, res);
    const { email, password } = req.body;



    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        active: true,
        lastLogin: true,
        apiKey: true,
        apiKeyExpiry: true,
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ errors: { message: "Invalid email or password" } });
    }

    // Handle regular user login
    if (!(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ errors: { message: "Invalid email or password" } });
    }

    if (!user.active) {
      return res
        .status(403)
        .json({ errors: { message: "Account is inactive" } });
    }

    // Generate API key if not exists or expired
    const API_KEY_EXPIRY_DAYS = parseInt(process.env.API_KEY_EXPIRY_DAYS) || 30;
    let apiKey = user.apiKey;
    let apiKeyExpiry = user.apiKeyExpiry;
    
    const now = new Date();
    const needsNewKey = !apiKey || !apiKeyExpiry || apiKeyExpiry < now;
    
    if (needsNewKey) {
      // Generate a secure random API key
      apiKey = crypto.randomBytes(32).toString('hex');
      apiKeyExpiry = new Date(now.getTime() + API_KEY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      // Update user with new API key and lastLogin
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          apiKey,
          apiKeyExpiry,
          lastLogin: now,
        },
      });
    } else {
      // Just update lastLogin
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: now },
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      apiKey,
      apiKeyExpiry,
      user: userWithoutPassword,
      message: needsNewKey ? "New API key generated" : "Existing API key is still valid",
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  const schema = z.object({
    email: z
      .string()
      .email("Invalid Email format")
      .nonempty("Email is required"),
  });
  console.log("Forgot password request:", req.body);

  try {
    const validationErrors = await validateRequest(schema, req.body, res);
    const { email, resetUrl } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return setTimeout(() => {
        res.status(404).json({ errors: { message: "User not found" } });
      }, 3000);
    }

    const resetToken = uuidv4();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires: new Date(Date.now() + 3600000), // Token expires in 1 hour
      },
    });
    const resetLink = `${resetUrl}/${resetToken}`; // Replace with your actual domain
    const templateData = {
      name: user.name,
      resetLink,
      appName: config.appName,
    };
    await emailService.sendEmail(
      email,
      "Password Reset Request",
      "passwordReset",
      templateData
    );

    res.json({ message: "Password reset link sent" });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  console.log("Reset password request:", req.body);
  const schema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
  });

  try {
    // Use the reusable validation function
    const validationErrors = await validateRequest(schema, req.body, res);
    const { password } = req.body;
    const { token } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() }, // Check if the token is not expired
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ errors: { message: "Invalid or expired token" } });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null, // Clear the token after use
        resetTokenExpires: null,
      },
    });
    res.json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
};
