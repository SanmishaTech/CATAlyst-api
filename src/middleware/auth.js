const createError = require("http-errors");
const prisma = require("../config/db");
const { checkMembershipExpiry } = require("../services/membershipService");

module.exports = async (req, res, next) => {
  // Extract API key from Authorization header (format: "Bearer <api-key>" or "ApiKey <api-key>")
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(createError(401, "API key is required"));
  }

  const apiKey = authHeader.split(" ")[1];
  if (!apiKey) {
    return next(createError(401, "Invalid API key format"));
  }

  try {
    // Find user by API key
    const user = await prisma.user.findUnique({
      where: { apiKey },
    });

    if (!user) {
      return next(createError(401, "Invalid API key"));
    }

    // Check if API key has expired
    const now = new Date();
    if (!user.apiKeyExpiry || user.apiKeyExpiry < now) {
      return next(createError(401, "API key has expired. Please login again."));
    }

    // Check if user account is active
    if (!user.active) {
      return next(createError(403, "Account is inactive"));
    }

    // Check membership expiry for users
    if (user.role.includes('user')) {
      const { active, expiryInfo } = await checkMembershipExpiry(user.id);
      
      // Update user object with current active status
      user.active = active;
      
      // Attach expiry info to request if available
      if (expiryInfo) {
        req.membershipExpiryInfo = expiryInfo;
      }
      
      // If membership has expired, update user's active status and return 403
      if (!active) {
        return next(createError(403, "Your membership has expired. Please contact your administrator."));
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return next(createError(401, "Unauthorized"));
  }
};
