import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert,
  Modal
} from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaSave, FaTimes, FaEnvelope } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const BookingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  const [formData, setFormData] = useState({
    // Guest Details
    guest_id: '',
    guest_name: '',
    guest_address: '',
    guest_phone: '',
    guest_email: '',
    guest_type: 'local',
    place_or_country: '',
    introduced: 'no',
    introduced_by: '',

    // Stay Details
    apartment_id: '',
    floor: '',
    unit_no: '',
    from_datetime: null,
    to_datetime: null,
    days: 0,
    season: 'regular',

    // Pricing
    base_rate: 0,
    multiplier: 1,
    subtotal: 0,
    discount: 0,
    tax: 0,
    grand_total: 0,

    // Payment
    payment_type: 'full',
    amount_paid: 0,
    payment_status: 'pending',
    payment_method: 'cash',

    // Status
    booking_status: 'draft'
  });

  const [apartments, setApartments] = useState([]);
  const [guests, setGuests] = useState([]);
  const [pricingRules, setPricingRules] = useState({});
  const [existingGuest, setExistingGuest] = useState(null);

  const calculatePricing = useCallback(() => {
    if (!formData.days || !pricingRules) return;

    let baseRate = 0;
    if (formData.days <= 3) {
      baseRate = pricingRules.rate_1_3 || 0;
    } else if (formData.days <= 6) {
      baseRate = pricingRules.rate_4_6 || 0;
    } else {
      baseRate = pricingRules.rate_7_plus || 0;
    }

    const multiplier = pricingRules[`season_${formData.season}`] || 1;
    const subtotal = (baseRate * formData.days * multiplier) - formData.discount;
    const tax = (subtotal * (pricingRules.tax_percent || 0)) / 100;
    const grandTotal = subtotal + tax;

    setFormData(prev => ({
      ...prev,
      base_rate: baseRate,
      multiplier: multiplier,
      subtotal: subtotal,
      tax: tax,
      grand_total: grandTotal
    }));
  }, [formData.days, formData.season, formData.discount, pricingRules]);

  useEffect(() => {
    fetchInitialData();
    if (isEditing) {
      fetchBooking();
    }
  }, [id, isEditing]);

  useEffect(() => {
    calculatePricing();
  }, [calculatePricing]);

  const fetchInitialData = async () => {
    try {
      const [apartmentsRes, guestsRes, pricingRes] = await Promise.all([
        axios.get('/api/apartments'),
        axios.get('/api/guests'),
        axios.get('/api/pricing-rules/current')
      ]);

      // Ensure apartments is always an array
      const apartmentsData = apartmentsRes.data;
      setApartments(Array.isArray(apartmentsData) ? apartmentsData : (apartmentsData?.apartments || []));
      // Ensure guests is always an array
      const guestsData = guestsRes.data;
      setGuests(Array.isArray(guestsData) ? guestsData : (guestsData?.guests || []));
      setPricingRules(pricingRes.data || {});
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load form data');
      // Set empty arrays on error to prevent map errors
      setApartments([]);
      setGuests([]);
      setPricingRules({});
    }
  };

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/bookings/${id}`);
      const booking = response.data;
      
      setFormData({
        guest_id: booking.guest_id || '',
        guest_name: booking.guest?.name || '',
        guest_address: booking.guest?.address || '',
        guest_phone: booking.guest?.phone || '',
        guest_email: booking.guest?.email || '',
        guest_type: booking.guest?.guest_type || 'local',
        place_or_country: booking.guest?.place_or_country || '',
        introduced: booking.guest?.introduced || 'no',
        introduced_by: booking.guest?.introduced_by || '',
        apartment_id: booking.apartment_id || '',
        floor: booking.floor || '',
        unit_no: booking.unit_no || '',
        from_datetime: booking.from_datetime ? new Date(booking.from_datetime) : null,
        to_datetime: booking.to_datetime ? new Date(booking.to_datetime) : null,
        days: booking.days || 0,
        season: booking.season || 'regular',
        base_rate: booking.base_rate || 0,
        multiplier: booking.multiplier || 1,
        subtotal: booking.subtotal || 0,
        discount: booking.discount || 0,
        tax: booking.tax || 0,
        grand_total: booking.grand_total || 0,
        payment_type: booking.payment_type || 'full',
        amount_paid: booking.amount_paid || 0,
        payment_status: booking.payment_status || 'pending',
        payment_method: booking.payment_method || 'cash',
        booking_status: booking.booking_status || 'draft'
      });
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    if (formData.from_datetime && formData.to_datetime) {
      const from = moment(formData.from_datetime);
      const to = moment(formData.to_datetime);
      const days = to.diff(from, 'days');
      setFormData(prev => ({ ...prev, days: Math.max(1, days) }));
    }
  };

  const handleGuestSelect = (guestId) => {
    if (!Array.isArray(guests)) return;
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
      setFormData(prev => ({
        ...prev,
        guest_id: guest.id,
        guest_name: guest.name,
        guest_address: guest.address || '',
        guest_phone: guest.phone,
        guest_email: guest.email || '',
        guest_type: guest.guest_type,
        place_or_country: guest.place_or_country || '',
        introduced: guest.introduced || 'no',
        introduced_by: guest.introduced_by || ''
      }));
      setExistingGuest(guest);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const bookingData = {
        ...formData,
        from_datetime: formData.from_datetime?.toISOString(),
        to_datetime: formData.to_datetime?.toISOString()
      };

      if (isEditing) {
        await axios.put(`/api/bookings/${id}`, bookingData);
        toast.success('Booking updated successfully');
      } else {
        await axios.post('/api/bookings', bookingData);
        toast.success('Booking created successfully');
      }

      navigate('/bookings');
    } catch (error) {
      console.error('Error saving booking:', error);
      setError(error.response?.data?.message || 'Failed to save booking');
      toast.error('Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  const sendConfirmationEmail = async () => {
    try {
      await axios.post(`/api/bookings/${id}/send-email`);
      toast.success('Confirmation email sent successfully');
      setShowEmailModal(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send confirmation email');
    }
  };

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
          <h2>{isEditing ? 'Edit Booking' : 'New Booking'}</h2>
          <p className="text-muted">
            {isEditing ? 'Update booking details' : 'Create a new apartment booking'}
          </p>
        </Col>
        <Col xs="auto">
          <Button as={Link} to="/bookings" variant="outline-secondary">
            <FaTimes /> Cancel
          </Button>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Row>
          {/* Guest Details */}
          <Col lg={6}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Guest Details</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Existing Guest</Form.Label>
                      <Form.Select
                        value={formData.guest_id}
                        onChange={(e) => handleGuestSelect(e.target.value)}
                      >
                        <option value="">Select existing guest</option>
                        {Array.isArray(guests) && guests.map(guest => (
                          <option key={guest.id} value={guest.id}>
                            {guest.name} - {guest.phone}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Guest Name *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.guest_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contact Number *</Form.Label>
                      <Form.Control
                        type="tel"
                        value={formData.guest_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, guest_phone: e.target.value }))}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={formData.guest_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, guest_email: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={formData.guest_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_address: e.target.value }))}
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Guest Type *</Form.Label>
                      <Form.Select
                        value={formData.guest_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, guest_type: e.target.value }))}
                        required
                      >
                        <option value="local">Local</option>
                        <option value="foreign">Foreign</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        {formData.guest_type === 'local' ? 'Place/District' : 'Country'}
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.place_or_country}
                        onChange={(e) => setFormData(prev => ({ ...prev, place_or_country: e.target.value }))}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Introduced</Form.Label>
                      <Form.Select
                        value={formData.introduced}
                        onChange={(e) => setFormData(prev => ({ ...prev, introduced: e.target.value }))}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  {formData.introduced === 'yes' && (
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Introduced By</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.introduced_by}
                          onChange={(e) => setFormData(prev => ({ ...prev, introduced_by: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                  )}
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* Stay Details */}
          <Col lg={6}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Stay Details</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Apartment *</Form.Label>
                      <Form.Select
                        value={formData.apartment_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, apartment_id: e.target.value }))}
                        required
                      >
                        <option value="">Select apartment</option>
                        {Array.isArray(apartments) && apartments.map(apt => (
                          <option key={apt.id} value={apt.id}>{apt.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Floor</Form.Label>
                      <Form.Select
                        value={formData.floor}
                        onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                      >
                        <option value="">Select floor</option>
                        <option value="ground">Ground</option>
                        <option value="first">First</option>
                        <option value="second">Second</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Unit Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.unit_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_no: e.target.value }))}
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Check-in Date & Time *</Form.Label>
                      <DatePicker
                        selected={formData.from_datetime}
                        onChange={(date) => setFormData(prev => ({ ...prev, from_datetime: date }))}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="MMM dd, yyyy HH:mm"
                        className="form-control"
                        placeholderText="Select date and time"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Check-out Date & Time *</Form.Label>
                      <DatePicker
                        selected={formData.to_datetime}
                        onChange={(date) => setFormData(prev => ({ ...prev, to_datetime: date }))}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="MMM dd, yyyy HH:mm"
                        className="form-control"
                        placeholderText="Select date and time"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Number of Days</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.days}
                        onChange={(e) => setFormData(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                        min="1"
                        onBlur={calculateDays}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Season</Form.Label>
                      <Form.Select
                        value={formData.season}
                        onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value }))}
                      >
                        <option value="regular">Regular</option>
                        <option value="peak">Peak</option>
                        <option value="offpeak">Off-Peak</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Pricing & Payment */}
        <Row>
          <Col lg={6}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Pricing Details</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Base Rate per Day</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.base_rate}
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Season Multiplier</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.multiplier}
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Subtotal</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.subtotal}
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Discount</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.discount}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tax</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.tax}
                        readOnly
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Grand Total</Form.Label>
                      <Form.Control
                        type="number"
                        value={formData.grand_total}
                        readOnly
                        className="bg-light fw-bold"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Payment Details</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Payment Type *</Form.Label>
                      <Form.Select
                        value={formData.payment_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_type: e.target.value }))}
                        required
                      >
                        <option value="full">Full Payment</option>
                        <option value="advance">Advance Payment</option>
                        <option value="other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Payment Method</Form.Label>
                      <Form.Select
                        value={formData.payment_method}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="online">Online Payment</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {(formData.payment_type === 'advance' || formData.payment_type === 'other') && (
                  <Form.Group className="mb-3">
                    <Form.Label>Amount Paid</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max={formData.grand_total}
                    />
                  </Form.Group>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>Payment Status</Form.Label>
                  <Form.Select
                    value={formData.payment_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Booking Status</Form.Label>
                  <Form.Select
                    value={formData.booking_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, booking_status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="tentative">Tentative</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked-in">Checked In</option>
                    <option value="checked-out">Checked Out</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Action Buttons */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                <FaSave /> {saving ? 'Saving...' : (isEditing ? 'Update Booking' : 'Create Booking')}
              </Button>
              
              {isEditing && formData.booking_status === 'confirmed' && formData.guest_email && (
                <Button
                  type="button"
                  variant="outline-info"
                  onClick={() => setShowEmailModal(true)}
                >
                  <FaEnvelope /> Send Confirmation Email
                </Button>
              )}
              
              <Button as={Link} to="/bookings" variant="outline-secondary">
                <FaTimes /> Cancel
              </Button>
            </div>
          </Col>
        </Row>
      </Form>

      {/* Email Confirmation Modal */}
      <Modal show={showEmailModal} onHide={() => setShowEmailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Send Confirmation Email</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Send booking confirmation email to:</p>
          <p><strong>{formData.guest_email}</strong></p>
          <p>This will include booking details and payment information.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={sendConfirmationEmail}>
            <FaEnvelope /> Send Email
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BookingForm;
