// routes/search.js
const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query.q || "";

    // search users
    const users = await User.find({ name: { $regex: q, $options: "i" } })
      .select("name email profilePicture")
      .limit(10);

    // search posts
    const posts = await Post.find({ content: { $regex: q, $options: "i" } })
      .select("content user")
      .populate("user", "name profilePicture")
      .limit(10);

    res.json({ users, posts });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
