import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import axios from '../api'
import '../App.css'

// 서버/DB와 무관하게 이 이메일은 항상 admin으로 표시 (Cloudtype DB에 admin 미반영 시 대비)
const ADMIN_EMAIL = 'hwangbee7@gmail.com'
const normalizeUser = (u) => {
  if (!u || !u.email) return u
  if ((u.email || '').toLowerCase().trim() === ADMIN_EMAIL) return { ...u, user_type: 'admin' }
  return u
}

function Navbar() {
  const location = useLocation()
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user')
      const parsed = saved ? JSON.parse(saved) : null
      return normalizeUser(parsed)
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  // 장바구니 아이템 개수 가져오기
  const fetchCartItemCount = async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (token) {
        const response = await axios.get('/cart', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.data.success && response.data.data) {
          const items = response.data.data.items || []
          const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)
          setCartItemCount(totalCount)
        }
      }
    } catch (error) {
      // 장바구니가 없거나 오류가 발생하면 0으로 설정
      setCartItemCount(0)
    }
  }

  // localStorage의 user가 admin 이메일이면 user_type을 항상 admin으로 유지 (/auth/me가 customer로 덮어써도 복구)
  useEffect(() => {
    try {
      const s = localStorage.getItem('user')
      const t = localStorage.getItem('token')
      if (!t || !s) return
      const u = JSON.parse(s)
      if (!u || !u.email) return
      if ((u.email || '').toLowerCase().trim() === ADMIN_EMAIL && u.user_type !== 'admin') {
        const fixed = { ...u, user_type: 'admin' }
        localStorage.setItem('user', JSON.stringify(fixed))
        setUser(fixed)
      }
    } catch (_) {}
  }, [location.pathname])

  useEffect(() => {
    // 토큰으로 유저 정보 가져오기 (경로 변경 시 재실행: 로그인 후 / 로 이동할 때 등)
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (token) {
          // 로그인 직후 화면 전환 시점에 localStorage user로 먼저 표시 (ADMIN 메뉴 등)
          const savedUser = (() => {
            try {
              const s = localStorage.getItem('user')
              return normalizeUser(s ? JSON.parse(s) : null)
            } catch { return null }
          })()
          if (savedUser) setUser(savedUser)

          const response = await axios.get('/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.data.success && response.data.data) {
            const serverUser = normalizeUser(response.data.data)
            if (serverUser) {
              setUser(serverUser)
              localStorage.setItem('user', JSON.stringify(serverUser))
            }
            await fetchCartItemCount()
          } else {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setUser(null)
            setCartItemCount(0)
          }
        } else {
          setUser(null)
          setCartItemCount(0)
        }
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
        // 네트워크 오류 등: 이미 넣어둔 localStorage user는 유지, setUser(null) 하지 않음
        setCartItemCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [location.pathname])

  // user가 변경될 때 장바구니 개수 가져오기
  useEffect(() => {
    if (user) {
      fetchCartItemCount()
      
      // 주기적으로 장바구니 개수 업데이트 (5초마다)
      const cartInterval = setInterval(() => {
        fetchCartItemCount()
      }, 5000)

      // 장바구니 업데이트 이벤트 리스너
      const handleCartUpdate = () => {
        fetchCartItemCount()
      }
      window.addEventListener('cartUpdated', handleCartUpdate)

      return () => {
        clearInterval(cartInterval)
        window.removeEventListener('cartUpdated', handleCartUpdate)
      }
    } else {
      setCartItemCount(0)
    }
  }, [user])

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setShowUserDropdown(false)
    alert('로그아웃되었습니다.')
    // 페이지 새로고침하여 상태 업데이트
    window.location.reload()
  }

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserDropdown])

  // 표시용 user: state가 비어도 토큰+localStorage에 있으면 사용 (로그인 직후 동기화 지연 대비)
  const displayUser = (() => {
    if (user) return normalizeUser(user)
    try {
      const token = localStorage.getItem('token')
      const saved = localStorage.getItem('user')
      if (!token || !saved) return null
      return normalizeUser(JSON.parse(saved))
    } catch {
      return null
    }
  })()

  const isAdmin =
    displayUser?.user_type === 'admin' ||
    (displayUser?.email || '').toLowerCase().trim() === ADMIN_EMAIL

  // ADMIN 링크: token 있고, user 문자열에 admin 이메일 포함돼 있거나 user_type admin이면 표시 (JSON 파싱 실패해도 문자열로 폴백)
  const showAdminLink = (() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return !!isAdmin
    const rawUser = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null
    if (!rawUser) return !!isAdmin
    if (rawUser.includes(ADMIN_EMAIL) || rawUser.includes('"user_type":"admin"')) return true
    try {
      const parsed = JSON.parse(rawUser)
      return (parsed?.email || '').toLowerCase().trim() === ADMIN_EMAIL || parsed?.user_type === 'admin' || !!isAdmin
    } catch {
      return !!isAdmin
    }
  })()

  return (
    <>
      {/* Top Header Bar */}
      <div className="top-header">
        <div className="top-header-left">
          <span>ARCHIVE SALE | Jan 23, 6PM - Jan 26, 11:59PM (KST)</span>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="main-navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <Link to="/" className="brand-logo">BAD BLOOD</Link>
          </div>
          
          <div className="navbar-center">
            <Link to="/archive" className="nav-link">ARCHIVE</Link>
            <Link to="/sale" className="nav-link">CLEARANCE SALE</Link>
            <Link to="/new" className="nav-link">NEW</Link>
            <Link to="/shop" className="nav-link">SHOP</Link>
            <Link to="/collection" className="nav-link">COLLECTION</Link>
            <Link to="/stockists" className="nav-link">STOCKISTS</Link>
            <Link to="/about" className="nav-link">ABOUT</Link>
          </div>

          <div className="navbar-right">
            {displayUser ? (
              <div className="user-dropdown-container">
                <button 
                  className="user-welcome-btn"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  {displayUser.name}님 환영합니다
                  <span className="dropdown-arrow">{showUserDropdown ? '▲' : '▼'}</span>
                </button>
                {showUserDropdown && (
                  <div className="user-dropdown-menu">
                    <Link 
                      to="/orders" 
                      className="dropdown-item"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      내 주문 목록
                    </Link>
                    <button 
                      className="dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="nav-link">LOGIN</Link>
            )}
            {showAdminLink && (
              <Link to="/admin" className="nav-link admin-link">ADMIN</Link>
            )}
            {/* 장바구니 아이콘 */}
            <Link to="/cart" className="cart-icon-link">
              <div className="cart-icon-wrapper">
                <span className="cart-icon">🛍️</span>
                {cartItemCount > 0 && (
                  <span className="cart-badge">{cartItemCount}</span>
                )}
              </div>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}

export default Navbar
