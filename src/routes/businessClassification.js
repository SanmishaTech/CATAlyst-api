const express = require("express");
const { searchClientEdge, getOrderFieldsGrouped } = require("../controllers/businessClassificationController");

const router = express.Router();

// GET /api/business-classification/client-edge
router.get("/client-edge", searchClientEdge);

// GET /api/business-classification/order-fields
router.get("/order-fields", getOrderFieldsGrouped);

module.exports = router;
