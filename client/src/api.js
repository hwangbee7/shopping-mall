import axios from 'axios'

// 백엔드 API 절대 경로 고정 (상대 경로 사용 시 Vercel 도메인으로 요청 감)
const DEFAULT_BASE_URL = 'https://port-0-shopping-mall-mkrzhfy7035ed316.sel5.cloudtype.app/api'
const envUrl = (import.meta.env.VITE_API_URL || '').toString().trim().replace(/\/$/, '')
const baseURL = envUrl && envUrl.startsWith('http') ? envUrl : DEFAULT_BASE_URL

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
})

export default api
