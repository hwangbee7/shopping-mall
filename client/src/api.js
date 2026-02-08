import axios from 'axios'

// 백엔드 API 주소 (Vercel 환경 변수 VITE_API_URL 설정 시 우선 사용)
const baseURL = (import.meta.env.VITE_API_URL || 'https://port-0-shopping-mall-mkrzhfy7035ed316.sel3.cloudtype.app/api').replace(/\/$/, '')

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true
})

export default api
export { baseURL }
