const jwt = require('jsonwebtoken');
const User = require('../models/user.js');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '')
      : null;

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user and ensure still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found or token not valid' });
    }

    // Attach relevant user info to req.user (userId, role, etc.)
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,           // <-- For admin check middleware!
      name: user.name,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = auth;
