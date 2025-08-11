import React, { useState } from 'react';
import { Navbar, Nav, Container, Offcanvas, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FaHome, 
  FaCalendarAlt, 
  FaUsers, 
  FaCog, 
  FaChartBar, 
  FaSignOutAlt,
  FaBars,
  FaUser
} from 'react-icons/fa';

const Layout = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navigationItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <FaHome />,
      permission: null // All users can access dashboard
    },
    {
      path: '/bookings',
      label: 'Bookings',
      icon: <FaCalendarAlt />,
      permission: 'view_bookings'
    },
    {
      path: '/guests',
      label: 'Guests',
      icon: <FaUsers />,
      permission: 'view_guests'
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: <FaChartBar />,
      permission: 'view_reports'
    }
  ];

  const settingsItems = [
    {
      path: '/settings/pricing',
      label: 'Pricing Rules',
      icon: <FaCog />,
      permission: 'manage_pricing'
    },
    {
      path: '/settings/users',
      label: 'User Management',
      icon: <FaUsers />,
      permission: 'manage_users'
    },
    {
      path: '/settings/audit-logs',
      label: 'Audit Logs',
      icon: <FaChartBar />,
      permission: 'view_audit_logs'
    }
  ];

  const SidebarContent = () => (
    <>
      <div className="p-3 border-bottom">
        <h5 className="text-white mb-0">Apartment Booking</h5>
        <small className="text-white-50">Admin System</small>
      </div>
      
      <Nav className="flex-column p-3">
        {navigationItems.map((item) => (
          (!item.permission || hasPermission(item.permission)) && (
            <Nav.Link
              key={item.path}
              as={Link}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setShowSidebar(false)}
            >
              {item.icon} {item.label}
            </Nav.Link>
          )
        ))}
        
        {/* Settings Section */}
        {settingsItems.some(item => hasPermission(item.permission)) && (
          <>
            <div className="mt-4 mb-2">
              <small className="text-white-50 text-uppercase">Settings</small>
            </div>
            {settingsItems.map((item) => (
              hasPermission(item.permission) && (
                <Nav.Link
                  key={item.path}
                  as={Link}
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => setShowSidebar(false)}
                >
                  {item.icon} {item.label}
                </Nav.Link>
              )
            ))}
          </>
        )}
      </Nav>
    </>
  );

  return (
    <div className="d-flex">
      {/* Desktop Sidebar */}
      <div className="sidebar d-none d-md-block" style={{ width: '250px' }}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} placement="start">
        <Offcanvas.Header closeButton className="bg-primary text-white">
          <Offcanvas.Title>Apartment Booking</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <SidebarContent />
        </Offcanvas.Body>
      </Offcanvas>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Header */}
        <Navbar bg="white" className="border-bottom shadow-sm">
          <Container fluid>
            <Button
              variant="outline-primary"
              className="d-md-none me-2"
              onClick={() => setShowSidebar(true)}
            >
              <FaBars />
            </Button>
            
            <Navbar.Brand className="d-none d-md-block">
              Apartment Booking Admin
            </Navbar.Brand>

            <Nav className="ms-auto">
              <Nav.Item className="d-flex align-items-center me-3">
                <FaUser className="text-muted me-2" />
                <span className="text-muted">{user?.name}</span>
                <span className="badge bg-primary ms-2">{user?.role}</span>
              </Nav.Item>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleLogout}
              >
                <FaSignOutAlt /> Logout
              </Button>
            </Nav>
          </Container>
        </Navbar>

        {/* Page Content */}
        <div className="main-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;

