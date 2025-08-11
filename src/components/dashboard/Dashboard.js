import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaUsers, 
  FaMoneyBillWave, 
  FaBed,
  FaPlus,
  FaEye,
  FaChartBar
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    totalGuests: 0,
    totalRevenue: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, bookingsResponse] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/bookings?limit=5&sort=created_at&order=desc')
      ]);

      setStats(statsResponse.data);
      const bookingsData = bookingsResponse.data.bookings;
      setRecentBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'secondary', label: 'Draft' },
      tentative: { variant: 'warning', label: 'Tentative' },
      confirmed: { variant: 'info', label: 'Confirmed' },
      'checked-in': { variant: 'success', label: 'Checked In' },
      'checked-out': { variant: 'primary', label: 'Checked Out' },
      cancelled: { variant: 'danger', label: 'Cancelled' }
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge bg={config.variant}>{config.label}</Badge>;
  };

  const StatCard = ({ title, value, icon, color, link }) => (
    <Card className="dashboard-card h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h6 className="dashboard-label">{title}</h6>
            <h3 className="dashboard-stat mb-0">{value}</h3>
          </div>
          <div className={`text-${color} fs-1`}>
            {icon}
          </div>
        </div>
        {link && (
          <Link to={link} className="text-decoration-none">
            <small className="text-muted">View Details →</small>
          </Link>
        )}
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <Container>
        <div className="loading-spinner">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Dashboard</h2>
          <p className="text-muted">Welcome to the Apartment Booking Admin System</p>
        </Col>
        <Col xs="auto">
          <Button as={Link} to="/bookings/new" variant="primary">
            <FaPlus /> New Booking
          </Button>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            icon={<FaCalendarAlt />}
            color="primary"
            link="/bookings"
          />
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <StatCard
            title="Active Bookings"
            value={stats.activeBookings}
            icon={<FaBed />}
            color="success"
            link="/bookings"
          />
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <StatCard
            title="Total Guests"
            value={stats.totalGuests}
            icon={<FaUsers />}
            color="info"
            link="/guests"
          />
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={<FaMoneyBillWave />}
            color="warning"
            link="/reports"
          />
        </Col>
      </Row>

      {/* Recent Bookings */}
      <Row>
        <Col>
          <Card className="dashboard-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Bookings</h5>
              <Button as={Link} to="/bookings" variant="outline-primary" size="sm">
                View All
              </Button>
            </Card.Header>
            <Card.Body>
              {recentBookings.length > 0 ? (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Apartment</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(recentBookings) && recentBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <div>
                            <strong>{booking.guest?.name}</strong>
                            <br />
                            <small className="text-muted">{booking.guest?.phone}</small>
                          </div>
                        </td>
                        <td>
                          {booking.apartment?.name}
                          {booking.floor && ` - ${booking.floor}`}
                        </td>
                        <td>{moment(booking.from_datetime).format('MMM DD, YYYY')}</td>
                        <td>{moment(booking.to_datetime).format('MMM DD, YYYY')}</td>
                        <td>{getStatusBadge(booking.booking_status)}</td>
                        <td>${booking.grand_total}</td>
                        <td>
                          <Button
                            as={Link}
                            to={`/bookings/edit/${booking.id}`}
                            variant="outline-primary"
                            size="sm"
                          >
                            <FaEye /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">No recent bookings found</p>
                  <Button as={Link} to="/bookings/new" variant="primary">
                    Create First Booking
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mt-4">
        <Col>
          <Card className="dashboard-card">
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} sm={6} className="mb-3">
                  <Button as={Link} to="/bookings/new" variant="primary" className="w-100">
                    <FaPlus /> New Booking
                  </Button>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <Button as={Link} to="/guests/new" variant="outline-primary" className="w-100">
                    <FaUsers /> Add Guest
                  </Button>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <Button as={Link} to="/reports" variant="outline-info" className="w-100">
                    <FaChartBar /> View Reports
                  </Button>
                </Col>
                <Col md={3} sm={6} className="mb-3">
                  <Button as={Link} to="/bookings" variant="outline-secondary" className="w-100">
                    <FaCalendarAlt /> All Bookings
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
