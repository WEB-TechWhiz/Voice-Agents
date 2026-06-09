const router = require('express').Router();
const ctrl   = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/stats',          ctrl.getStats);
router.get('/calls/recent',   ctrl.getRecentCalls);
router.get('/leads/summary',  ctrl.getLeadSummary);
module.exports = router;
