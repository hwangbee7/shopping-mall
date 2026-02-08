import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios, { baseURL } from '../api'
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
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [connectionError, setConnectionError] = useState('')

  const healthUrl = `${baseURL}/health`

  // 서버 연결 상태 확인 (로그인 페이지 로드 시 1회)
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await axios.get('/health')
        if (!cancelled && res.data?.ok) setConnectionStatus('ok')
        else if (!cancelled) { setConnectionStatus('fail'); setConnectionError('응답 형식 오류') }
      } catch (e) {
        if (cancelled) return
        setConnectionStatus('fail')
        if (e.response) setConnectionError(`HTTP ${e.response.status}`)
        else if (e.request) setConnectionError(e.code ? `응답 없음 (${e.code})` : '응답 없음 - 서버 중단 또는 CORS')
        else setConnectionError(e.message || '요청 실패')
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  // 컴포넌트 마운트 시 토큰 확인 및 유효성 검증
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (token) {
          const response = await axios.get('/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.data.success) {
            navigate('/')
            return
          }
        }
      } catch (error) {
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
    if (!validateForm()) return

    setIsSubmitting(true)
    
    try {
      const loginData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      }

      const response = await axios.post('/auth/login', loginData)
      
      if (response.data.success) {
        const data = response.data.data || {}
        const token = data.token
        const user = data.user
        if (token) localStorage.setItem('token', token)
        if (user) localStorage.setItem('user', JSON.stringify(user))
        if (!token || !user) console.warn('로그인 응답에 token 또는 user가 없습니다.', data)

        alert('로그인에 성공했습니다! 🎉')
        navigate('/')
      } else {
        const msg = response.data?.error
        alert(typeof msg === 'string' ? msg : '로그인에 실패했습니다.')
      }
    } catch (error) {
      if (error.response) {
        const raw = error.response.data?.error
        const errorMessage = typeof raw === 'string' ? raw : (error.response.data?.message || '로그인 중 오류가 발생했습니다.')
        if (error.response.status === 404) {
          alert(`요청 경로를 찾을 수 없습니다 (404). 서버 재배포 후 다시 시도해주세요.\n\n${errorMessage}`)
        } else {
          alert(errorMessage)
        }
      } else if (error.request) {
        const url = error.config?.baseURL && error.config?.url
          ? `${error.config.baseURL.replace(/\/$/, '')}${error.config.url.startsWith('/') ? '' : '/'}${error.config.url}`
          : '알 수 없음'
        const code = error.code || ''
        console.error('로그인 요청 실패 (응답 없음)', { url, code, error: error.message })
        alert(`서버에 연결할 수 없습니다.\n\n요청 주소: ${url}\n${code ? `오류 코드: ${code}\n` : ''}\n▼ 아래 주소를 브라우저 주소창에 붙여 넣어 보세요.\n${healthUrl}\n· 열리면: 서버는 동작 중. CORS 설정을 확인하세요.\n· 안 열리면: Cloudtype 배포 로그에서 서버 오류를 확인하세요.`)
      } else {
        alert('로그인 요청 중 오류가 발생했습니다.')
      }
    } finally {
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

        {connectionStatus !== null && (
          <div className={`server-check ${connectionStatus === 'ok' ? 'server-check-ok' : 'server-check-fail'}`}>
            {connectionStatus === 'ok' ? (
              <>✅ 서버 연결됨</>
            ) : (
              <>
                ❌ 서버 연결 실패: {connectionError}
                <br />
                <a href={healthUrl} target="_blank" rel="noopener noreferrer" className="server-check-link">연결 테스트 주소 열기</a>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
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

          <button
            type="submit"
            className="submit-button login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>

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
