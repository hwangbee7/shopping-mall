import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from '../api'
import Navbar from './Navbar'
import '../App.css'

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState('M')
  const [selectedColor, setSelectedColor] = useState('blue')

  // 상품 상세 정보 가져오기
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await axios.get(`/products/${id}`)
        
        if (response.data.success) {
          setProduct(response.data.data)
        } else {
          setError(response.data.error || '상품을 찾을 수 없습니다.')
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || '상품을 불러올 수 없습니다.'
        setError(errorMessage)
        console.error('상품 상세 정보 가져오기 오류:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchProduct()
    }
  }, [id])

  // 수량 증가
  const increaseQuantity = () => {
    if (product && quantity < (product.stock || 10)) {
      setQuantity(prev => prev + 1)
    }
  }

  // 수량 감소
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1)
    }
  }

  // 장바구니 추가
  const handleAddToBag = async () => {
    try {
      // 로그인 확인
      const token = localStorage.getItem('token')
      if (!token) {
        alert('로그인이 필요합니다.')
        navigate('/login')
        return
      }

      // 재고 확인
      if (product.stock < quantity) {
        alert(`재고가 부족합니다. (현재 재고: ${product.stock}개)`)
        return
      }

      // 장바구니에 아이템 추가 API 호출
      const response = await axios.post(
        '/cart/items',
        {
          productId: product._id,
          quantity: quantity,
          price: product.price
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        alert(`${product.name} ${quantity}개가 장바구니에 추가되었습니다.`)
        // 장바구니 페이지로 이동하거나 현재 페이지에 머물 수 있음
        // navigate('/cart')
      } else {
        alert(response.data.error || '장바구니에 추가하는데 실패했습니다.')
      }
    } catch (error) {
      console.error('장바구니 추가 오류:', error)
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('로그인이 필요합니다.')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
      } else if (error.response?.status === 400) {
        // 재고 부족 등 클라이언트 오류
        alert(error.response.data.error || '장바구니에 추가할 수 없습니다.')
      } else {
        alert('장바구니에 추가하는 중 오류가 발생했습니다.')
      }
    }
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="product-detail-page">
          <div className="loading">상품 정보를 불러오는 중...</div>
        </div>
      </>
    )
  }

  if (error || !product) {
    return (
      <>
        <Navbar />
        <div className="product-detail-page">
          <div className="error-message">
            <p>{error || '상품을 찾을 수 없습니다.'}</p>
            <button onClick={() => navigate('/')} className="back-to-home-btn">
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </>
    )
  }

  // 할인율 계산 (예시: 원가가 있다고 가정)
  const originalPrice = product.price * 1.35 // 예시: 35% 할인
  const discountPercent = Math.round(((originalPrice - product.price) / originalPrice) * 100)

  return (
    <>
      <Navbar />
      <div className="product-detail-page">
        {/* Header */}
        <div className="product-detail-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ←
          </button>
          <h1 className="product-detail-title">{product.name}</h1>
          <div className="header-actions">
            <button className="icon-btn" title="공유">
              📤
            </button>
            <button className="icon-btn" title="좋아요">
              ❤️
            </button>
          </div>
        </div>

        {/* Product Content */}
        <div className="product-detail-content">
          {/* Left: Product Image */}
          <div className="product-detail-image-section">
            <div className="product-main-image">
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
                className="product-image-placeholder-large"
                style={{ display: product.image ? 'none' : 'flex' }}
              >
                <span>이미지 없음</span>
              </div>
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="product-detail-info-section">
            {/* Tags */}
            <div className="product-tags">
              <span className="tag new">NEW</span>
              <span className="tag sale">SALE</span>
            </div>

            {/* Product Name */}
            <h2 className="product-detail-name">{product.name}</h2>

            {/* Rating */}
            <div className="product-rating">
              <span className="star">⭐</span>
              <span className="rating-text">4.8 (124 reviews)</span>
            </div>

            {/* Price */}
            <div className="product-price-section">
              <div className="price-main">
                <span className="current-price">₩{product.price?.toLocaleString() || 0}</span>
                <span className="original-price">₩{Math.round(originalPrice).toLocaleString()}</span>
                <span className="discount-badge">{discountPercent}% OFF</span>
              </div>
            </div>

            {/* Size Selection */}
            <div className="product-option-group">
              <label className="option-label">Size</label>
              <div className="size-options">
                {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                  <button
                    key={size}
                    className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="product-option-group">
              <label className="option-label">Color:</label>
              <div className="color-options">
                {[
                  { name: 'blue', color: '#4A90E2' },
                  { name: 'black', color: '#000000' },
                  { name: 'light-blue', color: '#87CEEB' }
                ].map((colorOption) => (
                  <button
                    key={colorOption.name}
                    className={`color-btn ${selectedColor === colorOption.name ? 'active' : ''}`}
                    onClick={() => setSelectedColor(colorOption.name)}
                    style={{ backgroundColor: colorOption.color }}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="product-option-group">
              <label className="option-label">Quantity</label>
              <div className="quantity-section">
                <div className="quantity-selector">
                  <button 
                    className="quantity-btn"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="quantity-value">{quantity}</span>
                  <button 
                    className="quantity-btn"
                    onClick={increaseQuantity}
                    disabled={quantity >= (product.stock || 10)}
                  >
                    +
                  </button>
                </div>
                <span className="stock-info">
                  Only {product.stock || 5} left in stock
                </span>
              </div>
            </div>

            {/* Add to Bag Button */}
            <button className="add-to-bag-btn" onClick={handleAddToBag}>
              <span>🛍️</span> ADD TO BAG - ₩{(product.price * quantity).toLocaleString()}
            </button>

            {/* Description */}
            {product.description && (
              <div className="product-description-section">
                <h3>상품 설명</h3>
                <p>{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ProductDetailPage
