// routes/comments.js
const express = require("express");
const Comment = require("../models/comments.js");
const Post = require("../models/post.js");

const router = express.Router();

/**
 * GET all comments for a specific post
 * GET /comments/:postId
 */
router.get("/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate({
      path: "comments",
      populate: { path: "user", select: "name profilePicture" },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post.comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Error fetching comments" });
  }
});

/**
 * Add a new comment
 * POST /comments
 */
router.post("/", async (req, res) => {
  try {
    const { content, userId, postId } = req.body;

    // Validation
    if (!content || !userId || !postId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Save comment
    const newComment = new Comment({
      content,
      user: userId,
      post: postId,
    });
    await newComment.save();

    // 2. Push comment ID into post.comments[]
    await Post.findByIdAndUpdate(postId, {
      $push: { comments: newComment._id },
    });

    // 3. Populate user before returning
    const populatedComment = await newComment.populate(
      "user",
      "name profilePicture"
    );

    res.status(201).json(populatedComment);
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
