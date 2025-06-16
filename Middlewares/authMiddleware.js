const jwt = require('jsonwebtoken');
const db  = require('../Models');

exports.authenticate = (req, res, next) => {
  const raw = req.headers['authorization'] || '';
  const token = raw.split(' ')[0] === 'Bearer' ? raw.split(' ')[1] : raw;

  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    
    // Asegurar que el decoded tenga UserId en lugar de solo id
    req.user = {
      UserId: decoded.id, 
      Email: decoded.email,
      Role: decoded.role
    };
    next();
  });
};

exports.authorize = (roles = []) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  next();
};
