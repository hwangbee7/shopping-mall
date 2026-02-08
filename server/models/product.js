const mongoose = require('mongoose');

/**
 * Product 스키마
 * - SKU: 유니크 필수 필드
 * - 상품명: 필수 필드
 * - 가격: 필수 필드
 * - 카테고리: 상의, 하의, 악세서리 중 하나 (필수)
 * - 이미지: 이미지 URL (필수)
 * - 설명: 선택 필드
 */
const productSchema = new mongoose.Schema({
  // SKU: 상품 고유 식별자 (유니크, 필수)
  sku: {
    type: String,
    required: [true, 'SKU는 필수입니다.'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  // 상품명: 필수
  name: {
    type: String,
    required: [true, '상품 이름은 필수입니다.'],
    trim: true
  },
  // 상품 가격: 필수
  price: {
    type: Number,
    required: [true, '상품 가격은 필수입니다.'],
    min: [0, '가격은 0 이상이어야 합니다.']
  },
  // 카테고리: 상의, 하의, 악세서리 (필수)
  category: {
    type: String,
    required: [true, '카테고리는 필수입니다.'],
    enum: {
      values: ['상의', '하의', '악세서리'],
      message: '카테고리는 상의, 하의, 악세서리 중 하나여야 합니다.'
    }
  },
  // 이미지: 이미지 URL (필수)
  image: {
    type: String,
    required: [true, '이미지는 필수입니다.'],
    trim: true
  },
  // 설명: 선택 필드
  description: {
    type: String,
    trim: true,
    default: ''
  },
  // 재고: 기본값 0
  stock: {
    type: Number,
    default: 0,
    min: [0, '재고는 0 이상이어야 합니다.']
  }
}, {
  timestamps: true  // createdAt, updatedAt 자동 생성
});

// SKU 유니크 인덱스 (중복 방지)
productSchema.index({ sku: 1 }, { unique: true });

// Product 모델 생성 및 export
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
