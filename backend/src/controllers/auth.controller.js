const authService = require('../services/auth.service');
const { success, error } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const verify = async (req, res) => {
  return success(res, { user: req.user }, 'Token is valid');
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user._id, currentPassword, newPassword);
    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, verify, changePassword };
