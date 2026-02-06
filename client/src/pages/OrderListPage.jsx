import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../api'
import Navbar from './Navbar'
import '../App.css'

const TAB_ALL = 'all'
const ORDER_STATUS_TABS = ['주문 확인', '상품 준비중', '배송시작', '배송중', '배송완료', '주문취소']

const ORDER_STATUS_KO = ['주문 확인', '상품 준비중', '배송시작', '배송중', '배송완료', '주문취소']
const ORDER_STATUS_MAP = {
  pending: '주문 확인',
  confirmed: '주문 확인',
  processing: '상품 준비중',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '주문취소'
}
function normalizeOrderStatus(s) {
  if (!s) return '주문 확인'
  return ORDER_STATUS_KO.includes(s) ? s : (ORDER_STATUS_MAP[s] || '주문 확인')
}

function OrderListPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState(TAB_ALL)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const token = localStorage.getItem('token')
        if (!token) {
          navigate('/login')
          return
        }
        const response = await axios.get('/orders', {
          params: { limit: 50 },
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data?.success && Array.isArray(response.data.data)) {
          setOrders(response.data.data)
        } else {
          setOrders([])
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login')
        } else {
          setError(err.response?.data?.error || '주문 목록을 불러오는 중 오류가 발생했습니다.')
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrders()
  }, [navigate])

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '-').replace('.', '')
  }

  const statusCounts = useMemo(() => {
    const counts = { [TAB_ALL]: orders.length }
    ORDER_STATUS_TABS.forEach((status) => {
      counts[status] = orders.filter((o) => normalizeOrderStatus(o.orderStatus) === status).length
    })
    return counts
  }, [orders])

  const filteredOrders = orders.filter((order) => {
    if (activeTab === TAB_ALL) return true
    return normalizeOrderStatus(order.orderStatus) === activeTab
  })

  const getStatusLabel = (orderStatus) => normalizeOrderStatus(orderStatus)

  const getStatusBadgeClass = (orderStatus) => {
    const s = normalizeOrderStatus(orderStatus)
    if (s === '배송시작' || s === '배송중') return 'shipping'
    if (s === '배송완료') return 'completed'
    if (s === '주문취소') return 'cancelled'
    return 'processing'
  }

  const handleOrderDetail = (orderId) => {
    navigate(`/orders/${orderId}`)
  }

  const handleTrackShipping = (order) => {
    if (order.trackingNumber) {
      window.open(`https://tracker.delivery/#/${order.trackingNumber}`, '_blank')
    } else {
      navigate(`/orders/${order._id}`)
    }
  }

  return (
    <>
      <Navbar />
      <div className="order-list-page">
        <div className="order-list-container">
          <h1 className="order-list-title">주문 내역</h1>

          {!isLoading && !error && orders.length > 0 && (
            <div className="order-list-tabs">
              <button
                type="button"
                className={`order-list-tab ${activeTab === TAB_ALL ? 'active' : ''}`}
                onClick={() => setActiveTab(TAB_ALL)}
              >
                전체 <span className="order-list-tab-count">({statusCounts[TAB_ALL]})</span>
              </button>
              {ORDER_STATUS_TABS.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`order-list-tab ${activeTab === status ? 'active' : ''}`}
                  onClick={() => setActiveTab(status)}
                >
                  {status} <span className="order-list-tab-count">({statusCounts[status] ?? 0})</span>
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="order-list-loading">주문 목록을 불러오는 중...</div>
          )}

          {!isLoading && error && (
            <div className="order-list-error">
              <p>{error}</p>
              <button type="button" className="order-list-btn" onClick={() => navigate('/')}>
                홈으로 가기
              </button>
            </div>
          )}

          {!isLoading && !error && orders.length === 0 && (
            <div className="order-list-empty">
              <p>주문 내역이 없습니다.</p>
              <button type="button" className="order-list-btn primary" onClick={() => navigate('/')}>
                쇼핑하러 가기
              </button>
            </div>
          )}

          {!isLoading && !error && filteredOrders.length === 0 && orders.length > 0 && (
            <div className="order-list-empty">
              <p>해당 상태의 주문이 없습니다.</p>
            </div>
          )}

          {!isLoading && !error && filteredOrders.length > 0 && (
            <ul className="order-list">
              {filteredOrders.map((order) => (
                <li key={order._id} className="order-list-item">
                  <div className="order-list-item-header">
                    <div className="order-list-item-left">
                      <span className="order-list-item-icon" aria-hidden>🕐</span>
                      <div>
                        <p className="order-list-item-number">주문 #{order.orderNumber}</p>
                        <p className="order-list-item-date">주문일: {formatDateShort(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="order-list-item-right">
                      <span className={`order-list-status-badge ${getStatusBadgeClass(order.orderStatus)}`}>
                        {getStatusLabel(order.orderStatus)}
                      </span>
                      <p className="order-list-item-total">
                        {(order.totalAmount ?? 0).toLocaleString()}원
                      </p>
                    </div>
                  </div>

                  <ul className="order-list-products">
                    {order.items?.map((item, idx) => (
                      <li key={item._id || idx} className="order-list-product">
                        <div className="order-list-product-img-wrap">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="order-list-product-img" />
                          ) : (
                            <div className="order-list-product-placeholder">이미지 없음</div>
                          )}
                        </div>
                        <div className="order-list-product-body">
                          <p className="order-list-product-name">{item.name}</p>
                          {(item.size || item.color) && (
                            <p className="order-list-product-option">
                              {[item.size && `사이즈: ${item.size}`, item.color && `색상: ${item.color}`].filter(Boolean).join(' • ')}
                            </p>
                          )}
                          <p className="order-list-product-qty">수량: {item.quantity}</p>
                          <p className="order-list-product-price">
                            {(item.price * item.quantity).toLocaleString()}원
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="order-list-item-actions">
                    <button
                      type="button"
                      className="order-list-action-btn order-list-action-btn-primary"
                      onClick={() => handleOrderDetail(order._id)}
                    >
                      주문 상세보기
                    </button>
                    <button
                      type="button"
                      className="order-list-action-btn order-list-action-btn-outline"
                      onClick={() => handleTrackShipping(order)}
                    >
                      배송 추적
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

export default OrderListPage
