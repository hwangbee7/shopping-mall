/**
 * 상품 등록 페이지
 * 
 * Cloudinary 환경 변수 설정 필요:
 * - VITE_CLOUDINARY_CLOUD_NAME: Cloudinary 계정의 cloud name
 * - VITE_CLOUDINARY_UPLOAD_PRESET: Upload preset 이름
 * 
 * 설정 방법:
 * 1. client 폴더에 .env 파일 생성
 * 2. VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name 추가
 * 3. VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset 추가
 * 4. 서버 재시작
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../Navbar'
import '../../App.css'

function ProductRegisterPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price: '',
    description: '',
    category: '',
    image: '',
    stock: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const cloudinaryRef = useRef()
  const widgetRef = useRef()

  useEffect(() => {
    // 어드민 권한 확인
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          navigate('/login')
          return
        }

        const response = await axios.get('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.success) {
          const userData = response.data.data
          if (userData.user_type !== 'admin') {
            alert('관리자 권한이 필요합니다.')
            navigate('/')
            return
          }
          setUser(userData)
        } else {
          navigate('/login')
        }
      } catch (error) {
        navigate('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAdmin()

    // Cloudinary 위젯 초기화
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (window.cloudinary && cloudName && uploadPreset) {
      cloudinaryRef.current = window.cloudinary
      
      widgetRef.current = cloudinaryRef.current.createUploadWidget(
        {
          cloudName: cloudName,
          uploadPreset: uploadPreset,
          sources: ['local', 'url', 'camera'],
          multiple: false,
          maxFileSize: 5000000, // 5MB
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary 업로드 오류:', error)
            alert('이미지 업로드 중 오류가 발생했습니다.')
            return
          }
          
          if (result && result.event === 'success') {
            // 업로드 성공 시 이미지 URL 설정
            setFormData(prev => ({
              ...prev,
              image: result.info.secure_url
            }))
            // 에러 초기화
            setErrors(prev => ({
              ...prev,
              image: ''
            }))
          }
        }
      )
    } else if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.')
    }

    // 컴포넌트 언마운트 시 위젯 정리
    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy()
      }
    }
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 에러 초기화
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU를 입력해주세요.'
    }
    if (!formData.name.trim()) {
      newErrors.name = '상품명을 입력해주세요.'
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = '유효한 가격을 입력해주세요.'
    }
    if (!formData.category) {
      newErrors.category = '카테고리를 선택해주세요.'
    }
    if (!formData.image.trim()) {
      newErrors.image = '이미지 URL을 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const productData = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim() || '',
        category: formData.category,
        image: formData.image.trim(),
        stock: parseInt(formData.stock) || 0
      }

      const response = await axios.post('/api/products', productData)
      
      if (response.data.success) {
        alert('상품이 등록되었습니다!')
        navigate('/admin')
      } else {
        throw new Error(response.data.error || '상품 등록에 실패했습니다.')
      }
    } catch (error) {
      console.error('상품 등록 오류:', error)
      const errorMessage = error.response?.data?.error || error.message || '상품 등록 중 오류가 발생했습니다.'
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="product-register-page">
          <div className="loading">로딩 중...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="product-register-page">
        <div className="product-register-header">
          <h1>새 상품 등록</h1>
        </div>

        <div className="product-register-form-container">
          <form onSubmit={handleSubmit} className="product-register-form">
            <div className="product-register-form-columns">
              {/* 왼쪽 컬럼 */}
              <div className="product-register-left-column">
                <div className="form-group">
                  <label htmlFor="sku">SKU *</label>
                  <input
                    type="text"
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="SKU를 입력하세요"
                    required
                    className={errors.sku ? 'error' : ''}
                  />
                  {errors.sku && <span className="error-message">{errors.sku}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="name">상품명 *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="상품명을 입력하세요"
                    required
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="price">판매가격 *</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0"
                    required
                    className={errors.price ? 'error' : ''}
                  />
                  {errors.price && <span className="error-message">{errors.price}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="category">카테고리 *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className={errors.category ? 'error' : ''}
                  >
                    <option value="">카테고리 선택</option>
                    <option value="상의">상의</option>
                    <option value="하의">하의</option>
                    <option value="악세서리">악세서리</option>
                  </select>
                  {errors.category && <span className="error-message">{errors.category}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="stock">재고</label>
                  <input
                    type="number"
                    id="stock"
                    name="stock"
                    min="0"
                    value={formData.stock}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* 오른쪽 컬럼 */}
              <div className="product-register-right-column">
                <div className="form-group">
                  <label htmlFor="description">상품설명</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="8"
                    placeholder="상품에 대한 자세한 설명을 입력하세요"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="image">메인 이미지 *</label>
                  <div className="image-upload-section">
                    {widgetRef.current ? (
                      <>
                        <button
                          type="button"
                          className="cloudinary-upload-btn"
                          onClick={() => widgetRef.current?.open()}
                        >
                          파일 선택
                        </button>
                        <span className="file-selected-text">
                          {formData.image ? '이미지가 선택되었습니다' : '선택된 파일 없음'}
                        </span>
                      </>
                    ) : (
                      <>
                        <input
                          type="url"
                          id="image"
                          name="image"
                          value={formData.image}
                          onChange={handleChange}
                          placeholder="이미지 URL을 입력하세요"
                          required
                          className={errors.image ? 'error' : ''}
                        />
                        <span className="file-selected-text">
                          Cloudinary 환경 변수가 설정되지 않아 URL 입력을 사용합니다.
                        </span>
                      </>
                    )}
                    {errors.image && <span className="error-message">{errors.image}</span>}
                    {formData.image && (
                      <div className="image-preview">
                        <img 
                          src={formData.image} 
                          alt="Preview" 
                          onError={(e) => { 
                            e.target.style.display = 'none'
                            setFormData(prev => ({ ...prev, image: '' }))
                          }} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => navigate('/admin')}>
                취소
              </button>
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default ProductRegisterPage
