// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

// Render login page
router.get("/login", (req, res) => {
  res.render("login");
});

// Render signup page
router.get("/signup", (req, res) => {
  res.render("signup");
});

// Signup POST
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send("Email already exists");
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    // Start session
    req.session.userId = user._id;

    // Redirect new user to feed page
    res.redirect("/feed");
  } catch (err) {
    console.error(err);
    res.send("Error signing up");
  }
});

// Login POST
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.send("User not found");

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send("Incorrect password");

    // Start session
    req.session.userId = user._id;

    //Redirect logged-in user to feed page
    res.redirect("/feed");
  } catch (err) {
    console.error(err);
    res.send("Error logging in");
  }
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

module.exports = router;
