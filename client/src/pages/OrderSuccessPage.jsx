import { useNavigate, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import '../App.css'

function OrderSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const order = location.state?.order

  const orderDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null

  return (
    <>
      <Navbar />
      <div className="order-success-page">
        <div className="order-success-card">
          <div className="order-success-icon-wrap">
            <span className="order-success-icon" aria-hidden>✓</span>
          </div>
          <h1 className="order-success-heading">주문에 성공했습니다</h1>
          <p className="order-success-desc">주문해 주셔서 감사합니다.</p>

          {order && (
            <>
              <div className="order-success-info">
                {order.orderNumber && (
                  <div className="order-success-row">
                    <span className="order-success-label">주문번호</span>
                    <span className="order-success-value">{order.orderNumber}</span>
                  </div>
                )}
                {orderDate && (
                  <div className="order-success-row">
                    <span className="order-success-label">주문일시</span>
                    <span className="order-success-value">{orderDate}</span>
                  </div>
                )}
                {order.totalAmount != null && (
                  <div className="order-success-row">
                    <span className="order-success-label">결제금액</span>
                    <span className="order-success-value">
                      {order.totalAmount?.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>

              {order.items && order.items.length > 0 && (
                <div className="order-success-products">
                  <h3 className="order-success-products-title">주문 상품</h3>
                  <ul className="order-success-product-list">
                    {order.items.map((item, index) => (
                      <li key={item._id || index} className="order-success-product-item">
                        <div className="order-success-product-img-wrap">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="order-success-product-img" />
                          ) : (
                            <div className="order-success-product-placeholder">이미지 없음</div>
                          )}
                        </div>
                        <div className="order-success-product-detail">
                          <p className="order-success-product-name">{item.name}</p>
                          {(item.size || item.color) && (
                            <p className="order-success-product-option">
                              {[item.size, item.color].filter(Boolean).join(' / ')}
                            </p>
                          )}
                          <p className="order-success-product-qty-price">
                            {item.quantity}개 · {(item.price * item.quantity).toLocaleString()}원
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="order-success-actions">
            <button
              className="order-success-btn order-success-btn-primary"
              onClick={() => navigate('/orders')}
            >
              주문 목록보기
            </button>
            <button
              className="order-success-btn order-success-btn-outline"
              onClick={() => navigate('/')}
            >
              계속 쇼핑하기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default OrderSuccessPage
