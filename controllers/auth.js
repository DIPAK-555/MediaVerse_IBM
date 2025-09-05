const User = require("../models/User");
const bcrypt = require("bcrypt");

// Render signup page
exports.getSignup = (req, res) => {
  res.render("signup");
};

// Render login page
exports.getLogin = (req, res) => {
  res.render("login");
};

// Handle signup
exports.signup = async (req, res) => {
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

    res.redirect("/users/profile");
  } catch (err) {
    console.error(err);
    res.send("Error signing up");
  }
};

// Handle login
exports.login = async (req, res) => {
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

    res.redirect("/users/profile");
  } catch (err) {
    console.error(err);
    res.send("Error logging in");
  }
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect("/login");
};
