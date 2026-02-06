const Product = require('../models/product');

// 모든 상품 조회 (페이지네이션 지원)
const getAllProducts = async (req, res) => {
  try {
    // 쿼리 파라미터에서 page와 limit 가져오기
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    
    // limit이 없거나 매우 크면 전체 조회 (페이지네이션 없음)
    const getAll = !limit || limit >= 10000;
    
    if (getAll) {
      // 전체 상품 조회 (페이지네이션 없음)
      const products = await Product.find({})
        .sort({ createdAt: -1 }); // 최신순 정렬
      
      const totalProducts = products.length;
      
      res.json({ 
        success: true, 
        data: products,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalProducts: totalProducts,
          limit: totalProducts,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    } else {
      // 페이지네이션 적용
      const currentPage = page || 1;
      const skip = (currentPage - 1) * limit;
      
      // 전체 상품 개수 조회
      const totalProducts = await Product.countDocuments({});
      
      // 페이지네이션 적용하여 상품 조회
      const products = await Product.find({})
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }); // 최신순 정렬

      // 전체 페이지 수 계산
      const totalPages = Math.ceil(totalProducts / limit);

      res.json({ 
        success: true, 
        data: products,
        pagination: {
          currentPage: currentPage,
          totalPages: totalPages,
          totalProducts: totalProducts,
          limit: limit,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 특정 상품 조회
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: '상품을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 상품 ID입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// SKU로 상품 조회
const getProductBySku = async (req, res) => {
  try {
    const product = await Product.findOne({ sku: req.params.sku.toUpperCase() });
    if (!product) {
      return res.status(404).json({ success: false, error: '상품을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 새 상품 생성
const createProduct = async (req, res) => {
  try {
    const { sku, name, price, category, image, description, stock } = req.body;
    
    // 필수 필드 검증
    if (!sku || !name || price === undefined || price === null || !category || !image) {
      return res.status(400).json({ 
        success: false, 
        error: '필수 필드가 누락되었습니다. (SKU, 상품명, 가격, 카테고리, 이미지)' 
      });
    }
    
    // 가격 유효성 검증
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ 
        success: false, 
        error: '가격은 0 이상의 숫자여야 합니다.' 
      });
    }
    
    // 카테고리 유효성 검증
    const validCategories = ['상의', '하의', '악세서리'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효하지 않은 카테고리입니다. (상의, 하의, 악세서리)' 
      });
    }
    
    // Product 모델을 사용하여 상품 생성
    const product = new Product({
      sku: sku.toString().toUpperCase().trim(),
      name: name.toString().trim(),
      price: priceNum,
      category: category.toString(),
      image: image.toString().trim(),
      description: description ? description.toString().trim() : '',
      stock: stock ? parseInt(stock) : 0
    });
    
    // 데이터베이스에 저장
    const savedProduct = await product.save();
    
    res.status(201).json({ 
      success: true, 
      data: savedProduct, 
      message: '상품이 등록되었습니다.' 
    });
  } catch (error) {
    console.error('상품 생성 오류:', error);
    
    // SKU 중복 오류
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        error: '이미 존재하는 SKU입니다.' 
      });
    }
    
    // Mongoose 검증 오류
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        error: errors.join(', ') 
      });
    }
    
    // 기타 오류
    res.status(500).json({ 
      success: false, 
      error: error.message || '상품 등록 중 오류가 발생했습니다.' 
    });
  }
};

// 상품 정보 수정
const updateProduct = async (req, res) => {
  try {
    const { sku, name, price, category, image, description, stock } = req.body;
    const updateData = {};
    
    if (sku) updateData.sku = sku.toUpperCase().trim();
    if (name) updateData.name = name.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    if (image) updateData.image = image.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (stock !== undefined) updateData.stock = parseInt(stock);
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ success: false, error: '상품을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: product, message: '상품 정보가 업데이트되었습니다.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 상품 ID입니다.' });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: errors.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: '이미 존재하는 SKU입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// 상품 삭제
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: '상품을 찾을 수 없습니다.' });
    }
    res.json({ success: true, message: '상품이 삭제되었습니다.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 상품 ID입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// 카테고리별 상품 조회
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['상의', '하의', '악세서리'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        success: false, 
        error: '유효하지 않은 카테고리입니다. (상의, 하의, 악세서리)' 
      });
    }
    
    const products = await Product.find({ category });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getProductBySku,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory
};
