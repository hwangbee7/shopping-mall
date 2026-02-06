const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT 시크릿 키 (환경 변수에서 가져오거나 기본값 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 로그인 (크로스오리진 응답에 CORS 헤더 명시)
const login = async (req, res) => {
  const origin = req.get('Origin');
  if (origin && origin.includes('todo-react-8rt5.vercel.app')) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  try {
    const { email, password } = req.body;

    // 이메일과 비밀번호 필수 체크
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: '이메일과 비밀번호를 입력해주세요.' 
      });
    }

    // 이메일로 사용자 찾기
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // 사용자가 존재하지 않는 경우
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '이메일 또는 비밀번호가 올바르지 않습니다.' 
      });
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    // 비밀번호가 일치하지 않는 경우
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: '이메일 또는 비밀번호가 올바르지 않습니다.' 
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        user_type: user.user_type
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7일 후 만료
    );

    // 사용자 정보 (비밀번호 제외)
    const userResponse = user.toObject();
    delete userResponse.password;

    // 로그인 성공 응답
    res.json({
      success: true,
      message: '로그인에 성공했습니다.',
      data: {
        user: userResponse,
        token: token
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    const o = req.get('Origin');
    if (o && o.includes('todo-react-8rt5.vercel.app')) {
      res.set('Access-Control-Allow-Origin', o);
      res.set('Access-Control-Allow-Credentials', 'true');
    }
    res.status(500).json({ 
      success: false, 
      error: '로그인 중 오류가 발생했습니다.' 
    });
  }
};

// 현재 사용자 정보 조회 (토큰 검증용)
// 이 함수는 authenticateToken 미들웨어와 함께 사용되어야 합니다
const getCurrentUser = async (req, res) => {
  try {
    // 토큰에서 사용자 ID 추출 (authenticateToken 미들웨어에서 설정됨)
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '인증이 필요합니다.' 
      });
    }
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: '사용자를 찾을 수 없습니다.' 
      });
    }

    res.json({ 
      success: true, 
      data: user 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  login,
  getCurrentUser
};
