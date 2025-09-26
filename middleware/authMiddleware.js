// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const verifyToken = (req, res, next) => {
  // Try Authorization header first, then x-access-token
  const authHeader = req.headers.authorization || req.headers['x-access-token'] || req.headers['token'];

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Bearer token support
  let token = authHeader;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7, authHeader.length);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach convenient properties to req
    req.user = decoded;
    req.userId = decoded.id;
    req.role = decoded.role; // lowercase role string as signed in token
    next();
  } catch (err) {
    console.error('Token verify error:', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// requireRole(['admin','teacher'])
const requireRole = (allowedRoles = []) => (req, res, next) => {
  if (!req.role) return res.status(401).json({ message: 'No role in token' });
  const normalized = req.role.toString().toLowerCase();
  const allowedNormalized = allowedRoles.map(r => r.toString().toLowerCase());
  if (!allowedNormalized.includes(normalized)) {
    return res.status(403).json({ message: 'Forbidden: insufficient privileges' });
  }
  next();
};

const authenticateTeacher = [verifyToken, requireRole(['teacher'])];

module.exports = { verifyToken, requireRole, authenticateTeacher };
