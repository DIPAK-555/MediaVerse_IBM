const Post = require("../models/Post");
const User = require("../models/User");

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const post = new Post({
      user: req.session.userId,
      content: req.body.content,
      // images: req.files.images
      //   ? req.files.images.map((f) => "/uploads/images/" + f.filename)
      //   : [],
      // videos: req.files.videos
      //   ? req.files.videos.map((f) => "/uploads/videos/" + f.filename)
      //   : [],
      images: req.files?.images ? req.files.images.map((f) => f.path) : [],
      videos: req.files?.videos ? req.files.videos.map((f) => f.path) : [],
    });

    await post.save();

    // Add post reference to user
    const user = await User.findById(req.session.userId);
    user.posts.push(post._id);
    await user.save();

    res.redirect("/users/profile");
  } catch (err) {
    console.error(err);
    res.send("Error creating post");
  }
};

// Get all posts of the logged-in user
exports.getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.session.userId }).sort({
      createdAt: -1,
    });
    res.render("feed", { posts });
  } catch (err) {
    console.error(err);
    res.send("Error fetching posts");
  }
};

// Get all posts from all users (for feed)
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name profilePicture")
      .sort({ createdAt: -1 });
    res.render("feed", { posts });
  } catch (err) {
    console.error(err);
    res.send("Error fetching feed");
  }
};

// Toggle share (share/unshare a post)
exports.toggleShare = async (req, res) => {
  try {
    const userId = req.session.userId;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const alreadyShared = post.shares.includes(userId);

    if (alreadyShared) {
      post.shares.pull(userId); // unshare
    } else {
      post.shares.push(userId); // share
    }

    await post.save();

    res.json({
      shares: post.shares.length,
      shared: !alreadyShared,
    });
  } catch (err) {
    console.error("Error toggling share:", err);
    res.status(500).json({ error: "Failed to share post" });
  }
};
