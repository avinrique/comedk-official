const express = require('express');
const router = express.Router({ mergeParams: true });
const notesController = require('../controllers/notes.controller');
const authenticate = require('../middleware/authenticate');

router.get('/', authenticate, notesController.getNotes);
router.post('/', authenticate, notesController.createNote);

module.exports = router;
