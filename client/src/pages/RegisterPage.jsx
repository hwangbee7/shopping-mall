import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from '../api'
import '../App.css'

function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleAgreementChange = (type) => {
    if (type === 'all') {
      const newValue = !agreements.all
      setAgreements({
        all: newValue,
        terms: newValue,
        privacy: newValue,
        marketing: newValue
      })
    } else {
      setAgreements(prev => {
        const updated = {
          ...prev,
          [type]: !prev[type]
        }
        // 전체 동의 체크박스 상태 업데이트
        updated.all = updated.terms && updated.privacy
        return updated
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.'
    }
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = '유효한 이메일 형식이 아닙니다.'
    }
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(formData.password)) {
      newErrors.password = '8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.'
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.'
    }
    if (!agreements.terms) {
      newErrors.terms = '이용약관에 동의해주세요.'
    }
    if (!agreements.privacy) {
      newErrors.privacy = '개인정보처리방침에 동의해주세요.'
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
      // 서버로 전송할 사용자 데이터 준비
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        user_type: 'customer',
        address: formData.address.trim() || ''
      }

      // 서버 API에 POST 요청으로 회원가입 데이터 전송 (Vite proxy 사용)
      const response = await axios.post('/users', userData)
      
      // 서버 응답 확인
      if (response.data.success) {
        // 성공 시 메인 페이지로 이동
        alert('회원가입이 완료되었습니다!')
        navigate('/')
      } else {
        // 서버에서 success: false를 반환한 경우
        alert(response.data.error || '회원가입에 실패했습니다.')
      }
    } catch (error) {
      // 네트워크 오류 또는 서버 오류 처리
      if (error.response) {
        // 서버가 응답을 반환했지만 오류 상태 코드인 경우
        const errorMessage = error.response.data?.error || '회원가입 중 오류가 발생했습니다.'
        alert(errorMessage)
      } else if (error.request) {
        // 요청은 보냈지만 응답을 받지 못한 경우
        alert('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.')
      } else {
        // 요청 설정 중 오류가 발생한 경우
        alert('회원가입 요청 중 오류가 발생했습니다.')
      }
    } finally {
      // 성공/실패와 관계없이 로딩 상태 해제
      setIsSubmitting(false)
    }
  }

  return (
    <div className="signup-container">
      <div className="signup-content">
        <div className="signup-header">
          <h1>회원가입</h1>
          <p>새로운 계정을 만들어 쇼핑을 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {/* 이름 */}
          <div className="form-group">
            <label htmlFor="name">이름</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="이름을 입력하세요"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
              />
            </div>
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

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
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <p className="password-hint">8자 이상, 영문, 숫자, 특수문자 포함</p>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {/* 비밀번호 확인 */}
          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="비밀번호를 다시 입력하세요"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          {/* 주소 (선택사항) */}
          <div className="form-group">
            <label htmlFor="address">주소 (선택)</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="address"
                name="address"
                placeholder="주소를 입력하세요"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* 동의 체크박스 */}
          <div className="agreements-section">
            <div className="agreement-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreements.all}
                  onChange={() => handleAgreementChange('all')}
                />
                <span>전체 동의</span>
              </label>
            </div>

            <div className="agreement-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreements.terms}
                  onChange={() => handleAgreementChange('terms')}
                />
                <span>이용약관 동의 (필수)</span>
              </label>
              <a href="#" className="view-link">보기</a>
            </div>

            <div className="agreement-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreements.privacy}
                  onChange={() => handleAgreementChange('privacy')}
                />
                <span>개인정보처리방침 동의 (필수)</span>
              </label>
              <a href="#" className="view-link">보기</a>
            </div>

            <div className="agreement-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreements.marketing}
                  onChange={() => handleAgreementChange('marketing')}
                />
                <span>마케팅 정보 수신 동의 (선택)</span>
              </label>
            </div>

            {(errors.terms || errors.privacy) && (
              <span className="error-message">{errors.terms || errors.privacy}</span>
            )}
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? '처리 중...' : '회원가입'}
          </button>

          {/* 로그인 링크 */}
          <div className="signup-footer">
            <p>
              이미 계정이 있으신가요? <Link to="/">로그인</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage
