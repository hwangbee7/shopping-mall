import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from '../../api'
import '../../App.css'

function ProductManagePage({ onBack }) {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [productListTab, setProductListTab] = useState('list') // list, register
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    limit: 2,
    hasNextPage: false,
    hasPrevPage: false
  })

  // 상품 관리 상태
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    price: '',
    description: '',
    category: '',
    image: '',
    stock: ''
  })
  const [editingProduct, setEditingProduct] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)

  // 상품 목록 가져오기 (API 호출, 페이지네이션 지원)
  const fetchProducts = async (page = 1) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // 서버 API 호출 (페이지네이션 파라미터 포함)
      const response = await axios.get('/api/products', {
        params: {
          page: page,
          limit: 2 // 페이지당 2개
        }
      })
      
      if (response.data.success) {
        // API에서 받은 데이터를 상태에 저장
        setProducts(response.data.data || [])
        
        // 페이지네이션 정보 저장
        if (response.data.pagination) {
          setPagination(response.data.pagination)
        }
        
        console.log('상품 목록 로드 성공:', response.data.data?.length || 0, '개')
      } else {
        // 서버에서 success: false를 반환한 경우
        const errorMessage = response.data.error || '상품 목록을 가져오는데 실패했습니다.'
        setError(errorMessage)
        setProducts([])
        console.error('상품 목록 가져오기 실패:', errorMessage)
      }
    } catch (error) {
      // 네트워크 오류 또는 기타 오류
      const errorMessage = error.response?.data?.error || error.message || '서버에 연결할 수 없습니다.'
      setError(errorMessage)
      setProducts([])
      console.error('상품 목록 가져오기 오류:', error)
      
      // 사용자에게 알림 (선택사항)
      if (error.response?.status === 404) {
        console.warn('API 엔드포인트를 찾을 수 없습니다.')
      } else if (error.response?.status >= 500) {
        console.error('서버 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(1) // 첫 페이지 로드
  }, [])

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchProducts(newPage)
      // 페이지 상단으로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // 상품 등록/수정
  const handleProductSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // 필수 필드 검증
      if (!productForm.sku || !productForm.name || !productForm.price || !productForm.category || !productForm.image) {
        alert('SKU, 상품명, 가격, 카테고리, 이미지는 필수 항목입니다.')
        setIsLoading(false)
        return
      }

      const productData = {
        sku: productForm.sku.trim(),
        name: productForm.name.trim(),
        price: parseFloat(productForm.price),
        description: productForm.description.trim() || '',
        category: productForm.category,
        image: productForm.image.trim(),
        stock: parseInt(productForm.stock) || 0
      }

      if (editingProduct) {
        // 수정
        await axios.put(`/api/products/${editingProduct._id}`, productData)
        alert('상품이 수정되었습니다.')
      } else {
        // 등록
        await axios.post('/api/products', productData)
        alert('상품이 등록되었습니다.')
      }

      setShowProductModal(false)
      setProductForm({ sku: '', name: '', price: '', description: '', category: '', image: '', stock: '' })
      setEditingProduct(null)
      fetchProducts(pagination.currentPage) // 현재 페이지 새로고침
    } catch (error) {
      console.error('상품 등록/수정 오류:', error)
      const errorMessage = error.response?.data?.error || error.message || '상품 등록/수정 중 오류가 발생했습니다.'
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // 상품 삭제
  const handleProductDelete = async (productId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    try {
      await axios.delete(`/api/products/${productId}`)
      alert('상품이 삭제되었습니다.')
      fetchProducts(pagination.currentPage) // 현재 페이지 새로고침
    } catch (error) {
      console.error('상품 삭제 오류:', error)
      alert(error.response?.data?.error || '상품 삭제 중 오류가 발생했습니다.')
    }
  }

  // 상품 수정 모달 열기
  const handleEditProduct = (product) => {
    setEditingProduct(product)
    setProductForm({
      sku: product.sku || '',
      name: product.name || '',
      price: product.price || '',
      description: product.description || '',
      category: product.category || '',
      image: product.image || '',
      stock: product.stock || 0
    })
    setShowProductModal(true)
  }

  // 필터링된 상품 목록 (클라이언트 측 필터링은 페이지네이션과 함께 사용 시 제한적)
  // 서버 측 페이지네이션을 사용하므로 검색은 서버에서 처리하는 것이 좋지만,
  // 현재는 클라이언트 측 필터링 유지
  const filteredProducts = products.filter(product => 
    searchQuery === '' || 
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 초기 로딩 중일 때
  if (isLoading && products.length === 0 && !error) {
    return (
      <div className="product-management-page">
        <div className="loading">상품 목록을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="product-management-page">
      {/* Header */}
      <div className="product-management-header">
        <div className="product-management-header-left">
          <button 
            className="back-arrow-btn"
            onClick={onBack}
          >
            ←
          </button>
          <h1>상품 관리</h1>
        </div>
        <Link 
          to="/admin/products/register"
          className="new-product-btn"
        >
          <span>+</span> 새 상품 등록
        </Link>
      </div>

      {/* Tabs */}
      <div className="product-management-tabs">
        <button 
          className={`product-tab ${productListTab === 'list' ? 'active' : ''}`}
          onClick={() => setProductListTab('list')}
        >
          상품 목록
        </button>
        <button 
          className={`product-tab ${productListTab === 'register' ? 'active' : ''}`}
          onClick={() => {
            setProductListTab('register')
            navigate('/admin/products/register')
          }}
        >
          상품 등록
        </button>
      </div>

      {/* Search and Filter */}
      <div className="product-search-section">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="상품명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="filter-btn">
          <span>⚙️</span> 필터
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message-banner">
          <p>⚠️ {error}</p>
          <button onClick={fetchProducts} className="retry-btn">
            다시 시도
          </button>
        </div>
      )}

      {/* Product List Table */}
      <div className="product-list-table-container">
        <table className="product-list-table">
          <thead>
            <tr>
              <th>이미지</th>
              <th>상품명</th>
              <th>카테고리</th>
              <th>가격</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div className="product-image-cell">
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
                      <div className="product-image-placeholder" style={{ display: product.image ? 'none' : 'flex' }}>
                        <span>이미지 없음</span>
                      </div>
                    </div>
                  </td>
                  <td className="product-name-cell">{product.name}</td>
                  <td>{product.category || '기타'}</td>
                  <td className="product-price-cell">
                    ₩{product.price?.toLocaleString() || 0}
                  </td>
                  <td className="product-action-cell">
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => handleEditProduct(product)}
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleProductDelete(product._id)}
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-data">
                  {error 
                    ? '상품 목록을 불러올 수 없습니다.' 
                    : searchQuery 
                      ? '검색 결과가 없습니다.' 
                      : '등록된 상품이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            <span>
              {pagination.totalProducts}개 중 {((pagination.currentPage - 1) * pagination.limit) + 1}-
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalProducts)}개 표시
            </span>
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage || isLoading}
            >
              이전
            </button>
            
            <div className="pagination-numbers">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                // 현재 페이지 주변만 표시 (최대 5개)
                const showPage = 
                  pageNum === 1 ||
                  pageNum === pagination.totalPages ||
                  (pageNum >= pagination.currentPage - 1 && pageNum <= pagination.currentPage + 1);
                
                if (!showPage) {
                  // 생략 표시
                  if (pageNum === pagination.currentPage - 2 || pageNum === pagination.currentPage + 2) {
                    return <span key={pageNum} className="pagination-ellipsis">...</span>;
                  }
                  return null;
                }
                
                return (
                  <button
                    key={pageNum}
                    className={`pagination-number ${pageNum === pagination.currentPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isLoading}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || isLoading}
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProduct ? '상품 수정' : '새 상품 등록'}</h2>
            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                  required
                  placeholder="예: PROD-001"
                />
              </div>
              <div className="form-group">
                <label>상품명 *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>가격 *</label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>설명</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>카테고리 *</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                  required
                >
                  <option value="">선택하세요</option>
                  <option value="상의">상의</option>
                  <option value="하의">하의</option>
                  <option value="악세서리">악세서리</option>
                </select>
              </div>
              <div className="form-group">
                <label>이미지 URL *</label>
                <input
                  type="url"
                  value={productForm.image}
                  onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                  required
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="form-group">
                <label>재고</label>
                <input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowProductModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManagePage
