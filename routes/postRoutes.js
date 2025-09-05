const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/comments");

const router = express.Router();

/* ---------- Auth guard ---------- */
function isLoggedIn(req, res, next) {
  if (!req.session?.userId) {
    // For fetch/AJAX -> JSON; for pages -> redirect
    if (req.xhr || (req.headers.accept || "").includes("json")) {
      return res.status(401).json({ error: "Login required" });
    }
    return res.redirect("/login");
  }
  next();
}

/* ---------- Ensure upload directories exist ---------- */
const IMG_DIR = path.join(__dirname, "..", "public", "uploads", "images");
const VID_DIR = path.join(__dirname, "..", "public", "uploads", "videos");
[IMG_DIR, VID_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

/* ---------- Multer storage ---------- */
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     if (file.mimetype.startsWith("image/")) return cb(null, IMG_DIR);
//     if (file.mimetype.startsWith("video/")) return cb(null, VID_DIR);
//     // default to images to avoid hanging if mimetype is odd
//     return cb(null, IMG_DIR);
//   },
//   filename: function (req, file, cb) {
//     const safeName = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, safeName + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage });
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: isVideo ? "media_verse/videos" : "media_verse/images",
      resource_type: isVideo ? "video" : "image",
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});
const upload = multer({ storage });

/* ---------- CREATE POST ---------- */
// router.post(
//   "/create",
//   isLoggedIn,
//   upload.fields([
//     { name: "images", maxCount: 5 },
//     { name: "videos", maxCount: 2 },
//   ]),
//   async (req, res) => {
//     try {
//       const images = (req.files?.images || []).map(
//         (f) => "/uploads/images/" + f.filename
//       );
//       const videos = (req.files?.videos || []).map(
//         (f) => "/uploads/videos/" + f.filename
//       );
//       const content = (req.body.content || "").trim();

//       // server-side guard (matches your client alert)
//       if (!content && images.length === 0 && videos.length === 0) {
//         if (req.xhr || (req.headers.accept || "").includes("json")) {
//           return res.status(400).json({ error: "Post cannot be empty." });
//         }
//         // flash-like fallback
//         return res.redirect("/profile");
//       }

//       const post = await Post.create({
//         user: req.session.userId,
//         content,
//         images,
//         videos,
//       });

//       // link to user
//       await User.findByIdAndUpdate(req.session.userId, {
//         $push: { posts: post._id },
//       });

//       // For AJAX, return JSON; for normal form, redirect to profile
//       if (req.xhr || (req.headers.accept || "").includes("json")) {
//         const populated = await Post.findById(post._id).populate(
//           "user",
//           "name profilePicture"
//         );
//         return res.json({ ok: true, post: populated });
//       }

//       return res.redirect("/profile");
//     } catch (err) {
//       console.error("Error creating post:", err);
//       if (req.xhr || (req.headers.accept || "").includes("json")) {
//         return res.status(500).json({ error: "Error creating post" });
//       }
//       return res.status(500).send("Error creating post");
//     }
//   }
// );
router.post(
  "/create",
  isLoggedIn,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 2 },
  ]),
  async (req, res) => {
    try {
      const images = (req.files?.images || []).map((f) => f.path); // Cloudinary URLs
      const videos = (req.files?.videos || []).map((f) => f.path); // Cloudinary URLs
      const content = (req.body.content || "").trim();

      if (!content && images.length === 0 && videos.length === 0) {
        if (req.xhr || (req.headers.accept || "").includes("json")) {
          return res.status(400).json({ error: "Post cannot be empty." });
        }
        return res.redirect("/profile");
      }

      const post = await Post.create({
        user: req.session.userId,
        content,
        images,
        videos,
      });

      await User.findByIdAndUpdate(req.session.userId, {
        $push: { posts: post._id },
      });

      if (req.xhr || (req.headers.accept || "").includes("json")) {
        const populated = await Post.findById(post._id).populate(
          "user",
          "name profilePicture"
        );
        return res.json({ ok: true, post: populated });
      }

      return res.redirect("/profile");
    } catch (err) {
      console.error("Error creating post:", err);
      if (req.xhr || (req.headers.accept || "").includes("json")) {
        return res.status(500).json({ error: "Error creating post" });
      }
      return res.status(500).send("Error creating post");
    }
  }
);

/* ---------- DELETE POST ---------- */
// router.delete("/:id", isLoggedIn, async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deleted = await Post.findOneAndDelete({
//       _id: id,
//       user: req.session.userId, // owners only
//     });

//     if (!deleted) {
//       return res.status(404).json({ error: "Post not found" });
//     }

//     await User.findByIdAndUpdate(req.session.userId, { $pull: { posts: id } });

//     return res.json({ ok: true, message: "Post deleted" });
//   } catch (err) {
//     console.error("Error deleting post:", err);
//     return res.status(500).json({ error: "Error deleting post" });
//   }
// });

router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });

    // Only allow owner to delete
    if (String(post.user) !== String(req.session.userId)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Delete images from Cloudinary
    for (const img of post.images) {
      const publicId = img.split("/").pop().split(".")[0]; // extract public_id
      await cloudinary.uploader.destroy(`media_verse/images/${publicId}`);
    }

    // Delete videos from Cloudinary
    for (const vid of post.videos) {
      const publicId = vid.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`media_verse/videos/${publicId}`, {
        resource_type: "video",
      });
    }

    // Finally delete post from DB
    await post.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting post" });
  }
});

/* ---------- OPTIONAL: list endpoints ---------- */
/* If you don't have a views/feed.ejs, prefer returning JSON. */

router.get("/my-posts", isLoggedIn, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.session.userId })
      .populate("user", "name email profilePicture")
      .sort({ createdAt: -1 });

    // If you want a page, change to: res.render("profile", { user, posts })
    if (req.xhr || (req.headers.accept || "").includes("json")) {
      return res.json({ posts });
    }
    return res.render("feed", {
      posts,
      user: await User.findById(req.session.userId),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error fetching posts");
  }
});

router.get("/all", isLoggedIn, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name email profilePicture")
      .populate({
        path: "comments",
        populate: { path: "user", select: "name profilePicture" },
      })
      .sort({ createdAt: -1 });

    // If you want a page, change to: res.render("profile", { user, posts })
    if (req.xhr || (req.headers.accept || "").includes("json")) {
      return res.json({ posts });
    }
    return res.render("feed", {
      posts,
      user: await User.findById(req.session.userId),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error fetching posts");
  }
});
/* ---------- LIKE / UNLIKE POST ---------- */
router.post("/:id/like", isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.session.userId; // ⚡ you use session, not req.user._id

    if (post.likes.includes(userId)) {
      // Unlike
      post.likes.pull(userId);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();

    return res.json({
      likes: post.likes.length,
      likedBy: post.likes, // list of user IDs
    });
  } catch (err) {
    console.error("Error liking post:", err);
    return res.status(500).json({ error: "Error liking post" });
  }
});
/* ---------- COMMENT ON A POST ---------- */
router.post("/:id/comment", isLoggedIn, async (req, res) => {
  try {
    const comment = await Comment.create({
      post: req.params.id,
      user: req.session.userId,
      content: req.body.content,
    });

    //Push comment into post.comments[]
    await Post.findByIdAndUpdate(req.params.id, {
      $push: { comments: comment._id },
    });

    const populated = await comment.populate("user", "name profilePicture");
    return res.json(populated);
  } catch (err) {
    console.error("Error commenting on post:", err);
    return res.status(500).json({ error: "Error commenting" });
  }
});

/* ---------- SHARE A POST ---------- */
/* ---------- SHARE / UNSHARE A POST ---------- */
router.post("/:id/share", isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.session.userId;

    let shared;
    if (post.shares.includes(userId)) {
      // Already shared → unshare
      post.shares.pull(userId);
      shared = false;
    } else {
      // Not shared yet → share
      post.shares.push(userId);
      shared = true;
    }

    await post.save();

    return res.json({
      shares: post.shares.length,
      shared, // true if user just shared, false if unshared
    });
  } catch (err) {
    console.error("Error sharing post:", err);
    return res.status(500).json({ error: "Error sharing post" });
  }
});

// GET /posts/search?query=...
router.get("/search", async (req, res) => {
  try {
    const q = req.query.query || "";
    const posts = await Post.find({ content: { $regex: q, $options: "i" } })
      .populate("user", "name profilePicture")
      .limit(20)
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

module.exports = router;
