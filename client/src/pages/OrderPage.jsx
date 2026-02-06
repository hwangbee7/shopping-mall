import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../api'
import Navbar from './Navbar'
import '../App.css'

const STEPS = [
  { num: 1, label: '배송정보' },
  { num: 2, label: '결제' },
  { num: 3, label: '확인' }
]

function OrderPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [currentStep, setCurrentStep] = useState(1)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    addressDetail: '',
    paymentMethod: 'card'
  })

  useEffect(() => {
    const fetchCart = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const token = localStorage.getItem('token')
        if (!token) {
          navigate('/login')
          return
        }
        const response = await axios.get('/cart', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data.success) {
          setCart(response.data.data)
        } else {
          setError(response.data.error || '장바구니를 불러올 수 없습니다.')
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login')
        } else {
          setError(err.response?.data?.error || '장바구니를 불러오는 중 오류가 발생했습니다.')
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchCart()
  }, [navigate])

  // 포트원(아임포트) 결제 모듈 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && window.IMP) {
      window.IMP.init('imp24032001')
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    try {
      const response = await axios.put(
        `/cart/items/${itemId}`,
        { quantity: newQuantity },
        { headers: getAuthHeaders() }
      )
      if (response.data.success) {
        setCart(response.data.data)
        window.dispatchEvent(new Event('cartUpdated'))
      } else {
        alert(response.data.error || '수량 변경에 실패했습니다.')
      }
    } catch (err) {
      alert(err.response?.data?.error || '수량 변경 중 오류가 발생했습니다.')
    }
  }

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('이 상품을 주문에서 제거하시겠습니까?')) return
    try {
      const response = await axios.delete(`/cart/items/${itemId}`, {
        headers: getAuthHeaders()
      })
      if (response.data.success) {
        setCart(response.data.data)
        window.dispatchEvent(new Event('cartUpdated'))
      } else {
        alert(response.data.error || '삭제에 실패했습니다.')
      }
    } catch (err) {
      alert(err.response?.data?.error || '삭제 중 오류가 발생했습니다.')
    }
  }

  const validateShipping = () => {
    if (!form.firstName?.trim() || !form.lastName?.trim()) {
      alert('이름을 입력해 주세요.')
      return false
    }
    if (!form.phone?.trim()) {
      alert('연락처를 입력해 주세요.')
      return false
    }
    if (!form.address?.trim()) {
      alert('기본 주소를 입력해 주세요.')
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateShipping()) return
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(3)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const createOrderAfterPayment = async (orderPayload) => {
    const token = localStorage.getItem('token')
    if (!token) {
      alert('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.')
      navigate('/login')
      return
    }
    // 결제 콜백에서 전송할 수 있도록 순수 객체만 구성 (직렬화 오류 방지)
    const shipping = orderPayload.shippingAddress || {}
    const payload = {
      items: (orderPayload.items || []).map((i) => ({
        productId: i.productId,
        name: i.name || '상품',
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
        image: i.image || '',
        size: i.size || '',
        color: i.color || ''
      })),
      recipientName: orderPayload.recipientName || '',
      recipientPhone: orderPayload.recipientPhone || '',
      shippingAddress: {
        address: shipping.address || '',
        addressDetail: shipping.addressDetail || '',
        postalCode: shipping.postalCode || ''
      },
      paymentMethod: orderPayload.paymentMethod || 'card',
      paymentStatus: 'paid',
      discount: Number(orderPayload.discount) || 0,
      memo: orderPayload.memo || ''
    }
    if (!payload.items.length) {
      alert('주문할 상품이 없습니다.')
      return
    }
    if (!payload.recipientName.trim() || !payload.recipientPhone.trim() || !payload.shippingAddress.address.trim()) {
      alert('배송 정보가 올바르지 않습니다. 다시 입력해 주세요.')
      return
    }
    const response = await axios.post('/orders', payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
    if (response.data && response.data.success) {
      try {
        await axios.delete('/cart', {
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) {}
      window.dispatchEvent(new Event('cartUpdated'))
      navigate('/order/success', { state: { order: response.data.data } })
    } else {
      const msg = response.data?.error ? `주문에 실패했습니다.\n${response.data.error}` : '주문에 실패했습니다.'
      alert(msg)
    }
  }

  const handlePlaceOrder = () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    if (!cart?.items?.length) {
      alert('주문할 상품이 없습니다.')
      return
    }
    if (!validateShipping()) return

    const recipientName = `${form.firstName.trim()} ${form.lastName.trim()}`
    const productIdFor = (item) => {
      const p = item.productId
      if (!p) return null
      const id = typeof p === 'object' && p._id != null ? p._id : p
      return id != null ? String(id) : null
    }
    const orderPayload = {
      items: cart.items.map((item) => {
        const pid = productIdFor(item)
        return {
          productId: pid,
          name: item.productId?.name ?? item.name ?? '상품',
          price: Number(item.price),
          quantity: Number(item.quantity) || 1,
          image: item.productId?.image ?? item.image ?? '',
          size: item.size ?? '',
          color: item.color ?? ''
        }
      }).filter((item) => item.productId != null && item.productId !== ''),
      recipientName,
      recipientPhone: form.phone.trim(),
      shippingAddress: {
        address: form.address.trim(),
        addressDetail: form.addressDetail?.trim() || '',
        postalCode: ''
      },
      paymentMethod: form.paymentMethod || 'card',
      paymentStatus: 'pending',
      discount: 0,
      memo: form.email?.trim() ? `이메일: ${form.email.trim()}` : ''
    }

    if (!orderPayload.items.length) {
      alert('주문할 상품이 없습니다.')
      return
    }

    if (typeof window === 'undefined' || !window.IMP) {
      alert('결제 모듈을 불러올 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.')
      return
    }

    const amount = cart.totalAmount || 0
    const merchantUid = `ORD_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const firstProductName = orderPayload.items[0]?.name || '상품'
    const orderName = orderPayload.items.length > 1
      ? `${firstProductName} 외 ${orderPayload.items.length - 1}건`
      : firstProductName

    const payMethodMap = {
      card: 'card',
      transfer: 'trans',
      kakao: 'kakao',
      naver: 'naverpay'
    }
    const pay_method = payMethodMap[form.paymentMethod] || 'card'

    setIsSubmitting(true)

    window.IMP.request_pay(
      {
        pg : 'html5_inicis',
        pay_method : 'card',
        merchant_uid: merchantUid,
        name: orderName,
        amount,
        buyer_email: form.email?.trim() || undefined,
        buyer_name: recipientName,
        buyer_tel: form.phone.trim(),
        buyer_addr: [form.address.trim(), form.addressDetail?.trim()].filter(Boolean).join(' '),
        buyer_postcode: ''
      },
      async (rsp) => {
        try {
          if (rsp.success) {
            await createOrderAfterPayment(orderPayload)
          } else {
            if (rsp.error_msg) {
              alert(rsp.error_msg)
            } else {
              alert('결제가 취소되었거나 실패했습니다.')
            }
          }
    } catch (err) {
      const detail = err.response?.data?.error || err.message
      console.error('주문 생성 실패:', err.response?.status, err.response?.data, err.message)
      alert(detail ? `주문에 실패했습니다.\n${detail}` : '주문에 실패했습니다.')
    } finally {
          setIsSubmitting(false)
        }
      }
    )
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="order-page">
          <div className="order-loading">장바구니를 불러오는 중...</div>
        </div>
      </>
    )
  }

  if (error || !cart?.items?.length) {
    return (
      <>
        <Navbar />
        <div className="order-page">
          <div className="order-error">
            <p>{error || '주문할 상품이 없습니다.'}</p>
            <button onClick={() => navigate('/cart')} className="order-back-btn">
              장바구니로 돌아가기
            </button>
          </div>
        </div>
      </>
    )
  }

  const items = cart.items || []
  const subtotal = cart.totalAmount || 0
  const total = subtotal

  return (
    <>
      <Navbar />
      <div className="order-page">
        <div className="order-container">
          {/* Progress */}
          <div className="order-progress">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className={`order-step ${step.num === currentStep ? 'active' : ''}`}
              >
                <span className="order-step-num">{step.num}</span>
                <span className="order-step-label">{step.label}</span>
              </div>
            ))}
          </div>

          <div className="order-main">
            {/* Left: step content */}
            <div className="order-form-section">
              {currentStep === 1 && (
                <>
                  <h2 className="order-form-title">
                    <span className="order-form-icon">🚚</span>
                    배송 정보
                  </h2>
                  <div className="order-form-grid">
                    <div className="order-field">
                      <label>이름</label>
                      <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="홍"
                      />
                    </div>
                    <div className="order-field">
                      <label>성</label>
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="길동"
                      />
                    </div>
                  </div>
                  <div className="order-field">
                    <label>이메일</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="example@email.com"
                    />
                  </div>
                  <div className="order-field">
                    <label>연락처</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="010-1234-5678"
                    />
                  </div>
                  <div className="order-field">
                    <label>기본 주소</label>
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="서울시 강남구 테헤란로 123"
                    />
                  </div>
                  <div className="order-field">
                    <label>상세 주소</label>
                    <input
                      type="text"
                      name="addressDetail"
                      value={form.addressDetail}
                      onChange={handleChange}
                      placeholder="동, 호수 입력 (선택)"
                    />
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <h2 className="order-form-title">
                    <span className="order-form-icon">💳</span>
                    결제 정보
                  </h2>
                  <div className="order-payment-step">
                    <p className="order-payment-desc">결제 수단을 선택해 주세요.</p>
                    <div className="order-payment-blocks">
                      <button
                        type="button"
                        className={`order-payment-block ${form.paymentMethod === 'card' ? 'selected' : ''}`}
                        onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'card' }))}
                      >
                        <span className="order-payment-block-icon">💳</span>
                        <span className="order-payment-block-label">신용카드</span>
                      </button>
                      <button
                        type="button"
                        className={`order-payment-block ${form.paymentMethod === 'transfer' ? 'selected' : ''}`}
                        onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'transfer' }))}
                      >
                        <span className="order-payment-block-icon">🏦</span>
                        <span className="order-payment-block-label">계좌이체</span>
                      </button>
                      <button
                        type="button"
                        className={`order-payment-block ${form.paymentMethod === 'kakao' ? 'selected' : ''}`}
                        onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'kakao' }))}
                      >
                        <span className="order-payment-block-icon">
                          <img
                            src="https://t1.kakaocdn.net/kakaopay/logo/logo_black.png"
                            alt="카카오페이"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                          />
                          <span style={{ display: 'none' }}>🟡</span>
                        </span>
                        <span className="order-payment-block-label">카카오페이</span>
                      </button>
                      <button
                        type="button"
                        className={`order-payment-block ${form.paymentMethod === 'naver' ? 'selected' : ''}`}
                        onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'naver' }))}
                      >
                        <span className="order-payment-block-icon">
                          <img
                            src="https://static.nid.naver.com/images/logo_pay_gn.png"
                            alt="네이버페이"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                          />
                          <span style={{ display: 'none' }}>🟢</span>
                        </span>
                        <span className="order-payment-block-label">네이버페이</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <h2 className="order-form-title">
                    <span className="order-form-icon">✓</span>
                    주문 확인
                  </h2>
                  <div className="order-review-box">
                    <h3 className="order-review-subtitle">배송 정보</h3>
                    <p><strong>{form.firstName} {form.lastName}</strong></p>
                    <p>{form.phone}</p>
                    <p>{form.address}{form.addressDetail ? ` ${form.addressDetail}` : ''}</p>
                    {form.email && <p>{form.email}</p>}
                  </div>
                </>
              )}
            </div>

            {/* Right: Order summary */}
            <div className="order-summary-section">
              <h2 className="order-summary-title">주문 요약</h2>
              <div className="order-summary-items">
                {items.map((item) => {
                  const product = item.productId
                  const name = product?.name ?? item.name ?? '상품'
                  const image = product?.image ?? item.image
                  const price = item.price * item.quantity
                  return (
                    <div key={item._id} className="order-summary-item">
                      <div className="order-summary-item-img-wrap">
                        {image ? (
                          <img src={image} alt={name} />
                        ) : (
                          <div className="order-summary-item-placeholder">이미지 없음</div>
                        )}
                        <span className="order-summary-item-qty">{item.quantity}</span>
                      </div>
                      <div className="order-summary-item-info">
                        <p className="order-summary-item-name">{name}</p>
                        <p className="order-summary-item-price">
                          ₩{price.toLocaleString()}
                        </p>
                        <div className="order-summary-item-actions">
                          <div className="order-summary-quantity">
                            <button
                              type="button"
                              className="order-summary-qty-btn"
                              onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label="수량 줄이기"
                            >
                              −
                            </button>
                            <span className="order-summary-qty-value">{item.quantity}</span>
                            <button
                              type="button"
                              className="order-summary-qty-btn"
                              onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                              aria-label="수량 늘리기"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="order-summary-remove-btn"
                            onClick={() => handleRemoveItem(item._id)}
                            title="삭제"
                            aria-label="삭제"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="order-summary-cost">
                <div className="order-summary-row">
                  <span>소계 ({items.length}개 상품)</span>
                  <span>₩{subtotal.toLocaleString()}</span>
                </div>
                <div className="order-summary-row">
                  <span>배송비</span>
                  <span className="order-shipping-free">무료</span>
                </div>
              </div>
              <div className="order-summary-total">
                <span>총 결제금액</span>
                <span>₩{total.toLocaleString()}</span>
              </div>
              <div className="order-step-buttons">
                {currentStep > 1 && (
                  <button
                    type="button"
                    className="order-prev-btn"
                    onClick={handlePrevStep}
                  >
                    이전
                  </button>
                )}
                {currentStep < 3 ? (
                  <button
                    type="button"
                    className="order-place-btn"
                    onClick={handleNextStep}
                  >
                    다음
                  </button>
                ) : (
                  <button
                    type="button"
                    className="order-place-btn"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                  >
                    <span className="order-place-btn-icon">🔒</span>
                    {isSubmitting ? '처리 중...' : '주문하기'}
                  </button>
                )}
              </div>
              <p className="order-secure-msg">보안 SSL 암호화 결제</p>
              <div className="order-payment-icons">
                <span>VISA</span>
                <span>MC</span>
                <span>AMEX</span>
                <span>PAYPAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default OrderPage
