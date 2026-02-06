import axios from 'axios'

// API 주소: 끝에 /api 필수. VITE_API_URL 없으면 아래 기본값 사용
const baseURL = (import.meta.env.VITE_API_URL || 'https://port-0-shopping-mall-mkrzhfy7035ed316.sel5.cloudtype.app/api').replace(/\/$/, '')
axios.defaults.baseURL = baseURL

export default axios
