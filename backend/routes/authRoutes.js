const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/authController");

// ⭐ CHANGED: signup instead of register, and added login route
router.post("/signup", register);
router.post("/login", login);

module.exports = router;