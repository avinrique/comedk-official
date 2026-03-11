const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, authController.login);
router.get('/verify', authenticate, authController.verify);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
