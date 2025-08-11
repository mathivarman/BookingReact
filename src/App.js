import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Login from './components/auth/Login';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import BookingList from './components/bookings/BookingList';
import BookingForm from './components/bookings/BookingForm';
import GuestList from './components/guests/GuestList';
import GuestForm from './components/guests/GuestForm';
import PricingRules from './components/settings/PricingRules';
import Reports from './components/reports/Reports';
import UserManagement from './components/settings/UserManagement';
import AuditLogs from './components/settings/AuditLogs';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Main App Component
const AppContent = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bookings" element={<BookingList />} />
        <Route path="/bookings/new" element={<BookingForm />} />
        <Route path="/bookings/edit/:id" element={<BookingForm />} />
        <Route path="/guests" element={<GuestList />} />
        <Route path="/guests/new" element={<GuestForm />} />
        <Route path="/guests/edit/:id" element={<GuestForm />} />
        <Route 
          path="/settings/pricing" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <PricingRules />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/users" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings/audit-logs" 
          element={
            <ProtectedRoute requiredRole="super_admin">
              <AuditLogs />
            </ProtectedRoute>
          } 
        />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

// Root App Component
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
