const router = require('express').Router();
const ctrl   = require('../controllers/tts.controller');
router.post('/synthesize', ctrl.synthesize);
module.exports = router;
