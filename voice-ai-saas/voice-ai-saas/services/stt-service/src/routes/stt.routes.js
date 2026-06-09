const router = require('express').Router();
const multer = require('multer');
const upload = multer({ dest: '/tmp/voiceai-audio/' });
const ctrl   = require('../controllers/stt.controller');
router.post('/transcribe', upload.single('audio'), ctrl.transcribe);
module.exports = router;
