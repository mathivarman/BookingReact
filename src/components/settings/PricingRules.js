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
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaDollarSign, FaPercent } from 'react-icons/fa';
import axios from 'axios';

const PricingRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'seasonal',
    start_date: '',
    end_date: '',
    base_rate: '',
    multiplier: '1.0',
    min_duration: '',
    max_duration: '',
    discount_percent: '0',
    is_active: true
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/pricing-rules');
      const rulesData = response.data;
      setRules(Array.isArray(rulesData) ? rulesData : []);
      setError('');
    } catch (err) {
      console.error('Error fetching pricing rules:', err);
      setError('Failed to load pricing rules');
      toast.error('Failed to load pricing rules');
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

    if (!formData.name.trim()) {
      errors.push('Rule name is required');
    }

    if (!formData.base_rate || parseFloat(formData.base_rate) <= 0) {
      errors.push('Base rate must be greater than 0');
    }

    if (formData.type === 'seasonal') {
      if (!formData.start_date) {
        errors.push('Start date is required for seasonal rules');
      }
      if (!formData.end_date) {
        errors.push('End date is required for seasonal rules');
      }
      if (formData.start_date && formData.end_date && formData.start_date >= formData.end_date) {
        errors.push('End date must be after start date');
      }
    }

    if (formData.type === 'duration') {
      if (!formData.min_duration || parseInt(formData.min_duration) < 1) {
        errors.push('Minimum duration must be at least 1 day');
      }
      if (!formData.max_duration || parseInt(formData.max_duration) < parseInt(formData.min_duration)) {
        errors.push('Maximum duration must be greater than minimum duration');
      }
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
      const ruleData = {
        ...formData,
        base_rate: parseFloat(formData.base_rate),
        multiplier: parseFloat(formData.multiplier),
        discount_percent: parseFloat(formData.discount_percent),
        min_duration: formData.min_duration ? parseInt(formData.min_duration) : null,
        max_duration: formData.max_duration ? parseInt(formData.max_duration) : null
      };

      if (editingRule) {
        await axios.put(`/api/pricing-rules/${editingRule.id}`, ruleData);
        toast.success('Pricing rule updated successfully');
      } else {
        await axios.post('/api/pricing-rules', ruleData);
        toast.success('Pricing rule created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchRules();
    } catch (err) {
      console.error('Error saving pricing rule:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save pricing rule';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name || '',
      type: rule.type || 'seasonal',
      start_date: rule.start_date ? rule.start_date.split('T')[0] : '',
      end_date: rule.end_date ? rule.end_date.split('T')[0] : '',
      base_rate: rule.base_rate ? rule.base_rate.toString() : '',
      multiplier: rule.multiplier ? rule.multiplier.toString() : '1.0',
      min_duration: rule.min_duration ? rule.min_duration.toString() : '',
      max_duration: rule.max_duration ? rule.max_duration.toString() : '',
      discount_percent: rule.discount_percent ? rule.discount_percent.toString() : '0',
      is_active: rule.is_active !== undefined ? rule.is_active : true
    });
    setShowModal(true);
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this pricing rule?')) {
      return;
    }

    try {
      await axios.delete(`/api/pricing-rules/${ruleId}`);
      toast.success('Pricing rule deleted successfully');
      fetchRules();
    } catch (err) {
      console.error('Error deleting pricing rule:', err);
      toast.error('Failed to delete pricing rule');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'seasonal',
      start_date: '',
      end_date: '',
      base_rate: '',
      multiplier: '1.0',
      min_duration: '',
      max_duration: '',
      discount_percent: '0',
      is_active: true
    });
    setEditingRule(null);
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

  const getTypeBadge = (type) => {
    const variants = {
      seasonal: 'primary',
      duration: 'success',
      special: 'warning'
    };
    return <Badge bg={variants[type] || 'secondary'}>{type}</Badge>;
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
            <p className="mt-2">Loading pricing rules...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Pricing Rules</h2>
          <p className="text-muted">Manage dynamic pricing rules for different seasons and durations</p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="primary" 
            onClick={openModal}
            className="d-flex align-items-center gap-2"
          >
            <FaPlus /> Add Pricing Rule
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
                <th>Rule Name</th>
                <th>Type</th>
                <th>Base Rate</th>
                <th>Multiplier</th>
                <th>Discount</th>
                <th>Duration Range</th>
                <th>Season</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(rules) && rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <strong>{rule.name}</strong>
                  </td>
                  <td>{getTypeBadge(rule.type)}</td>
                  <td>
                    <FaDollarSign className="text-muted me-1" />
                    {rule.base_rate}
                  </td>
                  <td>
                    <FaPercent className="text-muted me-1" />
                    {((rule.multiplier - 1) * 100).toFixed(0)}%
                  </td>
                  <td>
                    {rule.discount_percent > 0 && (
                      <>
                        <FaPercent className="text-muted me-1" />
                        {rule.discount_percent}%
                      </>
                    )}
                    {rule.discount_percent === 0 && '-'}
                  </td>
                  <td>
                    {rule.type === 'duration' ? (
                      `${rule.min_duration}-${rule.max_duration} days`
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {rule.type === 'seasonal' ? (
                      <div>
                        <div className="small">
                          <FaCalendarAlt className="text-muted me-1" />
                          {new Date(rule.start_date).toLocaleDateString()} - {new Date(rule.end_date).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{getStatusBadge(rule.is_active)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleEdit(rule)}
                        title="Edit Rule"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(rule.id)}
                        title="Delete Rule"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {rules.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted">No pricing rules found</p>
              <Button variant="primary" onClick={openModal}>
                Add First Pricing Rule
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Pricing Rule Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingRule ? 'Edit Pricing Rule' : 'Add New Pricing Rule'}
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
                  <Form.Label>Rule Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter rule name"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Rule Type *</Form.Label>
                  <Form.Select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="seasonal">Seasonal Pricing</option>
                    <option value="duration">Duration-based</option>
                    <option value="special">Special Rate</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Base Rate ($) *</Form.Label>
                  <Form.Control
                    type="number"
                    name="base_rate"
                    value={formData.base_rate}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price Multiplier</Form.Label>
                  <Form.Control
                    type="number"
                    name="multiplier"
                    value={formData.multiplier}
                    onChange={handleInputChange}
                    placeholder="1.0"
                    step="0.1"
                    min="0.1"
                  />
                  <Form.Text className="text-muted">
                    Multiplier applied to base rate (e.g., 1.5 = 50% increase)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {formData.type === 'seasonal' && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            {formData.type === 'duration' && (
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Minimum Duration (days) *</Form.Label>
                    <Form.Control
                      type="number"
                      name="min_duration"
                      value={formData.min_duration}
                      onChange={handleInputChange}
                      placeholder="1"
                      min="1"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Maximum Duration (days) *</Form.Label>
                    <Form.Control
                      type="number"
                      name="max_duration"
                      value={formData.max_duration}
                      onChange={handleInputChange}
                      placeholder="30"
                      min="1"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount Percentage</Form.Label>
                  <Form.Control
                    type="number"
                    name="discount_percent"
                    value={formData.discount_percent}
                    onChange={handleInputChange}
                    placeholder="0"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <Form.Text className="text-muted">
                    Additional discount percentage (0-100%)
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    label="Active"
                  />
                  <Form.Text className="text-muted">
                    Only active rules are applied to bookings
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
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PricingRules;
