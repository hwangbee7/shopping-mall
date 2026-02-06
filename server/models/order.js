const mongoose = require('mongoose');

/**
 * Order(주문) 스키마
 *
 * 포함 필드 요약:
 * - 주문 식별: orderNumber(주문번호), userId(주문자)
 * - 주문 상품: items(상품 스냅샷 - productId, name, price, quantity, image 등)
 * - 배송: 수령인 이름/연락처/주소
 * - 결제: 결제수단, 결제상태, 주문총액, 할인
 * - 상태: orderStatus(주문 상태), 메모
 */
const orderItemSchema = new mongoose.Schema({
  // 상품 ID (참조용, 주문 후 상품 정보 변경 대비 스냅샷 저장)
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, '상품 ID는 필수입니다.']
  },
  // 주문 시점 상품명 (스냅샷)
  name: {
    type: String,
    required: [true, '상품명은 필수입니다.'],
    trim: true
  },
  // 주문 시점 단가 (스냅샷)
  price: {
    type: Number,
    required: [true, '가격은 필수입니다.'],
    min: [0, '가격은 0 이상이어야 합니다.']
  },
  // 주문 수량
  quantity: {
    type: Number,
    required: [true, '수량은 필수입니다.'],
    min: [1, '수량은 1개 이상이어야 합니다.']
  },
  // 주문 시점 이미지 URL (선택, 주문 내역 표시용)
  image: {
    type: String,
    trim: true,
    default: ''
  },
  // 옵션 (사이즈/색상 등 추후 확장용)
  size: { type: String, trim: true, default: '' },
  color: { type: String, trim: true, default: '' }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  // 주문번호 (사람이 읽기 쉬운 고유 번호, 예: ORD-20250205-0001)
  orderNumber: {
    type: String,
    required: [true, '주문번호는 필수입니다.'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  // 주문자 (User 참조)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '주문자 ID는 필수입니다.'],
    index: true
  },
  // 주문 상품 목록 (스냅샷)
  items: {
    type: [orderItemSchema],
    required: [true, '주문 상품은 필수입니다.'],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: '최소 1개 이상의 상품이 필요합니다.'
    }
  },
  // --- 배송 정보 ---
  recipientName: {
    type: String,
    required: [true, '수령인 이름은 필수입니다.'],
    trim: true
  },
  recipientPhone: {
    type: String,
    required: [true, '수령인 연락처는 필수입니다.'],
    trim: true
  },
  shippingAddress: {
    // 우편번호
    postalCode: { type: String, trim: true, default: '' },
    // 기본 주소 (도로명/지번)
    address: {
      type: String,
      required: [true, '배송 주소는 필수입니다.'],
      trim: true
    },
    // 상세 주소 (동, 호수 등)
    addressDetail: { type: String, trim: true, default: '' }
  },
  // --- 결제 정보 ---
  paymentMethod: {
    type: String,
    required: [true, '결제 수단은 필수입니다.'],
    enum: {
      values: ['card', 'transfer', 'mobile', 'kakao', 'naver', 'etc'],
      message: '지원하는 결제 수단이 아닙니다.'
    }
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
      message: '유효한 결제 상태가 아닙니다.'
    },
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  },
  // 결제 PG사 거래 식별자 (중복 주문 방지, 결제 검증용)
  merchantUid: { type: String, trim: true, default: '', sparse: true },
  impUid: { type: String, trim: true, default: '' },
  // --- 금액 ---
  // 상품 합계 (items 기준 계산)
  subtotal: {
    type: Number,
    required: [true, '상품 합계는 필수입니다.'],
    min: [0, '상품 합계는 0 이상이어야 합니다.']
  },
  // 할인 금액 (총 할인)
  discount: {
    type: Number,
    default: 0,
    min: [0, '할인 금액은 0 이상이어야 합니다.']
  },
  // 최종 결제 금액 (subtotal - discount)
  totalAmount: {
    type: Number,
    required: [true, '총 결제 금액은 필수입니다.'],
    min: [0, '총 결제 금액은 0 이상이어야 합니다.']
  },
  // --- 주문 상태 (한국어) ---
  orderStatus: {
    type: String,
    enum: {
      values: ['주문 확인', '상품 준비중', '배송시작', '배송중', '배송완료', '주문취소'],
      message: '유효한 주문 상태가 아닙니다.'
    },
    default: '주문 확인'
  },
  // 배송 추적 번호 (발송 후 입력)
  trackingNumber: { type: String, trim: true, default: '' },
  shippedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  // 주문/배송 메모 (고객 요청사항 등)
  memo: { type: String, trim: true, default: '' }
}, {
  timestamps: true
});

// 인덱스: 주문번호 유니크, 사용자별 주문 조회, 결제 거래 ID 유니크(중복 주문 방지)
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ merchantUid: 1 }, { unique: true, sparse: true });

// 저장 전 totalAmount 검증: subtotal - discount = totalAmount
orderSchema.pre('save', function(next) {
  const expected = this.subtotal - this.discount;
  if (this.totalAmount !== expected) {
    this.totalAmount = Math.max(0, Math.round(expected));
  }
  next();
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
module.exports = Order;
