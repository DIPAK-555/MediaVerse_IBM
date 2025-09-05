const User = require("../models/user.js");
const Post = require("../models/post.js");

// Show logged-in user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate("posts");
    res.render("profile", { user });
  } catch (err) {
    console.error(err);
    res.send("Error fetching profile");
  }
};

// Update logged-in user profile
exports.updateProfile = async (req, res) => {
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
      user.profilePicture = req.file.path; // Cloudinary URL
    }

    await user.save();
    res.redirect("/users/profile");
  } catch (err) {
    console.error(err);
    res.send("Error updating profile");
  }
};

// View another user's profile by ID
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("posts");
    if (!user) return res.send("User not found");

    res.render("profile", { user });
  } catch (err) {
    console.error(err);
    res.send("Error fetching user profile");
  }
};
