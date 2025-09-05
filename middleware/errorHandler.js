// backend/middleware/errorHandler.js

// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error(err.stack); // Log the full error stack for debugging

  // Check if response has already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Set default status code and message
  const statusCode = err.status || 500;
  const message = err.message || "Something went wrong!";

  // If request expects JSON (API), send JSON response
  if (
    req.xhr ||
    (req.headers.accept && req.headers.accept.indexOf("json") > -1)
  ) {
    return res.status(statusCode).json({ error: message });
  }

  // Otherwise render an error page (for web requests)
  res.status(statusCode).render("error", { statusCode, message });
}

module.exports = { errorHandler };
