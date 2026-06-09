const router = require('express').Router();
const ctrl   = require('../controllers/call.controller');
const { validateTwilioSignature } = require('../middleware/twilioAuth');

router.post('/call-connect',    validateTwilioSignature, ctrl.handleIncoming);
router.post('/call-status',     validateTwilioSignature, ctrl.handleStatus);
router.post('/gather-response', validateTwilioSignature, ctrl.handleGather);

module.exports = router;
