import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Button, 
  Form, 
  Alert,
  Spinner,
  Badge,
  Table
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { 
  FaDownload, 
  FaChartBar, 
  FaCalendarAlt, 
  FaDollarSign, 
  FaUsers, 
  FaBed,
  FaChartLine,
  FaPrint
} from 'react-icons/fa';
import axios from 'axios';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('revenue');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);

  const generateReport = useCallback(async () => {
    if (!startDate || !endDate) return;

    try {
      setLoading(true);
      setError('');

      const params = {
        type: reportType,
        start_date: startDate,
        end_date: endDate
      };

      const response = await axios.get('/api/reports', { params });
      setReportData(response.data);
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    // Set default date range
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      generateReport();
    }
  }, [generateReport]);

  const exportReport = async (format = 'pdf') => {
    try {
      const params = {
        type: reportType,
        start_date: startDate,
        end_date: endDate,
        format
      };

      const response = await axios.get('/api/reports/export', {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report-${startDate}-to-${endDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Error exporting report:', err);
      toast.error('Failed to export report');
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    let start, end;

    switch (range) {
      case 'today':
        start = end = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const renderRevenueReport = () => {
    if (!reportData) return null;

    return (
      <Row>
        <Col md={3}>
          <Card className="text-center mb-3">
            <Card.Body>
              <FaDollarSign className="text-success mb-2" size={24} />
              <h4>{formatCurrency(reportData.total_revenue || 0)}</h4>
              <p className="text-muted mb-0">Total Revenue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center mb-3">
            <Card.Body>
              <FaChartBar className="text-primary mb-2" size={24} />
              <h4>{formatCurrency(reportData.average_booking_value || 0)}</h4>
              <p className="text-muted mb-0">Avg Booking Value</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center mb-3">
            <Card.Body>
              <FaUsers className="text-info mb-2" size={24} />
              <h4>{reportData.total_bookings || 0}</h4>
              <p className="text-muted mb-0">Total Bookings</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center mb-3">
            <Card.Body>
              <FaChartLine className="text-warning mb-2" size={24} />
              <h4>{formatPercentage(reportData.revenue_growth || 0)}</h4>
              <p className="text-muted mb-0">Revenue Growth</p>
            </Card.Body>
          </Card>
        </Col>

        {reportData.daily_revenue && (
          <Col md={12}>
            <Card>
              <Card.Header>
                <h5>Daily Revenue Breakdown</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Bookings</th>
                      <th>Revenue</th>
                      <th>Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportData.daily_revenue) && reportData.daily_revenue.map((day, index) => (
                      <tr key={index}>
                        <td>{new Date(day.date).toLocaleDateString()}</td>
                        <td>{day.bookings}</td>
                        <td>{formatCurrency(day.revenue)}</td>
                        <td>{formatCurrency(day.average)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    );
  };

  const renderOccupancyReport = () => {
    if (!reportData) return null;

    return (
      <Row>
        <Col md={3}>
          <Card className="text-center mb-3">
            <Card.Body>
              <FaBed className="text-success mb-2" size={24} />
              <h4>{formatPercentage(reportData.occupancy_rate || 0)}</h4>
              <p className="text-muted mb-0">Occupancy Rate</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center mb-3">
            <Card.Body>
              <FaUsers className="text-primary mb-2" size={24} />
              <h4>{reportData.total_guests || 0}</h4>
              <p className="text-muted mb-0">Total Guests</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center mb-3">
            <Card.Body>
              <FaCalendarAlt className="text-info mb-2" size={24} />
              <h4>{reportData.available_nights || 0}</h4>
              <p className="text-muted mb-0">Available Nights</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center mb-3">
            <Card.Body>
              <FaChartBar className="text-warning mb-2" size={24} />
              <h4>{reportData.average_stay || 0} days</h4>
              <p className="text-muted mb-0">Average Stay</p>
            </Card.Body>
          </Card>
        </Col>

        {reportData.daily_occupancy && (
          <Col md={12}>
            <Card>
              <Card.Header>
                <h5>Daily Occupancy Breakdown</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Occupied</th>
                      <th>Available</th>
                      <th>Occupancy Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportData.daily_occupancy) && reportData.daily_occupancy.map((day, index) => (
                      <tr key={index}>
                        <td>{new Date(day.date).toLocaleDateString()}</td>
                        <td>{day.occupied}</td>
                        <td>{day.available}</td>
                        <td>{formatPercentage(day.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        )}
      </Row>
    );
  };

  const renderArrivalsDeparturesReport = () => {
    if (!reportData) return null;

    return (
      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Today's Arrivals</h5>
            </Card.Header>
            <Card.Body>
              {reportData.arrivals && reportData.arrivals.length > 0 ? (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Apartment</th>
                      <th>Check-in</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportData.arrivals) && reportData.arrivals.map((arrival, index) => (
                      <tr key={index}>
                        <td>{arrival.guest_name}</td>
                        <td>{arrival.apartment_number}</td>
                        <td>{new Date(arrival.check_in).toLocaleTimeString()}</td>
                        <td>
                          <Badge bg={arrival.status === 'checked_in' ? 'success' : 'warning'}>
                            {arrival.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted text-center">No arrivals today</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Today's Departures</h5>
            </Card.Header>
            <Card.Body>
              {reportData.departures && reportData.departures.length > 0 ? (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Apartment</th>
                      <th>Check-out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportData.departures) && reportData.departures.map((departure, index) => (
                      <tr key={index}>
                        <td>{departure.guest_name}</td>
                        <td>{departure.apartment_number}</td>
                        <td>{new Date(departure.check_out).toLocaleTimeString()}</td>
                        <td>
                          <Badge bg={departure.status === 'checked_out' ? 'success' : 'warning'}>
                            {departure.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted text-center">No departures today</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  const renderReportContent = () => {
    switch (reportType) {
      case 'revenue':
        return renderRevenueReport();
      case 'occupancy':
        return renderOccupancyReport();
      case 'arrivals-departures':
        return renderArrivalsDeparturesReport();
      default:
        return null;
    }
  };

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Reports & Analytics</h2>
          <p className="text-muted">Generate and view business reports and analytics</p>
        </Col>
        <Col xs="auto">
          <div className="d-flex gap-2">
            <Button 
              variant="outline-primary" 
              onClick={() => exportReport('pdf')}
              className="d-flex align-items-center gap-2"
            >
              <FaDownload /> Export PDF
            </Button>
            <Button 
              variant="outline-success" 
              onClick={() => exportReport('csv')}
              className="d-flex align-items-center gap-2"
            >
              <FaDownload /> Export CSV
            </Button>
            <Button 
              variant="outline-secondary" 
              onClick={() => window.print()}
              className="d-flex align-items-center gap-2"
            >
              <FaPrint /> Print
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Report Type</Form.Label>
                <Form.Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="revenue">Revenue Report</option>
                  <option value="occupancy">Occupancy Report</option>
                  <option value="arrivals-departures">Arrivals & Departures</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Quick Date Range</Form.Label>
                <Form.Select
                  value={dateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={dateRange !== 'custom'}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={dateRange !== 'custom'}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Generating report...</p>
        </div>
      ) : (
        renderReportContent()
      )}
    </Container>
  );
};

export default Reports;
