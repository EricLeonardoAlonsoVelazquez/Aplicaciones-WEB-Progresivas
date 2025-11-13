const express = require('express');
const router = express.Router();
const readingController = require('../controller/readingController');
const { authenticateToken } = require('../middleware/auth');

router.get('/my-readings', authenticateToken, readingController.getUserReadings);
router.get('/my-stats', authenticateToken, readingController.getUserStats);
router.get('/latest-reading', authenticateToken, readingController.getLatestReading);
router.post('/', authenticateToken, readingController.createReading);

module.exports = router;