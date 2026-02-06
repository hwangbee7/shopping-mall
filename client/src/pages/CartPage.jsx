import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../api'
import Navbar from './Navbar'
import '../App.css'

function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // 장바구니 데이터 가져오기
  useEffect(() => {
    const fetchCart = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const token = localStorage.getItem('token')
        if (!token) {
          alert('로그인이 필요합니다.')
          navigate('/login')
          return
        }

        const response = await axios.get('/cart', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.success) {
          setCart(response.data.data)
        } else {
          setError(response.data.error || '장바구니를 불러올 수 없습니다.')
        }
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          alert('로그인이 필요합니다.')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          navigate('/login')
        } else {
          setError(error.response?.data?.error || '장바구니를 불러오는 중 오류가 발생했습니다.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchCart()
  }, [navigate])

  // 수량 업데이트
  const handleUpdateQuantity = async (itemId, newQuantity) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await axios.put(
        `/cart/items/${itemId}`,
        { quantity: newQuantity },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        setCart(response.data.data)
      } else {
        alert(response.data.error || '수량을 변경하는데 실패했습니다.')
      }
    } catch (error) {
      alert(error.response?.data?.error || '수량을 변경하는 중 오류가 발생했습니다.')
    }
  }

  // 아이템 삭제
  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('이 상품을 장바구니에서 제거하시겠습니까?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      const response = await axios.delete(
        `/cart/items/${itemId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        setCart(response.data.data)
        // Navbar의 장바구니 개수도 업데이트하기 위해 페이지 새로고침
        window.dispatchEvent(new Event('cartUpdated'))
      } else {
        alert(response.data.error || '상품을 제거하는데 실패했습니다.')
      }
    } catch (error) {
      alert(error.response?.data?.error || '상품을 제거하는 중 오류가 발생했습니다.')
    }
  }

  // 장바구니 비우기
  const handleClearCart = async () => {
    if (!window.confirm('장바구니를 모두 비우시겠습니까?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      const response = await axios.delete('/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.success) {
        setCart(response.data.data)
        window.dispatchEvent(new Event('cartUpdated'))
        alert('장바구니가 비워졌습니다.')
      } else {
        alert(response.data.error || '장바구니를 비우는데 실패했습니다.')
      }
    } catch (error) {
      alert(error.response?.data?.error || '장바구니를 비우는 중 오류가 발생했습니다.')
    }
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="cart-page">
          <div className="loading">장바구니를 불러오는 중...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="cart-page">
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="back-to-home-btn">
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </>
    )
  }

  const items = cart?.items || []
  const totalAmount = cart?.totalAmount || 0

  return (
    <>
      <Navbar />
      <div className="cart-page">
        <div className="cart-container">
          <div className="cart-header">
            <h1>장바구니</h1>
            {items.length > 0 && (
              <button onClick={handleClearCart} className="clear-cart-btn">
                전체 삭제
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="empty-cart">
              <p>장바구니가 비어있습니다.</p>
              <button onClick={() => navigate('/')} className="continue-shopping-btn">
                쇼핑 계속하기
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {items.map((item) => {
                  const product = item.productId
                  if (!product) return null

                  return (
                    <div key={item._id} className="cart-item">
                      <div className="cart-item-image">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name}
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className="cart-item-placeholder"
                          style={{ display: product.image ? 'none' : 'flex' }}
                        >
                          <span>이미지 없음</span>
                        </div>
                      </div>

                      <div className="cart-item-info">
                        <h3 className="cart-item-name">{product.name}</h3>
                        <p className="cart-item-category">{product.category}</p>
                        <p className="cart-item-sku">SKU: {product.sku}</p>
                      </div>

                      <div className="cart-item-quantity">
                        <button
                          className="quantity-btn"
                          onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          className="quantity-btn"
                          onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-price">
                        <p className="item-total-price">
                          ₩{(item.price * item.quantity).toLocaleString()}
                        </p>
                        <p className="item-unit-price">
                          ₩{item.price.toLocaleString()} / 개
                        </p>
                      </div>

                      <button
                        className="remove-item-btn"
                        onClick={() => handleRemoveItem(item._id)}
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="cart-summary">
                <div className="cart-total">
                  <div className="total-row">
                    <span className="total-label">총 상품 금액</span>
                    <span className="total-value">₩{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="total-row">
                    <span className="total-label">배송비</span>
                    <span className="total-value">₩0</span>
                  </div>
                  <div className="total-row final-total">
                    <span className="total-label">총 결제 금액</span>
                    <span className="total-value">₩{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
                <button
                  className="checkout-btn"
                  onClick={() => navigate('/order')}
                >
                  결제하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default CartPage
