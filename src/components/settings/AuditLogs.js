import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Form, 
  Alert,
  Spinner,
  Badge,
  InputGroup
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { FaSearch, FaDownload, FaEye, FaUser, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterTable, setFilterTable] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(null);

  const itemsPerPage = 20;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        action: filterAction !== 'all' ? filterAction : undefined,
        table_name: filterTable !== 'all' ? filterTable : undefined
      };

      const response = await axios.get('/api/audit-logs', { params });
      const logsData = response.data.logs;
      setLogs(Array.isArray(logsData) ? logsData : []);
      setTotalPages(Math.ceil(response.data.total / itemsPerPage));
      setError('');
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit logs');
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterAction, filterTable]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const exportLogs = async () => {
    try {
      const response = await axios.get('/api/audit-logs/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Audit logs exported successfully');
    } catch (err) {
      console.error('Error exporting logs:', err);
      toast.error('Failed to export audit logs');
    }
  };

  const getActionBadge = (action) => {
    const variants = {
      CREATE: 'success',
      UPDATE: 'primary',
      DELETE: 'danger',
      LOGIN: 'info',
      LOGOUT: 'secondary'
    };
    return <Badge bg={variants[action] || 'secondary'}>{action}</Badge>;
  };

  const getTableBadge = (tableName) => {
    const variants = {
      users: 'primary',
      bookings: 'success',
      guests: 'info',
      apartments: 'warning',
      pricing_rules: 'danger'
    };
    return <Badge bg={variants[tableName] || 'secondary'}>{tableName}</Badge>;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const parseChanges = (changes) => {
    if (!changes) return null;
    try {
      return JSON.parse(changes);
    } catch {
      return null;
    }
  };

  const renderChanges = (changes) => {
    const parsed = parseChanges(changes);
    if (!parsed) return <span className="text-muted">No changes recorded</span>;

    return (
      <div className="small">
        {Object.entries(parsed).map(([field, values]) => (
          <div key={field} className="mb-1">
            <strong>{field}:</strong>
            <span className="text-muted ms-1">
              {values.old ? `"${values.old}"` : 'null'} → {values.new ? `"${values.new}"` : 'null'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <Container className="mt-4">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading audit logs...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row className="mb-4">
        <Col>
          <h2>Audit Logs</h2>
          <p className="text-muted">Track all system changes and user activities</p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="outline-primary" 
            onClick={exportLogs}
            className="d-flex align-items-center gap-2"
          >
            <FaDownload /> Export Logs
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
            <Col md={4}>
              <Form onSubmit={handleSearch}>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Search by description or user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="outline-secondary" type="submit">
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Form>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="all">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
              >
                <option value="all">All Tables</option>
                <option value="users">Users</option>
                <option value="bookings">Bookings</option>
                <option value="guests">Guests</option>
                <option value="apartments">Apartments</option>
                <option value="pricing_rules">Pricing Rules</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button 
                variant="outline-secondary" 
                onClick={fetchLogs}
                className="w-100"
              >
                Refresh
              </Button>
            </Col>
          </Row>

          <Table responsive hover>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Description</th>
                <th>IP Address</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(logs) && logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className="small">
                      <FaCalendarAlt className="text-muted me-1" />
                      {formatTimestamp(log.created_at)}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <FaUser className="text-muted" />
                      {log.user_name || 'System'}
                    </div>
                  </td>
                  <td>{getActionBadge(log.action)}</td>
                  <td>{getTableBadge(log.table_name)}</td>
                  <td>
                    <div className="text-truncate" style={{ maxWidth: '200px' }}>
                      {truncateText(log.description, 60)}
                    </div>
                  </td>
                  <td>
                    <code className="small">{log.ip_address || '-'}</code>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-info"
                      onClick={() => setShowDetails(showDetails === log.id ? null : log.id)}
                      title="View Details"
                    >
                      <FaEye />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {logs.length === 0 && !loading && (
            <div className="text-center py-4">
              <FaExclamationTriangle className="text-muted mb-3" size={48} />
              <p className="text-muted">No audit logs found</p>
            </div>
          )}

          {/* Details Expansion */}
          {Array.isArray(logs) && logs.map((log) => (
            showDetails === log.id && (
              <tr key={`details-${log.id}`}>
                <td colSpan="7">
                  <Card className="mt-2">
                    <Card.Body className="py-2">
                      <Row>
                        <Col md={6}>
                          <h6>Changes Made:</h6>
                          {renderChanges(log.changes)}
                        </Col>
                        <Col md={6}>
                          <h6>Additional Information:</h6>
                          <div className="small">
                            <div><strong>Record ID:</strong> {log.record_id || 'N/A'}</div>
                            <div><strong>User Agent:</strong> {truncateText(log.user_agent, 100)}</div>
                            {log.old_values && (
                              <div><strong>Previous Values:</strong> {truncateText(log.old_values, 100)}</div>
                            )}
                            {log.new_values && (
                              <div><strong>New Values:</strong> {truncateText(log.new_values, 100)}</div>
                            )}
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </td>
              </tr>
            )
          ))}

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <div className="d-flex gap-2">
                <Button
                  variant="outline-primary"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="d-flex align-items-center px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline-primary"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AuditLogs;
