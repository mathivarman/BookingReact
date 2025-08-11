const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total bookings
    const [totalBookingsResult] = await db.promise().query(
      'SELECT COUNT(*) as total FROM bookings'
    );
    const totalBookings = totalBookingsResult[0].total;

    // Get active bookings (confirmed, checked-in)
    const [activeBookingsResult] = await db.promise().query(
      'SELECT COUNT(*) as total FROM bookings WHERE booking_status IN ("confirmed", "checked-in")'
    );
    const activeBookings = activeBookingsResult[0].total;

    // Get total guests
    const [totalGuestsResult] = await db.promise().query(
      'SELECT COUNT(*) as total FROM guests'
    );
    const totalGuests = totalGuestsResult[0].total;

    // Get total revenue
    const [totalRevenueResult] = await db.promise().query(
      'SELECT SUM(grand_total) as total FROM bookings WHERE payment_status = "paid"'
    );
    const totalRevenue = totalRevenueResult[0].total || 0;

    // Get today's arrivals
    const [todayArrivalsResult] = await db.promise().query(
      'SELECT COUNT(*) as total FROM bookings WHERE DATE(from_datetime) = CURDATE() AND booking_status IN ("confirmed", "checked-in")'
    );
    const todayArrivals = todayArrivalsResult[0].total;

    // Get today's departures
    const [todayDeparturesResult] = await db.promise().query(
      'SELECT COUNT(*) as total FROM bookings WHERE DATE(to_datetime) = CURDATE() AND booking_status IN ("confirmed", "checked-in", "checked-out")'
    );
    const todayDepartures = todayDeparturesResult[0].total;

    // Get pending payments
    const [pendingPaymentsResult] = await db.promise().query(
      'SELECT COUNT(*) as total FROM bookings WHERE payment_status IN ("pending", "partially_paid")'
    );
    const pendingPayments = pendingPaymentsResult[0].total;

    // Get occupancy rate
    const [occupancyResult] = await db.promise().query(
      `SELECT 
        COUNT(DISTINCT apartment_id) as occupied_apartments,
        (SELECT COUNT(*) FROM apartments WHERE is_active = 1) as total_apartments
       FROM bookings 
       WHERE booking_status IN ("confirmed", "checked-in")
       AND CURDATE() BETWEEN DATE(from_datetime) AND DATE(to_datetime)`
    );
    
    const occupiedApartments = occupancyResult[0].occupied_apartments;
    const totalApartments = occupancyResult[0].total_apartments;
    const occupancyRate = totalApartments > 0 ? (occupiedApartments / totalApartments) * 100 : 0;

    res.json({
      totalBookings,
      activeBookings,
      totalGuests,
      totalRevenue: parseFloat(totalRevenue),
      todayArrivals,
      todayDepartures,
      pendingPayments,
      occupancyRate: Math.round(occupancyRate * 100) / 100
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent bookings
    const [recentBookings] = await db.promise().query(
      `SELECT b.*, g.name as guest_name, a.name as apartment_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN apartments a ON b.apartment_id = a.id
       ORDER BY b.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    // Get recent audit logs
    const [recentAuditLogs] = await db.promise().query(
      `SELECT al.*, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      recentBookings,
      recentAuditLogs
    });

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get monthly revenue chart data
router.get('/monthly-revenue', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const [monthlyRevenue] = await db.promise().query(
      `SELECT 
        MONTH(created_at) as month,
        SUM(grand_total) as revenue,
        COUNT(*) as bookings
       FROM bookings 
       WHERE YEAR(created_at) = ? AND payment_status = "paid"
       GROUP BY MONTH(created_at)
       ORDER BY month`,
      [year]
    );

    // Fill in missing months with zero values
    const monthlyData = [];
    for (let month = 1; month <= 12; month++) {
      const existingData = monthlyRevenue.find(item => item.month === month);
      monthlyData.push({
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'short' }),
        revenue: existingData ? parseFloat(existingData.revenue) : 0,
        bookings: existingData ? existingData.bookings : 0
      });
    }

    res.json(monthlyData);

  } catch (error) {
    console.error('Get monthly revenue error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get booking status distribution
router.get('/booking-status-distribution', async (req, res) => {
  try {
    const [statusDistribution] = await db.promise().query(
      `SELECT 
        booking_status,
        COUNT(*) as count
       FROM bookings 
       GROUP BY booking_status`
    );

    res.json(statusDistribution);

  } catch (error) {
    console.error('Get booking status distribution error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get guest type distribution
router.get('/guest-type-distribution', async (req, res) => {
  try {
    const [guestTypeDistribution] = await db.promise().query(
      `SELECT 
        guest_type,
        COUNT(*) as count
       FROM guests 
       GROUP BY guest_type`
    );

    res.json(guestTypeDistribution);

  } catch (error) {
    console.error('Get guest type distribution error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get upcoming arrivals and departures
router.get('/upcoming-schedule', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // Get upcoming arrivals
    const [upcomingArrivals] = await db.promise().query(
      `SELECT b.*, g.name as guest_name, a.name as apartment_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN apartments a ON b.apartment_id = a.id
       WHERE DATE(b.from_datetime) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       AND b.booking_status IN ("confirmed", "checked-in")
       ORDER BY b.from_datetime`,
      [parseInt(days)]
    );

    // Get upcoming departures
    const [upcomingDepartures] = await db.promise().query(
      `SELECT b.*, g.name as guest_name, a.name as apartment_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN apartments a ON b.apartment_id = a.id
       WHERE DATE(b.to_datetime) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       AND b.booking_status IN ("confirmed", "checked-in", "checked-out")
       ORDER BY b.to_datetime`,
      [parseInt(days)]
    );

    res.json({
      arrivals: upcomingArrivals,
      departures: upcomingDepartures
    });

  } catch (error) {
    console.error('Get upcoming schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

