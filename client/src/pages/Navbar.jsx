import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import '../App.css'

function Navbar() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  // 장바구니 아이템 개수 가져오기
  const fetchCartItemCount = async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (token) {
        const response = await axios.get('/api/cart', {
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

  useEffect(() => {
    // 토큰으로 유저 정보 가져오기
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (token) {
          // 토큰이 있으면 서버에서 유저 정보 가져오기 (Vite proxy 사용)
          const response = await axios.get('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.data.success) {
            setUser(response.data.data)
            // 유저 정보를 가져온 후 장바구니 개수도 가져오기
            await fetchCartItemCount()
          } else {
            // 토큰이 유효하지 않은 경우 localStorage에서 제거
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setCartItemCount(0)
          }
        } else {
          setCartItemCount(0)
        }
      } catch (error) {
        // 토큰 검증 실패 시 localStorage에서 제거
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
        setCartItemCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [])

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

  const isAdmin = user?.user_type === 'admin'

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
            {user ? (
              <div className="user-dropdown-container">
                <button 
                  className="user-welcome-btn"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  {user.name}님 환영합니다
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
            {user && isAdmin && (
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
