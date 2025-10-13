const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authenticateToken, authController.verifyToken);
router.post('/logout', authController.logout);

module.exports = router;