const jwt = require('jsonwebtoken');

// JWT 시크릿 키 (환경 변수에서 가져오거나 기본값 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN" 형식

    // 토큰이 없는 경우
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: '인증 토큰이 필요합니다.' 
      });
    }

    // 토큰 검증
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          error: '유효하지 않거나 만료된 토큰입니다.' 
        });
      }

      // 토큰에서 추출한 사용자 정보를 req에 추가 (다양한 payload 키 지원)
      req.userId = decoded.userId || decoded.id || decoded.sub;
      req.userEmail = decoded.email;
      req.userType = decoded.user_type;
      
      next(); // 다음 미들웨어로 진행
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: '토큰 검증 중 오류가 발생했습니다.' 
    });
  }
};

module.exports = {
  authenticateToken
};
