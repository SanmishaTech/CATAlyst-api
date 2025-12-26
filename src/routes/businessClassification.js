const express = require("express");
const { searchClientEdge, searchBookingMatrix, searchCounterPartyMatrix, getOrderFieldsGrouped } = require("../controllers/businessClassificationController");

const router = express.Router();

// GET /api/business-classification/client-edge
router.get("/client-edge", searchClientEdge);
router.get("/booking-matrix", searchBookingMatrix);
router.get("/counterparty-matrix", searchCounterPartyMatrix);

// GET /api/business-classification/order-fields
router.get("/order-fields", getOrderFieldsGrouped);

// GET /api/business-classification/execution-fields
router.get("/execution-fields", getExecutionFieldsGrouped);

module.exports = router;
