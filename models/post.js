// models/Post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    images: [{ type: String }],
    videos: [{ type: String }],

    // Likes (who liked this post)
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Shares (who shared this post)
    shares: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Comments (array of comment IDs)
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

// Prevent OverwriteModelError in dev/hot-reload
module.exports = mongoose.models.Post || mongoose.model("Post", postSchema);
