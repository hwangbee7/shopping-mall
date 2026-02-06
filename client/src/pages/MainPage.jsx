import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../api'
import Navbar from './Navbar'
import '../App.css'

function MainPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // 상품 클릭 핸들러
  const handleProductClick = (productId) => {
    navigate(`/products/${productId}`)
  }

  // 전체 상품 데이터 가져오기 (API 호출)
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // 전체 상품 가져오기 (limit을 크게 설정하여 전체 조회)
        const response = await axios.get('/products', {
          params: {
            limit: 10000 // 전체 조회를 위해 큰 값 설정
          }
        })
        
        if (response.data.success) {
          setProducts(response.data.data || [])
          console.log('상품 목록 로드 성공:', response.data.data?.length || 0, '개')
        } else {
          const errorMessage = response.data.error || '상품 목록을 가져오는데 실패했습니다.'
          setError(errorMessage)
          setProducts([])
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || '서버에 연결할 수 없습니다.'
        setError(errorMessage)
        setProducts([])
        console.error('상품 목록 가져오기 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllProducts()
  }, [])

  // 최신 상품 (최근 3개)
  const newProducts = products
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 3)

  // 일반 상품 (나머지)
  const shopProducts = products
    .filter(product => !newProducts.some(newProduct => newProduct._id === product._id))
    .slice(0, 2)

  return (
    <div className="main-page">
      <Navbar />

      {/* Main Banner - 고해상도 단일 배너 (이미지: client/public/main-banner.png 에 넣으면 표시됨) */}
      <section className="main-banner-section" aria-label="메인 배너">
        <img
          src="/main-banner.png"
          alt="NEW COLLECTION - 스트릿웨어 컬렉션"
          className="main-banner-image"
          fetchPriority="high"
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.nextElementSibling?.classList.add('main-banner-fallback--visible')
          }}
        />
        <div className="main-banner-fallback">
          <span className="main-banner-fallback-title">NEW COLLECTION</span>
          <span className="main-banner-fallback-sub">Discover the latest trends</span>
        </div>
      </section>

      {/* Product Grid Section */}
      <section className="product-grid-section">
        <div className="product-grid-left">
          <h3 className="section-title">SHOP</h3>
          {isLoading ? (
            <div className="loading">상품을 불러오는 중...</div>
          ) : error ? (
            <div className="error-message">상품을 불러올 수 없습니다.</div>
          ) : (
            <div className="product-grid">
              {shopProducts.length > 0 ? (
                shopProducts.map((product) => (
                  <div 
                    key={product._id} 
                    className="product-item"
                    onClick={() => handleProductClick(product._id)}
                  >
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="product-image"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'block'
                        }}
                      />
                    ) : null}
                    <div 
                      className="product-image-placeholder"
                      style={{ display: product.image ? 'none' : 'block' }}
                    ></div>
                    <p className="product-name">{product.name}</p>
                    <p className="product-price">₩{product.price?.toLocaleString() || 0}</p>
                  </div>
                ))
              ) : (
                <div className="no-products">등록된 상품이 없습니다.</div>
              )}
            </div>
          )}
        </div>
        
        <div className="product-grid-right">
          <h3 className="section-title">NEW</h3>
          {isLoading ? (
            <div className="loading">상품을 불러오는 중...</div>
          ) : error ? (
            <div className="error-message">상품을 불러올 수 없습니다.</div>
          ) : (
            <div className="product-grid">
              {newProducts.length > 0 ? (
                newProducts.map((product) => (
                  <div 
                    key={product._id} 
                    className="product-item"
                    onClick={() => handleProductClick(product._id)}
                  >
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="product-image"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'block'
                        }}
                      />
                    ) : null}
                    <div 
                      className="product-image-placeholder"
                      style={{ display: product.image ? 'none' : 'block' }}
                    ></div>
                    <p className="product-name">{product.name}</p>
                    <p className="product-price">₩{product.price?.toLocaleString() || 0}</p>
                  </div>
                ))
              ) : (
                <div className="no-products">등록된 상품이 없습니다.</div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default MainPage
