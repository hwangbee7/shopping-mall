const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/authMiddleware');

// 모든 장바구니 라우트는 인증 필요
router.use(authenticateToken);

// GET /api/cart - 현재 사용자의 장바구니 조회
router.get('/', cartController.getCart);

// POST /api/cart/items - 장바구니에 아이템 추가
router.post('/items', cartController.addItemToCart);

// PUT /api/cart/items/:itemId - 장바구니 아이템 수량 수정
router.put('/items/:itemId', cartController.updateCartItem);

// DELETE /api/cart/items/:itemId - 장바구니 아이템 삭제
router.delete('/items/:itemId', cartController.removeCartItem);

// DELETE /api/cart - 장바구니 전체 비우기
router.delete('/', cartController.clearCart);

module.exports = router;
