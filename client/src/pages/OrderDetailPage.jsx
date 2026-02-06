import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Navbar from './Navbar'
import '../App.css'

function OrderDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        setError('주문 ID가 없습니다.')
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        setError(null)
        const token = localStorage.getItem('token')
        if (!token) {
          navigate('/login')
          return
        }
        const response = await axios.get(`/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data?.success && response.data.data) {
          setOrder(response.data.data)
        } else {
          setError('주문 정보를 불러올 수 없습니다.')
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login')
        } else if (err.response?.status === 404) {
          setError('주문을 찾을 수 없습니다.')
        } else {
          setError(err.response?.data?.error || '주문 조회 중 오류가 발생했습니다.')
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrder()
  }, [id, navigate])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const normalizeOrderStatus = (s) => {
    const ko = ['주문 확인', '상품 준비중', '배송시작', '배송중', '배송완료', '주문취소']
    const map = { pending: '주문 확인', confirmed: '주문 확인', processing: '상품 준비중', shipped: '배송중', delivered: '배송완료', cancelled: '주문취소' }
    if (!s) return '주문 확인'
    return ko.includes(s) ? s : (map[s] || '주문 확인')
  }
  const getStatusLabel = (orderStatus) => normalizeOrderStatus(orderStatus)
  const getStatusBadgeClass = (orderStatus) => {
    const s = normalizeOrderStatus(orderStatus)
    if (s === '배송시작' || s === '배송중') return 'shipping'
    if (s === '배송완료') return 'completed'
    if (s === '주문취소') return 'cancelled'
    return 'processing'
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="order-detail-page">
          <div className="order-detail-container">
            <div className="order-detail-loading">주문 정보를 불러오는 중...</div>
          </div>
        </div>
      </>
    )
  }

  if (error || !order) {
    return (
      <>
        <Navbar />
        <div className="order-detail-page">
          <div className="order-detail-container">
            <div className="order-detail-error">
              <p>{error || '주문을 찾을 수 없습니다.'}</p>
              <button type="button" className="order-detail-btn" onClick={() => navigate('/orders')}>
                주문 목록으로
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="order-detail-page">
        <div className="order-detail-container">
          <div className="order-detail-header">
            <h1 className="order-detail-title">주문 상세</h1>
            <button type="button" className="order-detail-back" onClick={() => navigate('/orders')}>
              ← 주문 목록
            </button>
          </div>

          <div className="order-detail-card">
            <div className="order-detail-meta">
              <div className="order-detail-meta-row">
                <span className="order-detail-label">주문번호</span>
                <span className="order-detail-value">{order.orderNumber}</span>
              </div>
              <div className="order-detail-meta-row">
                <span className="order-detail-label">주문일시</span>
                <span className="order-detail-value">{formatDate(order.createdAt)}</span>
              </div>
              <div className="order-detail-meta-row">
                <span className="order-detail-label">주문 상태</span>
                <span className={`order-detail-status-badge ${getStatusBadgeClass(order.orderStatus)}`}>
                  {getStatusLabel(order.orderStatus)}
                </span>
              </div>
              {order.trackingNumber && (
                <div className="order-detail-meta-row">
                  <span className="order-detail-label">송장번호</span>
                  <span className="order-detail-value">{order.trackingNumber}</span>
                </div>
              )}
              <div className="order-detail-meta-row">
                <span className="order-detail-label">총 결제금액</span>
                <span className="order-detail-value order-detail-total">{(order.totalAmount ?? 0).toLocaleString()}원</span>
              </div>
            </div>

            <h2 className="order-detail-section-title">주문 상품</h2>
            <ul className="order-detail-products">
              {order.items?.map((item, idx) => (
                <li key={item._id || idx} className="order-detail-product">
                  <div className="order-detail-product-img-wrap">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="order-detail-product-img" />
                    ) : (
                      <div className="order-detail-product-placeholder">이미지 없음</div>
                    )}
                  </div>
                  <div className="order-detail-product-body">
                    <p className="order-detail-product-name">{item.name}</p>
                    {(item.size || item.color) && (
                      <p className="order-detail-product-option">
                        {[item.size && `사이즈: ${item.size}`, item.color && `색상: ${item.color}`].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    <p className="order-detail-product-qty">수량: {item.quantity}</p>
                    <p className="order-detail-product-price">{(item.price * item.quantity).toLocaleString()}원</p>
                  </div>
                </li>
              ))}
            </ul>

            <h2 className="order-detail-section-title">배송 정보</h2>
            <div className="order-detail-shipping">
              <p><strong>수령인</strong> {order.recipientName}</p>
              <p><strong>연락처</strong> {order.recipientPhone}</p>
              <p><strong>주소</strong> {[order.shippingAddress?.address, order.shippingAddress?.addressDetail].filter(Boolean).join(' ')}</p>
            </div>

            {order.trackingNumber && (
              <div className="order-detail-actions">
                <button
                  type="button"
                  className="order-detail-action-btn"
                  onClick={() => window.open(`https://tracker.delivery/#/${order.trackingNumber}`, '_blank')}
                >
                  배송 추적하기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default OrderDetailPage
