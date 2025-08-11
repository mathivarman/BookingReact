import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Modal,
  Alert,
  Spinner,
  Pagination
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEye, FaPhone, FaEnvelope } from 'react-icons/fa';
import axios from 'axios';

const GuestList = () => {
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState(null);
  const [error, setError] = useState('');

  const itemsPerPage = 10;

  const fetchGuests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: filterStatus !== 'all' ? filterStatus : undefined
      };

      const response = await axios.get('/api/guests', { params });
      const guestsData = response.data.guests;
      setGuests(Array.isArray(guestsData) ? guestsData : []);
      setTotalPages(Math.ceil(response.data.total / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching guests:', err);
      setError('Failed to load guests. Please try again.');
      toast.error('Failed to load guests');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const handleDelete = async () => {
    if (!guestToDelete) return;

    try {
      await axios.delete(`/api/guests/${guestToDelete.id}`);
      toast.success('Guest deleted successfully');
      setShowDeleteModal(false);
      setGuestToDelete(null);
      fetchGuests();
    } catch (err) {
      console.error('Error deleting guest:', err);
      toast.error('Failed to delete guest');
    }
  };

  const confirmDelete = (guest) => {
    setGuestToDelete(guest);
    setShowDeleteModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'secondary',
      blocked: 'danger'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchGuests();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading && guests.length === 0) {
    return (
      <Container className="mt-4">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading guests...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Guest Management</h2>
          <p className="text-muted">Manage guest records and information</p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            onClick={() => navigate('/guests/new')}
            className="d-flex align-items-center gap-2"
          >
            <FaPlus /> Add New Guest
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Row className="mb-3">
            <Col md={6}>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="outline-secondary" type="submit">
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Form>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Button 
                variant="outline-secondary" 
                onClick={fetchGuests}
                className="w-100"
              >
                Refresh
              </Button>
            </Col>
          </Row>

          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Total Bookings</th>
                <th>Last Visit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(guests) && guests.map((guest) => (
                <tr key={guest.id}>
                  <td>
                    <div>
                      <strong>{guest.first_name} {guest.last_name}</strong>
                      {guest.company && (
                        <div className="text-muted small">{guest.company}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <FaEnvelope className="text-muted" />
                      {guest.email}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <FaPhone className="text-muted" />
                      {formatPhone(guest.phone)}
                    </div>
                  </td>
                  <td>{getStatusBadge(guest.status)}</td>
                  <td>
                    <Badge bg="info">{guest.total_bookings || 0}</Badge>
                  </td>
                  <td>
                    {guest.last_visit ? new Date(guest.last_visit).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => navigate(`/guests/edit/${guest.id}`)}
                        title="Edit Guest"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-info"
                        onClick={() => navigate(`/guests/${guest.id}`)}
                        title="View Details"
                      >
                        <FaEye />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => confirmDelete(guest)}
                        title="Delete Guest"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {guests.length === 0 && !loading && (
            <div className="text-center py-4">
              <p className="text-muted">No guests found</p>
              <Button 
                variant="primary" 
                onClick={() => navigate('/guests/new')}
              >
                Add First Guest
              </Button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.First 
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                />
                <Pagination.Prev 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                />
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <Pagination.Item
                      key={page}
                      active={page === currentPage}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Pagination.Item>
                  );
                })}
                
                <Pagination.Next 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                />
                <Pagination.Last 
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete guest{' '}
          <strong>{guestToDelete?.first_name} {guestToDelete?.last_name}</strong>?
          <br />
          <small className="text-muted">
            This action cannot be undone and will also remove all associated booking history.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Guest
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GuestList;
