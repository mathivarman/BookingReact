import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Spinner
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaSave, FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaBuilding, FaMapMarkerAlt } from 'react-icons/fa';
import axios from 'axios';

const GuestForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    guest_type: 'local',
    place_or_country: '',
    introduced: 'no',
    introduced_by: ''
  });

  const fetchGuest = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/guests/${id}`);
      setFormData(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching guest:', err);
      setError('Failed to load guest information');
      toast.error('Failed to load guest information');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditing) {
      fetchGuest();
    }
  }, [fetchGuest]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) {
      errors.push('Name is required');
    }

    if (!formData.phone.trim()) {
      errors.push('Phone number is required');
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      errors.push('Please enter a valid 10-digit phone number');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (formData.guest_type === 'local' && !formData.place_or_country.trim()) {
      errors.push('Place/District is required for local guests');
    }

    if (formData.guest_type === 'foreign' && !formData.place_or_country.trim()) {
      errors.push('Country is required for foreign guests');
    }

    if (formData.introduced === 'yes' && !formData.introduced_by.trim()) {
      errors.push('Introduced By is required when Introduced is Yes');
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
      setSaving(true);
      setError('');

      const guestData = {
        ...formData,
        phone: formData.phone.replace(/\D/g, '') // Remove non-digits
      };

      if (isEditing) {
        await axios.put(`/api/guests/${id}`, guestData);
        toast.success('Guest updated successfully');
      } else {
        await axios.post('/api/guests', guestData);
        toast.success('Guest created successfully');
      }

      navigate('/guests');
    } catch (err) {
      console.error('Error saving guest:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save guest';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({
      ...prev,
      phone: formatted
    }));
  };

  if (loading) {
    return (
      <Container className="mt-4">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading guest information...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center gap-3">
            <Button 
              variant="outline-secondary" 
              onClick={() => navigate('/guests')}
              className="d-flex align-items-center gap-2"
            >
              <FaArrowLeft /> Back to Guests
            </Button>
            <div>
              <h2>{isEditing ? 'Edit Guest' : 'Add New Guest'}</h2>
              <p className="text-muted">
                {isEditing ? 'Update guest information' : 'Create a new guest record'}
              </p>
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              {/* Personal Information */}
              <Col md={6}>
                <h5 className="mb-3">
                  <FaUser className="me-2" />
                  Personal Information
                </h5>
                
                <Form.Group className="mb-3">
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaEnvelope className="me-2" />
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address (optional)"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaPhone className="me-2" />
                    Phone Number *
                  </Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaMapMarkerAlt className="me-2" />
                    Address
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter address (optional)"
                  />
                </Form.Group>
              </Col>

              {/* Guest Details */}
              <Col md={6}>
                <h5 className="mb-3">
                  <FaUser className="me-2" />
                  Guest Details
                </h5>

                <Form.Group className="mb-3">
                  <Form.Label>Guest Type *</Form.Label>
                  <Form.Select
                    name="guest_type"
                    value={formData.guest_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="local">Local</option>
                    <option value="foreign">Foreign</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    {formData.guest_type === 'local' ? 'Place/District' : 'Country'} *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="place_or_country"
                    value={formData.place_or_country}
                    onChange={handleInputChange}
                    placeholder={formData.guest_type === 'local' ? 'Enter place/district' : 'Enter country'}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Introduced</Form.Label>
                  <Form.Select
                    name="introduced"
                    value={formData.introduced}
                    onChange={handleInputChange}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Form.Select>
                </Form.Group>

                {formData.introduced === 'yes' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Introduced By *</Form.Label>
                    <Form.Control
                      type="text"
                      name="introduced_by"
                      value={formData.introduced_by}
                      onChange={handleInputChange}
                      placeholder="Enter name/contact of introducer"
                      required
                    />
                  </Form.Group>
                )}
              </Col>
            </Row>

            <hr />

            <div className="d-flex justify-content-end gap-2">
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/guests')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={saving}
                className="d-flex align-items-center gap-2"
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave />
                    {isEditing ? 'Update Guest' : 'Create Guest'}
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default GuestForm;
