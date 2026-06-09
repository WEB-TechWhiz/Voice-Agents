const router = require('express').Router();
const ctrl   = require('../controllers/notify.controller');
router.post('/send-followup', ctrl.sendFollowUp);
module.exports = router;
