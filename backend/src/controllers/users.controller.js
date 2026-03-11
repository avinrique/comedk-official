const User = require('../models/User');
const { success, error } = require('../utils/response');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    return success(res, { users }, 'Users fetched successfully');
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return error(res, 'A user with this email already exists', 409);
    }

    const user = new User({ name, email, password, role, phone });
    await user.save();

    return success(res, { user: user.toJSON() }, 'User created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.password) {
      const User = require('../models/User');
      const user = await User.findById(id);
      if (!user) {
        return error(res, 'User not found', 404);
      }
      user.password = updates.password;
      delete updates.password;
      Object.keys(updates).forEach((key) => {
        user[key] = updates[key];
      });
      await user.save();
      return success(res, { user: user.toJSON() }, 'User updated successfully');
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return error(res, 'User not found', 404);
    }

    return success(res, { user }, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return error(res, 'User not found', 404);
    }

    if (user._id.toString() === req.user._id.toString()) {
      return error(res, 'You cannot deactivate your own account', 400);
    }

    user.isActive = false;
    await user.save();

    return success(res, { user: user.toJSON() }, 'User deactivated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
