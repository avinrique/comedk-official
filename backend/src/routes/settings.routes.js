const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { success, error } = require('../utils/response');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

// Public: get specific setting by key (for frontend config)
router.get('/public/:key', async (req, res, next) => {
  try {
    const val = await Setting.get(req.params.key, null);
    return success(res, { key: req.params.key, value: val });
  } catch (err) {
    next(err);
  }
});

// Admin: get all settings
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const settings = await Setting.find().lean();
    return success(res, { settings });
  } catch (err) {
    next(err);
  }
});

// Admin: update a setting
router.put('/:key', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const doc = await Setting.set(req.params.key, req.body.value);
    return success(res, { setting: doc }, 'Setting updated');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
