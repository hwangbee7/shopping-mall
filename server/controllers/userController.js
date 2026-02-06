const User = require('../models/user');
const bcrypt = require('bcrypt');

// 모든 사용자 조회
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password'); // 비밀번호 제외
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 특정 사용자 조회
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 사용자 ID입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// 새 사용자 생성
const createUser = async (req, res) => {
  try {
    const { name, email, password, user_type, address } = req.body;
    
    // 비밀번호 암호화 (salt rounds: 10)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // 스키마 검증을 위해 User 모델 사용
    const user = new User({
      name,
      email,
      password: hashedPassword, // 암호화된 비밀번호 저장
      user_type: user_type || 'customer',
      address: address || ''
    });
    
    const savedUser = await user.save();
    
    // 비밀번호는 응답에서 제외
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: '이미 존재하는 이메일입니다.' });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: errors.join(', ') });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// 사용자 정보 수정
const updateUser = async (req, res) => {
  try {
    const { name, email, password, user_type, address } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      // 비밀번호 업데이트 시에도 암호화
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }
    if (user_type) {
      if (!['customer', 'admin'].includes(user_type)) {
        return res.status(400).json({ success: false, error: '사용자 유형은 customer 또는 admin이어야 합니다.' });
      }
      updateData.user_type = user_type;
    }
    if (address !== undefined) updateData.address = address;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: user, message: '사용자 정보가 업데이트되었습니다.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 사용자 ID입니다.' });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: errors.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: '이미 존재하는 이메일입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// 사용자 삭제
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ success: true, message: '사용자가 삭제되었습니다.' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: '유효하지 않은 사용자 ID입니다.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
