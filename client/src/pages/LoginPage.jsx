import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from '../api'
import Navbar from './Navbar'
import '../App.css'

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)

  // 컴포넌트 마운트 시 토큰 확인 및 유효성 검증
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (token) {
          // 토큰이 있으면 서버에서 유저 정보 확인 (Vite proxy 사용)
          const response = await axios.get('/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          // 유효한 토큰이면 메인 페이지로 리다이렉트
          if (response.data.success) {
            navigate('/')
            return
          }
        }
      } catch (error) {
        // 토큰이 유효하지 않은 경우 localStorage에서 제거
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      } finally {
        setIsCheckingToken(false)
      }
    }

    checkToken()
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = '유효한 이메일 형식이 아닙니다.'
    }
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 폼 유효성 검사
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      // 서버로 전송할 로그인 데이터 준비
      // 서버의 authController.login에서 요구하는 형식: { email, password }
      const loginData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      }

      // 서버 API에 POST 요청으로 로그인 데이터 전송 (Vite proxy 사용)
      // 서버 엔드포인트: POST /auth/login
      const response = await axios.post('/auth/login', loginData)
      
      // 서버 응답 구조 확인
      // 성공 시: { success: true, message: '...', data: { user: {...}, token: '...' } }
      // 실패 시: { success: false, error: '...' }
      if (response.data.success) {
        // JWT 토큰을 localStorage에 저장
        if (response.data.data && response.data.data.token) {
          localStorage.setItem('token', response.data.data.token)
          
          // 사용자 정보도 localStorage에 저장 (선택사항)
          if (response.data.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.data.user))
          }
        }
        
        // 성공 메시지 표시 후 메인 페이지로 이동
        alert('로그인에 성공했습니다! 🎉')
        navigate('/')
      } else {
        // 서버에서 success: false를 반환한 경우 (문자열만 표시)
        const msg = response.data?.error
        alert(typeof msg === 'string' ? msg : '로그인에 실패했습니다.')
      }
    } catch (error) {
      // 에러 처리
      if (error.response) {
        // 서버가 응답을 반환했지만 오류 상태 코드인 경우 (객체면 문자열로)
        const raw = error.response.data?.error
        const errorMessage = typeof raw === 'string' ? raw : '로그인 중 오류가 발생했습니다.'
        alert(errorMessage)
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못한 경우 (CORS/네트워크/서버 다운)
        const url = error.config?.baseURL && error.config?.url
          ? `${error.config.baseURL.replace(/\/$/, '')}${error.config.url.startsWith('/') ? '' : '/'}${error.config.url}`
          : '알 수 없음'
        console.error('로그인 요청 실패 (응답 없음)', { url, error: error.message })
        alert(`서버에 연결할 수 없습니다.\n\n요청 주소: ${url}\n\n· 브라우저에서 위 주소가 열리는지 확인해보세요.\n· CORS 오류면 F12 → Console을 확인해주세요.`)
      } else {
        // 요청 설정 중 오류가 발생한 경우
        alert('로그인 요청 중 오류가 발생했습니다.')
      }
    } finally {
      // 성공/실패와 관계없이 로딩 상태 해제
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="login-container">
        <div className="login-content">
        <div className="login-header">
          <h1>로그인</h1>
          <p>계정에 로그인하여 쇼핑을 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* 이메일 */}
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
              />
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {/* 비밀번호 */}
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="비밀번호를 입력하세요"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            className="submit-button login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>

          {/* 회원가입 링크 */}
          <div className="login-footer">
            <p>
              계정이 없으신가요? <Link to="/signup" className="footer-link">회원가입</Link>
            </p>
          </div>
        </form>
        </div>
      </div>
    </>
  )
}

export default LoginPage
