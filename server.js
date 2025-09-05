// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");

// Models (needed for /profile render)
const User = require("./models/user.js");

// Routes
const authRoutes = require("./routes/authRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const postRoutes = require("./routes/postRoutes.js");
const commentRoutes = require("./routes/commentRoutes.js");
const searchRoutes = require("./routes/searchRoutes.js");

// Middleware
const { errorHandler } = require("./middleware/errorHandler.js");

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// ===== Connect to MongoDB =====
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

// ===== Middleware =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // Serve static files
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { secure: false }, // set true if using HTTPS + proper proxy
  })
);

// ===== View Engine =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== API Routes =====
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/comments", commentRoutes); // Added this line
app.use("/search", searchRoutes);

// ===== EJS Pages =====
app.get("/", (req, res) => res.render("home"));

app.get("/login", (req, res) => {
  res.render("login", { mounted: true, errors: {}, formData: {} });
});

app.get("/signup", (req, res) =>
  res.render("signup", { mounted: true, errors: {}, formData: {} })
);

app.get("/profile", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId).populate({
      path: "posts",
      populate: {
        path: "user",
        select: "name profilePicture",
      },
    });
    res.render("profile", { user, posts: user.posts });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .render("error", { statusCode: 500, message: "Server Error" });
  }
});

// Optional: route /feed to the posts feed that already populates data
app.get("/feed", (req, res) => res.redirect("/posts/all"));

// ===== Error Handler =====
app.use(errorHandler);

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}`);
});
