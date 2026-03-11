const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leads.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { publicLimiter } = require('../middleware/rateLimiter');

router.post('/', publicLimiter, leadsController.createLead);

router.get('/', authenticate, leadsController.getLeads);

router.get('/export', authenticate, leadsController.exportLeads);

router.get('/:id', authenticate, leadsController.getLeadById);

router.patch('/:id', authenticate, leadsController.updateLead);

router.delete('/:id', authenticate, authorize('admin'), leadsController.deleteLead);

module.exports = router;
