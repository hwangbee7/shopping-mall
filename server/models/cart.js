const mongoose = require('mongoose');

/**
 * Cart 스키마
 * - 사용자별 장바구니 관리
 * - 장바구니 아이템 배열 포함
 */
const cartSchema = new mongoose.Schema({
  // 사용자 ID (참조)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '사용자 ID는 필수입니다.'],
    unique: true, // 사용자당 하나의 장바구니만
    index: true
  },
  // 장바구니 아이템 배열
  items: [{
    // 상품 ID (참조)
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, '상품 ID는 필수입니다.']
    },
    // 수량
    quantity: {
      type: Number,
      required: [true, '수량은 필수입니다.'],
      min: [1, '수량은 1개 이상이어야 합니다.']
    },
    // 구매 시점 가격 (상품 가격이 변경되어도 장바구니 가격 유지)
    price: {
      type: Number,
      required: [true, '가격은 필수입니다.'],
      min: [0, '가격은 0 이상이어야 합니다.']
    },

  }],
  // 장바구니 총 금액 (자동 계산 가능)
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, '총 금액은 0 이상이어야 합니다.']
  }
}, {
  timestamps: true  // createdAt, updatedAt 자동 생성
});

// 사용자별 유니크 인덱스
cartSchema.index({ userId: 1 }, { unique: true });

// 장바구니 총 금액 자동 계산 (가상 필드)
cartSchema.virtual('calculatedTotal').get(function() {
  return this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
});

// 장바구니 저장 전 총 금액 계산
cartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
  next();
});

// Cart 모델 생성 및 export
const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
