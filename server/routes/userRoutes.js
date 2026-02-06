const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - 모든 사용자 조회
router.get('/', userController.getAllUsers);

// GET /api/users/:id - 특정 사용자 조회
router.get('/:id', userController.getUserById);

// POST /api/users - 새 사용자 생성
router.post('/', userController.createUser);

// PUT /api/users/:id - 사용자 정보 수정
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - 사용자 삭제
router.delete('/:id', userController.deleteUser);

module.exports = router;
