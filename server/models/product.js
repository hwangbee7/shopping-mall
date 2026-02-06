const mongoose = require('mongoose');

/**
 * Product 스키마 정의
 * 
 * 필수 필드:
 * - sku: 상품 SKU (고유값, 필수)
 * - name: 상품명 (필수)
 * - price: 상품 가격 (필수)
 * - category: 카테고리 (필수, 상의/하의/악세서리/가방)
 * - image: 이미지 URL (필수, Cloudinary URL)
 * 
 * 선택 필드:
 * - description: 상품 설명 (선택)
 * - stock: 재고 수량 (기본값: 0)
 */
const productSchema = new mongoose.Schema({
  // SKU: 고유 상품 식별자 (필수, 유니크)
  sku: {
    type: String,
    required: [true, 'SKU는 필수입니다.'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true // 검색 성능 향상을 위한 인덱스
  },
  // 상품명 (필수)
  name: {
    type: String,
    required: [true, '상품 이름은 필수입니다.'],
    trim: true
  },
  // 상품 가격 (필수)
  price: {
    type: Number,
    required: [true, '상품 가격은 필수입니다.'],
    min: [0, '가격은 0 이상이어야 합니다.']
  },
  // 카테고리: 상의, 하의, 악세서리, 가방 (필수)
  category: {
    type: String,
    required: [true, '카테고리는 필수입니다.'],
    enum: {
      values: ['상의', '하의', '악세서리', '가방'],
      message: '카테고리는 상의, 하의, 악세서리, 가방 중 하나여야 합니다.'
    }
  },
  // 이미지 URL (필수, Cloudinary URL 저장)
  image: {
    type: String,
    required: [true, '이미지는 필수입니다.'],
    trim: true
  },
  // 상품 설명 (선택)
  description: {
    type: String,
    trim: true,
    default: ''
  },
  // 재고 수량 (기본값: 0)
  stock: {
    type: Number,
    default: 0,
    min: [0, '재고는 0 이상이어야 합니다.']
  }
}, {
  timestamps: true  // createdAt, updatedAt 자동 생성
});

// SKU 중복 검사를 위한 인덱스 (unique: true로 이미 설정되어 있지만 명시적으로 추가)
productSchema.index({ sku: 1 }, { unique: true });

// Product 모델 생성 및 export
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;
