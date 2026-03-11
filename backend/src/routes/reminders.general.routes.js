const express = require('express');
const router = express.Router();
const remindersController = require('../controllers/reminders.controller');
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, remindersController.getReminders);
router.patch('/:id', authenticate, remindersController.updateReminder);

module.exports = router;
