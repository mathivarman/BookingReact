import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Form, 
  Modal,
  Alert,
  Spinner,
  Badge
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaUser, FaEnvelope, FaShieldAlt, FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'admin',
    is_active: true,
    password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users');
      const usersData = response.data;
      setUsers(Array.isArray(usersData) ? usersData : []);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.first_name.trim()) {
      errors.push('First name is required');
    }

    if (!formData.last_name.trim()) {
      errors.push('Last name is required');
    }

    if (!formData.email.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!editingUser && !formData.password) {
      errors.push('Password is required for new users');
    }

    if (formData.password && formData.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (formData.password && formData.password !== formData.confirm_password) {
      errors.push('Passwords do not match');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    try {
      setError('');
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active
      };

      if (formData.password) {
        userData.password = formData.password;
      }

      if (editingUser) {
        await axios.put(`/api/users/${editingUser.id}`, userData);
        toast.success('User updated successfully');
      } else {
        await axios.post('/api/users', userData);
        toast.success('User created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save user';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      password: '',
      confirm_password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await axios.put(`/api/users/${user.id}`, {
        ...user,
        is_active: !user.is_active
      });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error('Failed to update user status');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      role: 'admin',
      is_active: true,
      password: '',
      confirm_password: ''
    });
    setEditingUser(null);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setError('');
  };

  const getRoleBadge = (role) => {
    const variants = {
      super_admin: 'danger',
      admin: 'primary',
      receptionist: 'success'
    };
    return <Badge bg={variants[role] || 'secondary'}>{role.replace('_', ' ')}</Badge>;
  };

  const getStatusBadge = (isActive) => {
    return <Badge bg={isActive ? 'success' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading users...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>User Management</h2>
          <p className="text-muted">Manage system users and their permissions</p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            onClick={openModal}
            className="d-flex align-items-center gap-2"
          >
            <FaPlus /> Add User
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
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) && users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <FaUser className="text-muted" />
                      <strong>{user.first_name} {user.last_name}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <FaEnvelope className="text-muted" />
                      {user.email}
                    </div>
                  </td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>{getStatusBadge(user.is_active)}</td>
                  <td>
                    {user.last_login ? (
                      <div className="small">
                        <FaCalendarAlt className="text-muted me-1" />
                        {new Date(user.last_login).toLocaleDateString()}
                      </div>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td>
                    <div className="small">
                      <FaCalendarAlt className="text-muted me-1" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleEdit(user)}
                        title="Edit User"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_active ? "outline-warning" : "outline-success"}
                        onClick={() => handleToggleStatus(user)}
                        title={user.is_active ? "Deactivate User" : "Activate User"}
                      >
                        <FaShieldAlt />
                      </Button>
                      {user.role !== 'super_admin' && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(user.id)}
                          title="Delete User"
                        >
                          <FaTrash />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted">No users found</p>
              <Button variant="primary" onClick={openModal}>
                Add First User
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* User Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingUser ? 'Edit User' : 'Add New User'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Role *</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="receptionist">Receptionist</option>
                    {!editingUser && <option value="super_admin">Super Admin</option>}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {!editingUser && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Password *</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                      minLength="6"
                    />
                    <Form.Text className="text-muted">
                      Minimum 6 characters
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password *</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      placeholder="Confirm password"
                      minLength="6"
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {editingUser && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Leave blank to keep current password"
                      minLength="6"
                    />
                    <Form.Text className="text-muted">
                      Leave blank to keep current password
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm New Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      placeholder="Confirm new password"
                      minLength="6"
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    label="Active User"
                  />
                  <Form.Text className="text-muted">
                    Inactive users cannot log into the system
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default UserManagement;
