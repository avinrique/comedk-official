const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.get('/', authenticate, authorize('admin'), usersController.getUsers);
router.post('/', authenticate, authorize('admin'), usersController.createUser);
router.patch('/:id', authenticate, authorize('admin'), usersController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), usersController.deleteUser);

module.exports = router;
