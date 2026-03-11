const express = require('express');
const router = express.Router({ mergeParams: true });
const remindersController = require('../controllers/reminders.controller');
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, remindersController.getLeadReminders);
router.post('/', authenticate, remindersController.createReminder);

module.exports = router;
