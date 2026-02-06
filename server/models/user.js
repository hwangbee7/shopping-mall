const mongoose = require('mongoose');

// User 스키마 정의
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, '이메일은 필수입니다.'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, '유효한 이메일 형식이 아닙니다.']
  },
  name: {
    type: String,
    required: [true, '이름은 필수입니다.'],
    trim: true
  },
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다.'],
    minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다.']
  },
  user_type: {
    type: String,
    required: [true, '사용자 유형은 필수입니다.'],
    enum: {
      values: ['customer', 'admin'],
      message: '사용자 유형은 customer 또는 admin이어야 합니다.'
    },
    default: 'customer'
  },
  address: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true  // createdAt, updatedAt 자동 생성
});

// User 모델 생성 및 export
const User = mongoose.model('User', userSchema);

module.exports = User;
