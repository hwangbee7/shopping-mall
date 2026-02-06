const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products - 모든 상품 조회
router.get('/', productController.getAllProducts);

// GET /api/products/category/:category - 카테고리별 상품 조회
router.get('/category/:category', productController.getProductsByCategory);

// GET /api/products/sku/:sku - SKU로 상품 조회
router.get('/sku/:sku', productController.getProductBySku);

// GET /api/products/:id - 특정 상품 조회
router.get('/:id', productController.getProductById);

// POST /api/products - 새 상품 생성
router.post('/', productController.createProduct);

// PUT /api/products/:id - 상품 정보 수정
router.put('/:id', productController.updateProduct);

// DELETE /api/products/:id - 상품 삭제
router.delete('/:id', productController.deleteProduct);

module.exports = router;
