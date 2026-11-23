import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import References from './pages/admin/References';
import AdminSales from './pages/admin/Sales';
import AdminOrders from './pages/admin/Orders';
import CashRegister from './pages/admin/CashRegister';
import Reports from './pages/admin/Reports';
import AdminUsers from './pages/admin/Users';
import Stock from './pages/admin/Stock';
import Pos from './pages/cashier/Pos';
import CashierProducts from './pages/cashier/Products';
import Returns from './pages/cashier/Returns';
import MySales from './pages/cashier/MySales';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-brand" role="status" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'caissier' ? '/cashier/pos' : '/admin/dashboard'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin', 'gestionnaire']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="references" element={<References />} />
        <Route path="stock" element={<Stock />} />
        <Route path="sales" element={<AdminSales />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="cash-register" element={<CashRegister />} />
        <Route path="reports" element={<Reports />} />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/cashier"
        element={
          <ProtectedRoute roles={['caissier']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="pos" replace />} />
        <Route path="pos" element={<Pos />} />
        <Route path="products" element={<CashierProducts />} />
        <Route path="returns" element={<Returns />} />
        <Route path="sales" element={<MySales />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
