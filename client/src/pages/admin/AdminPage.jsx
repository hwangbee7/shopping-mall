import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from '../../api'
import Navbar from '../Navbar'
import ProductManagePage from './ProductManagePage'
import '../../App.css'

const TAB_ALL = 'all'
const ORDER_STATUS_TABS = ['주문 확인', '상품 준비중', '배송시작', '배송중', '배송완료', '주문취소']
const ORDER_STATUS_KO = ['주문 확인', '상품 준비중', '배송시작', '배송중', '배송완료', '주문취소']
const ORDER_STATUS_DISPLAY_MAP = {
  pending: '주문 확인',
  confirmed: '주문 확인',
  processing: '상품 준비중',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '주문취소'
}
function normalizeOrderStatus(s) {
  if (!s) return '주문 확인'
  return ORDER_STATUS_KO.includes(s) ? s : (ORDER_STATUS_DISPLAY_MAP[s] || '주문 확인')
}
function getOrderStatusClass(orderStatus) {
  const s = orderStatus || '주문 확인'
  if (s === '배송시작' || s === '배송중' || s === 'shipped') return 'shipping'
  if (s === '배송완료' || s === 'delivered') return 'completed'
  if (s === '주문취소' || s === 'cancelled') return 'cancelled'
  return 'pending'
}
function formatDateShort(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\. /g, '-').replace(/\.$/, '')
}

function AdminPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [orderListStatusTab, setOrderListStatusTab] = useState(TAB_ALL)
  const [orderSearchQuery, setOrderSearchQuery] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const orderManagementRef = useRef(null)

  useEffect(() => {
    if (activeTab === 'orders' && orderManagementRef.current) {
      orderManagementRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeTab])

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          navigate('/login')
          return
        }
        const response = await axios.get('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.data.success) {
          const userData = response.data.data
          if (userData.user_type !== 'admin') {
            alert('관리자 권한이 필요합니다.')
            navigate('/')
            return
          }
          setUser(userData)
          fetchDashboardData()
        } else {
          navigate('/login')
        }
      } catch (error) {
        navigate('/login')
      }
    }
    checkAdmin()
  }, [navigate])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      const [ordersRes, productsRes, usersRes] = await Promise.all([
        axios.get('/api/orders', { headers: authHeaders, params: { limit: 100 } }),
        axios.get('/api/products', { headers: authHeaders }),
        axios.get('/api/users', { headers: authHeaders })
      ])
      const orders = ordersRes.data?.success ? ordersRes.data.data : []
      const products = productsRes.data?.success ? productsRes.data.data : []
      const users = usersRes.data?.success ? usersRes.data.data : []
      const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      setStats({
        totalOrders: orders.length,
        totalProducts: products.length,
        totalCustomers: users.length,
        totalSales: totalSales
      })
      const sortedOrders = [...orders].sort((a, b) =>
        new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt)
      ).slice(0, 5)
      setRecentOrders(sortedOrders)
      setProducts(products)
      setOrders(orders)
    } catch (error) {
      console.error('데이터 로딩 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const adminOrderStatusCounts = useMemo(() => {
    const counts = { [TAB_ALL]: orders.length }
    ORDER_STATUS_TABS.forEach((status) => {
      counts[status] = orders.filter((o) => normalizeOrderStatus(o.orderStatus) === status).length
    })
    return counts
  }, [orders])

  const adminFilteredOrders = useMemo(() => {
    let list = orders
    if (orderListStatusTab !== TAB_ALL) {
      list = list.filter((o) => normalizeOrderStatus(o.orderStatus) === orderListStatusTab)
    }
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toLowerCase()
      list = list.filter((o) => {
        const orderNum = (o.orderNumber || '').toLowerCase()
        const customerName = (o.userId?.name || o.recipientName || '').toLowerCase()
        const email = (o.userId?.email || '').toLowerCase()
        return orderNum.includes(q) || customerName.includes(q) || email.includes(q)
      })
    }
    return list
  }, [orders, orderListStatusTab, orderSearchQuery])

  const getOrderCustomerName = (order) => order.userId?.name || order.recipientName || '-'
  const getOrderCustomerEmail = (order) => order.userId?.email || '-'
  const getOrderShippingAddress = (order) => {
    const a = order.shippingAddress
    if (!a) return '-'
    return [a.address, a.addressDetail].filter(Boolean).join(' ') || '-'
  }

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      setUpdatingOrderId(orderId)
      await axios.put(`/api/orders/${orderId}`, { orderStatus: newStatus }, { headers: { Authorization: `Bearer ${token}` } })
      await fetchDashboardData()
    } catch (err) {
      alert(err.response?.data?.error || '상태 변경에 실패했습니다.')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="admin-page">
          <div className="loading">로딩 중...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="admin-page">
        <div className="admin-tabs">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>대시보드</button>
          <button className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>상품관리</button>
          <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>주문관리</button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="admin-header">
              <h1>관리자 대시보드</h1>
              <p>CIDER 쇼핑몰 관리 시스템에 오신 것을 환영합니다.</p>
            </div>
            <div className="kpi-cards">
              <div className="kpi-card">
                <div className="kpi-icon blue">🛒</div>
                <div className="kpi-content">
                  <h3>총 주문</h3>
                  <p className="kpi-value">{stats.totalOrders.toLocaleString()}</p>
                  <p className="kpi-change positive">+12% from last month</p>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon green">📦</div>
                <div className="kpi-content">
                  <h3>총 상품</h3>
                  <p className="kpi-value">{stats.totalProducts.toLocaleString()}</p>
                  <p className="kpi-change positive">+3% from last month</p>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon purple">👥</div>
                <div className="kpi-content">
                  <h3>총 고객</h3>
                  <p className="kpi-value">{stats.totalCustomers.toLocaleString()}</p>
                  <p className="kpi-change positive">+8% from last month</p>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon orange">📈</div>
                <div className="kpi-content">
                  <h3>총 매출</h3>
                  <p className="kpi-value">${stats.totalSales.toLocaleString()}</p>
                  <p className="kpi-change positive">+15% from last month</p>
                </div>
              </div>
            </div>
            <div className="admin-main-content">
              <div className="admin-left-column">
                <div className="quick-actions">
                  <h2>빠른 작업</h2>
                  <Link to="/admin/products/register" className="quick-action-btn primary"><span>+</span> 새 상품 등록</Link>
                  <button className="quick-action-btn" onClick={() => setActiveTab('orders')}><span>👁️</span> 주문 관리</button>
                  <button className="quick-action-btn"><span>📊</span> 매출 분석</button>
                  <button className="quick-action-btn"><span>👤</span> 고객 관리</button>
                </div>
              </div>
              <div className="admin-right-column">
                <div className="recent-orders">
                  <div className="section-header">
                    <h2>최근 주문</h2>
                    <button className="view-all-btn" onClick={() => setActiveTab('orders')}>전체보기</button>
                  </div>
                  <div className="orders-list">
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order, index) => (
                        <div key={order._id || index} className="order-item">
                          <div className="order-id">ORD-{String(order._id || '').slice(-6).toUpperCase()}</div>
                          <div className="order-customer">고객 {index + 1}</div>
                          <div className="order-date">{order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</div>
                          <div className="order-amount">${order.totalAmount || 0}</div>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">주문 내역이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'products' && (
          <ProductManagePage onBack={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'orders' && (
          <div ref={orderManagementRef} className="admin-section admin-order-list-wrap">
            <div className="admin-order-header">
              <button type="button" className="admin-order-back" onClick={() => setActiveTab('dashboard')}>←</button>
              <h1 className="admin-order-list-title">주문 관리</h1>
            </div>
            <div className="admin-order-search-row">
              <div className="admin-order-search-wrap">
                <span className="admin-order-search-icon">🔍</span>
                <input type="text" className="admin-order-search-input" placeholder="주문번호 또는 고객명으로 검색..." value={orderSearchQuery} onChange={(e) => setOrderSearchQuery(e.target.value)} />
              </div>
              <button type="button" className="admin-order-filter-btn" title="필터">필터</button>
            </div>
            {orders.length > 0 && (
              <div className="order-list-tabs">
                <button type="button" className={`order-list-tab ${orderListStatusTab === TAB_ALL ? 'active' : ''}`} onClick={() => setOrderListStatusTab(TAB_ALL)}>전체 <span className="order-list-tab-count">({adminOrderStatusCounts[TAB_ALL]})</span></button>
                {ORDER_STATUS_TABS.map((status) => (
                  <button key={status} type="button" className={`order-list-tab ${orderListStatusTab === status ? 'active' : ''}`} onClick={() => setOrderListStatusTab(status)}>{status} <span className="order-list-tab-count">({adminOrderStatusCounts[status] ?? 0})</span></button>
                ))}
              </div>
            )}
            {orders.length === 0 && <div className="order-list-empty"><p>주문 내역이 없습니다.</p></div>}
            {orders.length > 0 && adminFilteredOrders.length === 0 && <div className="order-list-empty"><p>검색 결과 또는 해당 상태의 주문이 없습니다.</p></div>}
            {orders.length > 0 && adminFilteredOrders.length > 0 && (
              <ul className="admin-order-cards">
                {adminFilteredOrders.map((order) => (
                  <li key={order._id} className="admin-order-card">
                    <div className="admin-order-card-top">
                      <span className="admin-order-id">{order.orderNumber || `ORD-${String(order._id).slice(-6).toUpperCase()}`}</span>
                      <span className="admin-order-meta"><span className="admin-order-meta-icon">🕐</span>{getOrderCustomerName(order)} · {formatDateShort(order.createdAt)}</span>
                      <span className={`order-list-status-badge ${getOrderStatusClass(order.orderStatus)}`}>{normalizeOrderStatus(order.orderStatus)}</span>
                      <span className="admin-order-total">{(order.totalAmount ?? 0).toLocaleString()}원</span>
                      <button type="button" className="admin-order-detail-btn" onClick={() => navigate(`/orders/${order._id}`)}>상세보기</button>
                    </div>
                    <div className="admin-order-card-middle">
                      <div className="admin-order-block"><h4>고객 정보</h4><p>{getOrderCustomerEmail(order)}</p><p>{order.recipientPhone || '-'}</p></div>
                      <div className="admin-order-block"><h4>주문 상품</h4><p>{order.items?.length ?? 0}개 상품</p></div>
                      <div className="admin-order-block"><h4>배송 주소</h4><p>{getOrderShippingAddress(order)}</p></div>
                    </div>
                    <div className="admin-order-card-actions">
                      <label className="admin-order-status-label">
                        <span>상태 변경</span>
                        <select className="admin-order-status-select" value={normalizeOrderStatus(order.orderStatus)} onChange={(e) => { const newStatus = e.target.value; if (newStatus === '주문취소' && !window.confirm('이 주문을 취소하시겠습니까?')) return; handleUpdateOrderStatus(order._id, newStatus) }} disabled={updatingOrderId === order._id}>
                          {ORDER_STATUS_TABS.map((status) => (<option key={status} value={status}>{status}</option>))}
                        </select>
                      </label>
                      {updatingOrderId === order._id && <span className="admin-order-updating">저장 중...</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default AdminPage
