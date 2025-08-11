const express = require('express');
const { query } = require('express-validator');
const db = require('../config/database');
const router = express.Router();

// Get revenue report
router.get('/revenue', [
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate(),
  query('groupBy').optional().isIn(['day', 'month', 'year'])
], async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    let whereConditions = ['payment_status = "paid"'];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    let groupClause;
    let selectClause;

    switch (groupBy) {
      case 'day':
        groupClause = 'DATE(created_at)';
        selectClause = 'DATE(created_at) as period';
        break;
      case 'month':
        groupClause = 'YEAR(created_at), MONTH(created_at)';
        selectClause = 'DATE_FORMAT(created_at, "%Y-%m") as period';
        break;
      case 'year':
        groupClause = 'YEAR(created_at)';
        selectClause = 'YEAR(created_at) as period';
        break;
    }

    const [revenue] = await db.promise().query(
      `SELECT 
        ${selectClause},
        SUM(grand_total) as total_revenue,
        COUNT(*) as total_bookings,
        AVG(grand_total) as average_booking_value
       FROM bookings 
       ${whereClause}
       GROUP BY ${groupClause}
       ORDER BY period DESC`,
      params
    );

    // Calculate totals
    const totals = revenue.reduce((acc, row) => {
      acc.totalRevenue += parseFloat(row.total_revenue);
      acc.totalBookings += row.total_bookings;
      return acc;
    }, { totalRevenue: 0, totalBookings: 0 });

    res.json({
      revenue,
      totals,
      filters: { startDate, endDate, groupBy }
    });

  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get occupancy report
router.get('/occupancy', [
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate()
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get total apartments
    const [totalApartments] = await db.promise().query(
      'SELECT COUNT(*) as total FROM apartments WHERE is_active = 1'
    );

    const totalApts = totalApartments[0].total;

    // Get occupancy data
    let whereConditions = ['booking_status IN ("confirmed", "checked-in")'];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(from_datetime) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(to_datetime) <= ?');
      params.push(endDate);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const [occupancy] = await db.promise().query(
      `SELECT 
        DATE(from_datetime) as date,
        COUNT(DISTINCT apartment_id) as occupied_apartments,
        ROUND((COUNT(DISTINCT apartment_id) / ?) * 100, 2) as occupancy_rate
       FROM bookings 
       ${whereClause}
       GROUP BY DATE(from_datetime)
       ORDER BY date`,
      [totalApts, ...params]
    );

    // Calculate average occupancy
    const avgOccupancy = occupancy.length > 0 
      ? occupancy.reduce((sum, row) => sum + row.occupancy_rate, 0) / occupancy.length 
      : 0;

    res.json({
      occupancy,
      totalApartments: totalApts,
      averageOccupancy: Math.round(avgOccupancy * 100) / 100,
      filters: { startDate, endDate }
    });

  } catch (error) {
    console.error('Get occupancy report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get arrivals and departures report
router.get('/arrivals-departures', [
  query('date').optional().isDate()
], async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    // Get arrivals
    const [arrivals] = await db.promise().query(
      `SELECT b.*, g.name as guest_name, g.phone as guest_phone, a.name as apartment_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN apartments a ON b.apartment_id = a.id
       WHERE DATE(b.from_datetime) = ?
       AND b.booking_status IN ("confirmed", "checked-in")
       ORDER BY b.from_datetime`,
      [date]
    );

    // Get departures
    const [departures] = await db.promise().query(
      `SELECT b.*, g.name as guest_name, g.phone as guest_phone, a.name as apartment_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN apartments a ON b.apartment_id = a.id
       WHERE DATE(b.to_datetime) = ?
       AND b.booking_status IN ("confirmed", "checked-in", "checked-out")
       ORDER BY b.to_datetime`,
      [date]
    );

    res.json({
      date,
      arrivals,
      departures,
      summary: {
        totalArrivals: arrivals.length,
        totalDepartures: departures.length
      }
    });

  } catch (error) {
    console.error('Get arrivals-departures report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get outstanding balances report
router.get('/outstanding-balances', async (req, res) => {
  try {
    const [outstandingBalances] = await db.promise().query(
      `SELECT b.*, g.name as guest_name, g.phone as guest_phone, a.name as apartment_name,
              (b.grand_total - b.amount_paid) as outstanding_amount
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN apartments a ON b.apartment_id = a.id
       WHERE b.payment_status IN ("pending", "partially_paid")
       AND b.booking_status NOT IN ("cancelled")
       ORDER BY outstanding_amount DESC`
    );

    const totalOutstanding = outstandingBalances.reduce((sum, booking) => {
      return sum + parseFloat(booking.outstanding_amount);
    }, 0);

    res.json({
      outstandingBalances,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalBookings: outstandingBalances.length
    });

  } catch (error) {
    console.error('Get outstanding balances report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get guest statistics report
router.get('/guest-statistics', [
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate()
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereConditions = [];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(g.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(g.created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Guest type distribution
    const [guestTypeStats] = await db.promise().query(
      `SELECT 
        guest_type,
        COUNT(*) as count,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM guests ${whereClause})) * 100, 2) as percentage
       FROM guests 
       ${whereClause}
       GROUP BY guest_type`,
      params
    );

    // Top guests by bookings
    const [topGuests] = await db.promise().query(
      `SELECT 
        g.name,
        g.phone,
        g.guest_type,
        COUNT(b.id) as total_bookings,
        SUM(b.grand_total) as total_spent
       FROM guests g
       LEFT JOIN bookings b ON g.id = b.guest_id
       ${whereClause}
       GROUP BY g.id
       HAVING total_bookings > 0
       ORDER BY total_bookings DESC
       LIMIT 10`,
      params
    );

    // New guests per month
    const [newGuestsPerMonth] = await db.promise().query(
      `SELECT 
        DATE_FORMAT(created_at, "%Y-%m") as month,
        COUNT(*) as new_guests
       FROM guests 
       ${whereClause}
       GROUP BY DATE_FORMAT(created_at, "%Y-%m")
       ORDER BY month DESC
       LIMIT 12`,
      params
    );

    res.json({
      guestTypeStats,
      topGuests,
      newGuestsPerMonth,
      filters: { startDate, endDate }
    });

  } catch (error) {
    console.error('Get guest statistics report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get apartment performance report
router.get('/apartment-performance', [
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate()
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereConditions = ['b.booking_status NOT IN ("cancelled")'];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(b.from_datetime) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(b.to_datetime) <= ?');
      params.push(endDate);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const [apartmentPerformance] = await db.promise().query(
      `SELECT 
        a.name as apartment_name,
        a.floor,
        COUNT(b.id) as total_bookings,
        SUM(b.grand_total) as total_revenue,
        AVG(b.grand_total) as average_booking_value,
        SUM(b.days) as total_days_booked,
        ROUND((SUM(b.days) / (DATEDIFF(?, ?) + 1)) * 100, 2) as occupancy_rate
       FROM apartments a
       LEFT JOIN bookings b ON a.id = b.apartment_id AND ${whereConditions.join(' AND ')}
       WHERE a.is_active = 1
       GROUP BY a.id
       ORDER BY total_revenue DESC`,
      [...params, endDate || new Date().toISOString().split('T')[0], startDate || '2020-01-01']
    );

    res.json({
      apartmentPerformance,
      filters: { startDate, endDate }
    });

  } catch (error) {
    console.error('Get apartment performance report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get payment analytics report
router.get('/payment-analytics', [
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate()
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereConditions = [];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Payment method distribution
    const [paymentMethodStats] = await db.promise().query(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(grand_total) as total_amount,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM bookings ${whereClause})) * 100, 2) as percentage
       FROM bookings 
       ${whereClause}
       GROUP BY payment_method`,
      params
    );

    // Payment status distribution
    const [paymentStatusStats] = await db.promise().query(
      `SELECT 
        payment_status,
        COUNT(*) as count,
        SUM(grand_total) as total_amount,
        ROUND((COUNT(*) / (SELECT COUNT(*) FROM bookings ${whereClause})) * 100, 2) as percentage
       FROM bookings 
       ${whereClause}
       GROUP BY payment_status`,
      params
    );

    // Daily payment trends
    const [dailyPaymentTrends] = await db.promise().query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as bookings,
        SUM(grand_total) as total_revenue,
        AVG(grand_total) as average_booking_value
       FROM bookings 
       ${whereClause}
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`,
      params
    );

    res.json({
      paymentMethodStats,
      paymentStatusStats,
      dailyPaymentTrends,
      filters: { startDate, endDate }
    });

  } catch (error) {
    console.error('Get payment analytics report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

