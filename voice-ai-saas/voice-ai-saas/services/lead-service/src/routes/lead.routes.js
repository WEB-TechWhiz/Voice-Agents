const router = require('express').Router();
const ctrl   = require('../controllers/lead.controller');
router.post('/',          ctrl.createLead);
router.get('/',           ctrl.getLeads);
router.get('/:id',        ctrl.getLead);
router.patch('/:id',      ctrl.updateLead);
module.exports = router;
