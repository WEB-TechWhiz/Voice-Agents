const router = require('express').Router();
const ctrl   = require('../controllers/nlu.controller');
router.post('/process', ctrl.process);
module.exports = router;
