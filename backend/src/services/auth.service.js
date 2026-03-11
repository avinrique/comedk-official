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

const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    const err = new Error('Current password and new password are required');
    err.statusCode = 400;
    throw err;
  }

  if (newPassword.length < 6) {
    const err = new Error('New password must be at least 6 characters');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId).select('+password');

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 401;
    throw err;
  }

  user.password = newPassword;
  await user.save();
};

module.exports = { login, changePassword };
