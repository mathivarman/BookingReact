import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Form, 
  InputGroup,
  Badge,
  Modal
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaEye,
  FaFilter
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,
    apartment: '',
    guestType: '',
    paymentStatus: '',
    bookingStatus: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [apartments, setApartments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);



  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        search: searchTerm,
        ...filters
      };

      // Remove null/empty values
      Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      const response = await axios.get('/api/bookings', { params });
      const bookingsData = response.data.bookings;
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters]);

  const fetchApartments = useCallback(async () => {
    try {
      const response = await axios.get('/api/apartments');
      const apartmentsData = response.data;
      setApartments(Array.isArray(apartmentsData) ? apartmentsData : (apartmentsData?.apartments || []));
    } catch (error) {
      console.error('Error fetching apartments:', error);
      setApartments([]);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchApartments();
  }, [fetchBookings, fetchApartments]);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/bookings/${selectedBooking.id}`);
      toast.success('Booking deleted successfully');
      setShowDeleteModal(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
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

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'warning', label: 'Pending' },
      'partially_paid': { variant: 'info', label: 'Partially Paid' },
      paid: { variant: 'success', label: 'Paid' }
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge bg={config.variant}>{config.label}</Badge>;
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: null,
      dateTo: null,
      apartment: '',
      guestType: '',
      paymentStatus: '',
      bookingStatus: ''
    });
  };

  const FilterSection = () => (
    <Card className="mb-3">
      <Card.Body>
        <Row>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Date From</Form.Label>
              <DatePicker
                selected={filters.dateFrom}
                onChange={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                className="form-control"
                placeholderText="Select date"
                dateFormat="MMM dd, yyyy"
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Date To</Form.Label>
              <DatePicker
                selected={filters.dateTo}
                onChange={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                className="form-control"
                placeholderText="Select date"
                dateFormat="MMM dd, yyyy"
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Apartment</Form.Label>
              <Form.Select
                value={filters.apartment}
                onChange={(e) => setFilters(prev => ({ ...prev, apartment: e.target.value }))}
              >
                <option value="">All Apartments</option>
                {Array.isArray(apartments) && apartments.map(apt => (
                  <option key={apt.id} value={apt.id}>{apt.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Guest Type</Form.Label>
              <Form.Select
                value={filters.guestType}
                onChange={(e) => setFilters(prev => ({ ...prev, guestType: e.target.value }))}
              >
                <option value="">All Types</option>
                <option value="local">Local</option>
                <option value="foreign">Foreign</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Payment Status</Form.Label>
              <Form.Select
                value={filters.paymentStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        <Row className="mt-3">
          <Col>
            <Button variant="outline-secondary" onClick={clearFilters} size="sm">
              Clear Filters
            </Button>
          </Col>
        </Row>
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
          <h2>Bookings</h2>
          <p className="text-muted">Manage all apartment bookings</p>
        </Col>
        <Col xs="auto">
          <Button as={Link} to="/bookings/new" variant="primary">
            <FaPlus /> New Booking
          </Button>
        </Col>
      </Row>

      {/* Search and Filters */}
      <Row className="mb-3">
        <Col md={8}>
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by guest name, phone, or booking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Button
            variant="outline-secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="w-100"
          >
            <FaFilter /> {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </Col>
      </Row>

      {showFilters && <FilterSection />}

      {/* Bookings Table */}
      <Card>
        <Card.Body>
          {bookings.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest</th>
                  <th>Apartment</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Days</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(bookings) && bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>#{booking.id}</strong>
                    </td>
                    <td>
                      <div>
                        <strong>{booking.guest?.name}</strong>
                        <br />
                        <small className="text-muted">{booking.guest?.phone}</small>
                        <br />
                        <small className="text-muted">{booking.guest?.guest_type}</small>
                      </div>
                    </td>
                    <td>
                      {booking.apartment?.name}
                      {booking.floor && ` - ${booking.floor}`}
                      {booking.unit_no && ` (${booking.unit_no})`}
                    </td>
                    <td>{moment(booking.from_datetime).format('MMM DD, YYYY')}</td>
                    <td>{moment(booking.to_datetime).format('MMM DD, YYYY')}</td>
                    <td>{booking.days}</td>
                    <td>${booking.grand_total}</td>
                    <td>{getStatusBadge(booking.booking_status)}</td>
                    <td>{getPaymentStatusBadge(booking.payment_status)}</td>
                    <td>
                      <div className="btn-group" role="group">
                        <Button
                          as={Link}
                          to={`/bookings/edit/${booking.id}`}
                          variant="outline-primary"
                          size="sm"
                        >
                          <FaEye />
                        </Button>
                        <Button
                          as={Link}
                          to={`/bookings/edit/${booking.id}`}
                          variant="outline-secondary"
                          size="sm"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowDeleteModal(true);
                          }}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5">
              <p className="text-muted">No bookings found</p>
              <Button as={Link} to="/bookings/new" variant="primary">
                Create First Booking
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Row className="mt-3">
          <Col>
            <div className="d-flex justify-content-center">
              <div className="btn-group">
                <Button
                  variant="outline-primary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Previous
                </Button>
                <Button variant="outline-primary" disabled>
                  Page {currentPage} of {totalPages}
                </Button>
                <Button
                  variant="outline-primary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete booking #{selectedBooking?.id} for {selectedBooking?.guest?.name}?
          This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BookingList;
