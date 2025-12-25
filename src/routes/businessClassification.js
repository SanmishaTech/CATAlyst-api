const express = require("express");
const { searchClientEdge } = require("../controllers/businessClassificationController");

const router = express.Router();

// GET /api/business-classification/client-edge
router.get("/client-edge", searchClientEdge);

module.exports = router;
