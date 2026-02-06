import axios from 'axios'

// 백엔드 API 절대 경로 (배포 사이트 서버 연결용)
const api = axios.create({
  baseURL: 'https://port-0-shopping-mall-mkrzhfy7035ed316.sel5.cloudtype.app/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true
})

export default api
