const Cart = require('../models/cart');
const Product = require('../models/product');
const mongoose = require('mongoose');

// 현재 사용자의 장바구니 조회
const getCart = async (req, res) => {
  try {
    const userId = req.userId; // authenticateToken 미들웨어에서 설정됨

    // 장바구니 조회 (상품 정보 포함)
    let cart = await Cart.findOne({ userId })
      .populate('items.productId', 'name price image category sku');

    // 장바구니가 없으면 새로 생성
    if (!cart) {
      cart = new Cart({
        userId: userId,
        items: [],
        totalAmount: 0
      });
      await cart.save();
    }

    res.json({ 
      success: true, 
      data: cart 
    });
  } catch (error) {
    console.error('장바구니 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '장바구니 조회 중 오류가 발생했습니다.' 
    });
  }
};

// 장바구니에 아이템 추가
const addItemToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId, quantity, price } = req.body;

    // 필수 필드 검증
    if (!productId || !quantity || price === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: '상품 ID, 수량, 가격은 필수 항목입니다.' 
      });
    }

    // 수량 유효성 검증
    if (quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        error: '수량은 1개 이상이어야 합니다.' 
      });
    }

    // 상품 존재 여부 확인
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: '상품을 찾을 수 없습니다.' 
      });
    }

    // 재고 확인
    if (product.stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `재고가 부족합니다. (현재 재고: ${product.stock}개)` 
      });
    }

    // 장바구니 조회 또는 생성
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = new Cart({
        userId: userId,
        items: [],
        totalAmount: 0
      });
    }

    // 같은 상품이 이미 장바구니에 있는지 확인
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId.toString()
    );

    if (existingItemIndex > -1) {
      // 기존 아이템 수량 증가
      cart.items[existingItemIndex].quantity += quantity;
      // 가격 업데이트 (최신 가격으로)
      cart.items[existingItemIndex].price = price;
    } else {
      // 새 아이템 추가
      cart.items.push({
        productId: productId,
        quantity: quantity,
        price: price
      });
    }

    // 총 금액은 pre('save') 훅에서 자동 계산됨
    await cart.save();

    // 상품 정보 포함하여 반환
    await cart.populate('items.productId', 'name price image category sku');

    res.status(201).json({ 
      success: true, 
      data: cart, 
      message: '장바구니에 추가되었습니다.' 
    });
  } catch (error) {
    console.error('장바구니 아이템 추가 오류:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        error: '유효하지 않은 상품 ID입니다.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || '장바구니에 아이템을 추가하는 중 오류가 발생했습니다.' 
    });
  }
};

// 장바구니 아이템 수량 수정
const updateCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    // 수량 유효성 검증
    if (!quantity || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        error: '수량은 1개 이상이어야 합니다.' 
      });
    }

    // 장바구니 조회
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        error: '장바구니를 찾을 수 없습니다.' 
      });
    }

    // 아이템 찾기
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        error: '장바구니 아이템을 찾을 수 없습니다.' 
      });
    }

    // 상품 재고 확인
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: '상품을 찾을 수 없습니다.' 
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `재고가 부족합니다. (현재 재고: ${product.stock}개)` 
      });
    }

    // 수량 업데이트
    item.quantity = quantity;
    await cart.save();

    // 상품 정보 포함하여 반환
    await cart.populate('items.productId', 'name price image category sku');

    res.json({ 
      success: true, 
      data: cart, 
      message: '장바구니 아이템이 수정되었습니다.' 
    });
  } catch (error) {
    console.error('장바구니 아이템 수정 오류:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        error: '유효하지 않은 ID입니다.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || '장바구니 아이템 수정 중 오류가 발생했습니다.' 
    });
  }
};

// 장바구니 아이템 삭제 ($pull로 배열 요소 제거)
const removeCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId } = req.params;

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        error: '장바구니를 찾을 수 없습니다.' 
      });
    }

    const hasItem = cart.items.some(
      (i) => i._id && String(i._id) === String(itemId)
    );
    if (!hasItem) {
      return res.status(404).json({ 
        success: false, 
        error: '장바구니 아이템을 찾을 수 없습니다.' 
      });
    }

    const objectId = mongoose.Types.ObjectId.isValid(itemId)
      ? new mongoose.Types.ObjectId(itemId)
      : itemId;

    cart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { _id: objectId } } },
      { new: true }
    ).populate('items.productId', 'name price image category sku');

    if (cart) {
      cart.totalAmount = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      await cart.save();
    }

    res.json({ 
      success: true, 
      data: cart, 
      message: '장바구니에서 아이템이 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('장바구니 아이템 삭제 오류:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        error: '유효하지 않은 ID입니다.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || '장바구니 아이템 삭제 중 오류가 발생했습니다.' 
    });
  }
};

// 장바구니 전체 비우기
const clearCart = async (req, res) => {
  try {
    const userId = req.userId;

    // 장바구니 조회
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        error: '장바구니를 찾을 수 없습니다.' 
      });
    }

    // 모든 아이템 삭제
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    res.json({ 
      success: true, 
      data: cart, 
      message: '장바구니가 비워졌습니다.' 
    });
  } catch (error) {
    console.error('장바구니 비우기 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '장바구니를 비우는 중 오류가 발생했습니다.' 
    });
  }
};

module.exports = {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
