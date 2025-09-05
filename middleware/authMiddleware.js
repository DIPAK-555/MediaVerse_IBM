// Authentication middleware to protect routes
function isLoggedIn(req, res, next) {
  // Check if the user session exists
  if (!req.session.userId) {
    // If not logged in, redirect to login page
    return res.redirect("/login");
  }
  // If logged in, proceed to the next middleware or route
  next();
}

module.exports = { isLoggedIn };
