const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/authMiddleware');

// 모든 주문 라우트는 인증 필요
router.use(authenticateToken);

// GET /api/orders - 주문 목록 (본인 주문만, admin은 전체)
router.get('/', orderController.getAllOrders);

// GET /api/orders/:id - 주문 단건 조회
router.get('/:id', orderController.getOrderById);

// POST /api/orders - 주문 생성
router.post('/', orderController.createOrder);

// PUT /api/orders/:id - 주문 수정
router.put('/:id', orderController.updateOrder);

// DELETE /api/orders/:id - 주문 삭제 (admin 전용)
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
