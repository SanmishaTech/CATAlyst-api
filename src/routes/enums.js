const express = require("express");
const router = express.Router();
const { getAllOrderEnums, getEnumByName } = require("../controllers/enumsController");
const auth = require("../middleware/auth");

// Route is functional but hidden from Swagger documentation
router.get("/", auth, getAllOrderEnums);

// Route is functional but hidden from Swagger documentation
router.get("/:enumName", auth, getEnumByName);

module.exports = router;
