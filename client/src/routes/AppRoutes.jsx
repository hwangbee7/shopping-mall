import { Routes, Route } from 'react-router-dom'
import MainPage from '../pages/MainPage'
import RegisterPage from '../pages/RegisterPage'
import LoginPage from '../pages/LoginPage'
import AdminPage from '../pages/admin/AdminPage'
import ProductRegisterPage from '../pages/admin/ProductRegisterPage'
import ProductDetailPage from '../pages/ProductDetailPage'
import CartPage from '../pages/CartPage'
import OrderPage from '../pages/OrderPage'
import OrderSuccessPage from '../pages/OrderSuccessPage'
import OrderListPage from '../pages/OrderListPage'
import OrderDetailPage from '../pages/OrderDetailPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/signup" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/products/register" element={<ProductRegisterPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/order/success" element={<OrderSuccessPage />} />
      <Route path="/orders" element={<OrderListPage />} />
      <Route path="/orders/:id" element={<OrderDetailPage />} />
    </Routes>
  )
}

export default AppRoutes
