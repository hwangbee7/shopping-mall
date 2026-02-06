const Order = require('../models/order');
const mongoose = require('mongoose');

/** PortOne(아임포트) 결제 검증: imp_uid로 결제 정보 조회 후 금액·상태 확인 */
async function verifyPortOnePayment(impUid, expectedAmount) {
  const apiKey = process.env.IAMPORT_API_KEY;
  const apiSecret = process.env.IAMPORT_API_SECRET;
  if (!apiKey || !apiSecret) return { ok: true }; // env 미설정 시 검증 생략

  const getTokenRes = await fetch('https://api.iamport.kr/users/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imp_key: apiKey, imp_secret: apiSecret })
  });
  const tokenData = await getTokenRes.json();
  const accessToken = tokenData?.response?.access_token;
  if (!accessToken) {
    return { ok: false, error: '결제 인증 토큰을 받지 못했습니다.' };
  }

  const payRes = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
    headers: { Authorization: accessToken }
  });
  const payData = await payRes.json();
  const pay = payData?.response;
  if (!pay) {
    return { ok: false, error: '결제 정보를 조회할 수 없습니다.' };
  }
  if (pay.status !== 'paid') {
    return { ok: false, error: `결제 상태가 완료가 아닙니다. (${pay.status})` };
  }
  const paidAmount = Number(pay.amount);
  if (Number.isNaN(paidAmount) || paidAmount !== Number(expectedAmount)) {
    return { ok: false, error: `결제 금액이 일치하지 않습니다. (결제: ${paidAmount}, 주문: ${expectedAmount})` };
  }
  return { ok: true };
}

/**
 * 주문번호 생성 (예: ORD-20250205-0001)
 * 당일 주문 건수 기준 시퀀스
 */
async function generateOrderNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${today}-`;
  const last = await Order.findOne({ orderNumber: new RegExp(`^${prefix}`) })
    .sort({ orderNumber: -1 })
    .select('orderNumber')
    .lean();
  const nextNum = last
    ? parseInt(last.orderNumber.slice(-4), 10) + 1
    : 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`.toUpperCase();
}

/**
 * 주문 생성 (Create)
 * POST /api/orders
 */
const PAYMENT_METHODS = ['card', 'transfer', 'mobile', 'kakao', 'naver', 'etc'];

const createOrder = async (req, res) => {
  const body = req.body || {};
  console.log('[주문생성] 요청 수신, body keys:', Object.keys(body), 'items 개수:', body.items?.length, 'recipientName:', !!body.recipientName);
  try {
    const userId = req.userId;
    if (!userId) {
      console.log('[주문생성] 실패: userId 없음');
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    }

    if (!body.recipientName || String(body.recipientName).trim() === '') {
      return res.status(400).json({ success: false, error: '수령인 이름(recipientName)은 필수입니다.' });
    }
    if (!body.recipientPhone || String(body.recipientPhone).trim() === '') {
      return res.status(400).json({ success: false, error: '수령인 연락처(recipientPhone)는 필수입니다.' });
    }
    const shippingAddress = body.shippingAddress && typeof body.shippingAddress === 'object' ? body.shippingAddress : {};
    if (!shippingAddress.address || String(shippingAddress.address).trim() === '') {
      return res.status(400).json({ success: false, error: '배송 주소(shippingAddress.address)는 필수입니다.' });
    }

    let items = body.items;
    if (!items && Array.isArray(body.products)) {
      items = body.products.map((p) => ({
        productId: p.productId || p._id,
        name: p.name || '상품',
        price: Number(p.price) || 0,
        quantity: Number(p.quantity) || 1,
        image: p.image || '',
        size: p.size || '',
        color: p.color || ''
      }));
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: '주문 상품(items)은 최소 1개 이상 필요합니다.' });
    }

    const orderItems = items
      .map((item) => {
        const productId = item.productId;
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) return null;
        return {
          productId: new mongoose.Types.ObjectId(productId),
          name: String(item.name || '상품').trim(),
          price: Number(item.price),
          quantity: Math.max(1, Number(item.quantity) || 1),
          image: String(item.image || '').trim(),
          size: String(item.size || '').trim(),
          color: String(item.color || '').trim()
        };
      })
      .filter(Boolean);
    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, error: '유효한 주문 상품이 없습니다. (productId 형식을 확인해 주세요.)' });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discount = Number(body.discount) || 0;
    const totalAmount = Math.max(0, Math.round(subtotal - discount));
    const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod) ? body.paymentMethod : 'etc';
    const paymentStatus = body.paymentStatus === 'paid' ? 'paid' : 'pending';

    // 주문 중복 체크: merchant_uid가 있으면 이미 해당 거래로 주문된 건이 있는지 확인
    const merchantUid = body.merchant_uid ? String(body.merchant_uid).trim() : '';
    if (merchantUid) {
      const existing = await Order.findOne({ merchantUid }).select('_id orderNumber').lean();
      if (existing) {
        console.log('[주문생성] 중복 주문 차단, merchantUid:', merchantUid);
        return res.status(409).json({
          success: false,
          error: '이미 처리된 주문입니다. 동일 결제로 중복 주문할 수 없습니다.',
          orderNumber: existing.orderNumber
        });
      }
    }

    // 결제 검증: imp_uid가 있고 결제 완료인 경우 PortOne API로 금액·상태 검증 (env 설정 시에만)
    const impUid = body.imp_uid ? String(body.imp_uid).trim() : '';
    if (impUid && paymentStatus === 'paid') {
      const verification = await verifyPortOnePayment(impUid, totalAmount);
      if (!verification.ok) {
        console.log('[주문생성] 결제 검증 실패:', verification.error);
        return res.status(400).json({
          success: false,
          error: verification.error || '결제 검증에 실패했습니다.'
        });
      }
    }

    const orderNumber = await generateOrderNumber();
    const orderUserId = mongoose.Types.ObjectId.isValid(userId)
      ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId))
      : userId;
    const order = new Order({
      orderNumber,
      userId: orderUserId,
      items: orderItems,
      recipientName: String(body.recipientName).trim(),
      recipientPhone: String(body.recipientPhone).trim(),
      shippingAddress: {
        postalCode: String(shippingAddress.postalCode || '').trim(),
        address: String(shippingAddress.address).trim(),
        addressDetail: String(shippingAddress.addressDetail || '').trim()
      },
      paymentMethod,
      paymentStatus,
      paidAt: paymentStatus === 'paid' ? new Date() : null,
      merchantUid: merchantUid || undefined,
      impUid: impUid || undefined,
      subtotal,
      discount,
      totalAmount,
      orderStatus: body.orderStatus || '주문 확인',
      memo: String(body.memo || '').trim()
    });

    await order.save();
    await order.populate('userId', 'name email');
    console.log('[주문생성] 성공, orderNumber:', order.orderNumber);

    res.status(201).json({
      success: true,
      data: order,
      message: '주문이 생성되었습니다.'
    });
  } catch (error) {
    console.error('주문 생성 오류:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 ID 형식입니다.' });
    }
    res.status(500).json({
      success: false,
      error: error.message || '주문 생성 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 주문 목록 조회 (Read list)
 * GET /api/orders
 * - 일반 사용자: 본인 주문만
 * - admin: 전체 (쿼리: page, limit, status, userId)
 */
const getAllOrders = async (req, res) => {
  try {
    const isAdmin = req.userType === 'admin';
    const userId = req.userId;
    const { page = 1, limit = 10, status, userId: queryUserId } = req.query;

    const filter = {};
    if (!isAdmin) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    } else if (queryUserId) {
      filter.userId = new mongoose.Types.ObjectId(queryUserId);
    }
    if (status) filter.orderStatus = status;

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, Math.min(100, parseInt(limit, 10)));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('userId', 'name email').lean(),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Math.max(1, parseInt(page, 10)),
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('주문 목록 조회 오류:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 쿼리 파라미터입니다.' });
    }
    res.status(500).json({
      success: false,
      error: error.message || '주문 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 주문 단건 조회 (Read one)
 * GET /api/orders/:id
 * - 본인 또는 admin만 조회 가능
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userType === 'admin';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 주문 ID입니다.' });
    }

    const order = await Order.findById(id).populate('userId', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }

    if (!isAdmin && order.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: '해당 주문에 대한 권한이 없습니다.' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('주문 조회 오류:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 주문 ID입니다.' });
    }
    res.status(500).json({
      success: false,
      error: error.message || '주문 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 주문 수정 (Update)
 * PUT /api/orders/:id
 * - 일반: orderStatus를 cancelled 등으로만 변경 가능
 * - admin: orderStatus, trackingNumber, shippedAt, deliveredAt, paymentStatus, paidAt, memo 등 수정 가능
 */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userType === 'admin';
    const body = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 주문 ID입니다.' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }

    if (!isAdmin && order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: '해당 주문을 수정할 권한이 없습니다.' });
    }

    const allowedUser = ['orderStatus'];
    const allowedAdmin = ['orderStatus', 'trackingNumber', 'shippedAt', 'deliveredAt', 'paymentStatus', 'paidAt', 'memo'];
    const allowed = isAdmin ? allowedAdmin : allowedUser;

    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'orderStatus') order.orderStatus = body[key];
        else if (key === 'trackingNumber') order.trackingNumber = body[key] || '';
        else if (key === 'shippedAt') order.shippedAt = body[key] ? new Date(body[key]) : null;
        else if (key === 'deliveredAt') order.deliveredAt = body[key] ? new Date(body[key]) : null;
        else if (key === 'paymentStatus') order.paymentStatus = body[key];
        else if (key === 'paidAt') order.paidAt = body[key] ? new Date(body[key]) : null;
        else if (key === 'memo') order.memo = body[key] || '';
      }
    }

    await order.save();
    const updated = await Order.findById(order._id).populate('userId', 'name email');

    res.json({
      success: true,
      data: updated,
      message: '주문이 수정되었습니다.'
    });
  } catch (error) {
    console.error('주문 수정 오류:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ success: false, error: messages });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 주문 ID입니다.' });
    }
    res.status(500).json({
      success: false,
      error: error.message || '주문 수정 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 주문 삭제 (Delete)
 * DELETE /api/orders/:id
 * - admin만 삭제 가능 (실제 삭제)
 */
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.userType === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: '주문 삭제는 관리자만 가능합니다.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 주문 ID입니다.' });
    }

    const order = await Order.findByIdAndDelete(id);
    if (!order) {
      return res.status(404).json({ success: false, error: '주문을 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      message: '주문이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('주문 삭제 오류:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 주문 ID입니다.' });
    }
    res.status(500).json({
      success: false,
      error: error.message || '주문 삭제 중 오류가 발생했습니다.'
    });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  generateOrderNumber
};
