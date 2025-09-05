const express = require("express");
const User = require("../models/user.js");
const Post = require("../models/post.js");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const path = require("path");

const router = express.Router();

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// Multer setup for profile picture uploads
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "public/uploads/images");
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage });

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "media_verse/avatars",
    resource_type: "image",
    public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});

const upload = multer({ storage: avatarStorage });

// ===== GET USER PROFILE =====
router.get("/profile", isLoggedIn, async (req, res) => {
  try {
    //1 try :  // const user = await User.findById(req.session.userId).populate({
    //   path: "posts",
    //   populate: {
    //     path: "user",
    //     select: "name profilePicture", // ensures username + pic load in posts
    //   },
    // });
    //2 try :  // const user = await User.findById(req.session.userId).populate({
    //   path: "posts",
    //   populate: {
    //     path: "user",
    //     select: "name profilePicture",
    //   },
    // });

    const user = await User.findById(req.session.userId).populate({
      path: "posts",
      populate: [
        { path: "user", select: "name profilePicture" },
        {
          path: "comments",
          populate: { path: "user", select: "name profilePicture" },
        },
      ],
    });

    res.render("profile", { user });
  } catch (err) {
    console.error(err);
    res.send("Error fetching profile");
  }
});

// ===== UPDATE PROFILE INFO =====
router.post(
  "/update",
  isLoggedIn,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const user = await User.findById(req.session.userId);

      // Update name or bio if provided
      if (req.body.name) user.name = req.body.name;
      if (req.body.bio) user.bio = req.body.bio;

      // Update profile picture if uploaded
      // if (req.file) {
      //   user.profilePicture = "/uploads/images/" + req.file.filename;
      // }
      if (req.file) {
        user.profilePicture = req.file.path; // Cloudinary gives you the full URL
      }

      await user.save();
      res.redirect("/profile");
    } catch (err) {
      console.error(err);
      res.send("Error updating profile");
    }
  }
);

// ===== GET OTHER USER PROFILE (optional) =====
// ===== GET OTHER USER PROFILE =====
router.get("/:id", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate({
      path: "posts",
      populate: {
        path: "user",
        select: "name profilePicture",
      },
    });

    if (!user) return res.send("User not found");
    res.render("profile", { user, posts: user.posts });
  } catch (err) {
    console.error(err);
    res.send("Error fetching user profile");
  }
});
// GET /users/search?query=...
router.get("/search", async (req, res) => {
  try {
    const q = req.query.query || "";
    const users = await User.find({ name: { $regex: q, $options: "i" } })
      .select("name profilePicture")
      .limit(10);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
