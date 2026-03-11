const express = require('express');
const router = express.Router();
const predictorController = require('../controllers/predictor.controller');
const { publicLimiter } = require('../middleware/rateLimiter');

router.get('/exams', predictorController.getExams);
router.post('/predict', publicLimiter, predictorController.predict);

module.exports = router;
