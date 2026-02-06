const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// POST /api/auth/login - 로그인 (토큰 발급)
router.post('/login', authController.login);

// GET /api/auth/me - 현재 사용자 정보 조회 (토큰 필요)
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;
