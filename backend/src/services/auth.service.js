const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (email, password) => {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account has been deactivated');
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const userObj = user.toJSON();

  return { token, user: userObj };
};

module.exports = { login };
