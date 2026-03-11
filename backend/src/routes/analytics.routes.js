const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middleware/authenticate');

router.get('/overview', authenticate, analyticsController.getOverview);
router.get('/stats', authenticate, analyticsController.getStats);
router.get('/pipeline', authenticate, analyticsController.getPipeline);
router.get('/sources', authenticate, analyticsController.getSources);
router.get('/trends', authenticate, analyticsController.getTrends);

module.exports = router;
