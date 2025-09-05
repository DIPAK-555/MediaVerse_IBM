// models/Comment.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true, // The comment must belong to a post
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, // The comment must belong to a user
  },
  content: {
    type: String,
    required: true, // The text of the comment
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, // When the comment was created
  },
});

module.exports = mongoose.model("Comment", commentSchema);
