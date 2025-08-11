const nodemailer = require('nodemailer');
const db = require('../config/database');
const moment = require('moment');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send booking confirmation email
const sendBookingEmail = async (bookingId) => {
  try {
    // Get booking details with guest and apartment info
    const [bookings] = await db.promise().query(
      `SELECT b.*, 
              g.name as guest_name, g.email as guest_email, g.phone as guest_phone,
              a.name as apartment_name, a.floor as apartment_floor, a.unit as apartment_unit,
              u.name as booked_by_name
       FROM bookings b
       LEFT JOIN guests g ON b.guest_id = g.id
       LEFT JOIN apartments a ON b.apartment_id = a.id
       LEFT JOIN users u ON b.booking_by_user = u.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = bookings[0];

    if (!booking.guest_email) {
      throw new Error('Guest email not available');
    }

    // Check if email was already sent
    if (booking.email_sent) {
      throw new Error('Confirmation email already sent');
    }

    // Create email content
    const emailContent = createEmailContent(booking);

    // Send email
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: booking.guest_email,
      bcc: process.env.EMAIL_FROM, // BCC to reception
      subject: `Booking Confirmation - ${booking.apartment_name}`,
      html: emailContent.html,
      text: emailContent.text
    };

    await transporter.sendMail(mailOptions);

    // Update booking to mark email as sent
    await db.promise().query(
      'UPDATE bookings SET email_sent = 1 WHERE id = ?',
      [bookingId]
    );

    console.log(`Confirmation email sent for booking ${bookingId}`);

  } catch (error) {
    console.error('Send booking email error:', error);
    throw error;
  }
};

// Create email content
const createEmailContent = (booking) => {
  const checkInDate = moment(booking.from_datetime).format('MMMM DD, YYYY');
  const checkOutDate = moment(booking.to_datetime).format('MMMM DD, YYYY');
  const checkInTime = moment(booking.from_datetime).format('HH:mm');
  const checkOutTime = moment(booking.to_datetime).format('HH:mm');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .payment-details { background: #e8f4fd; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        .highlight { color: #667eea; font-weight: bold; }
        .total { font-size: 18px; font-weight: bold; color: #28a745; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmation</h1>
          <p>Thank you for choosing our apartment!</p>
        </div>
        
        <div class="content">
          <p>Dear <span class="highlight">${booking.guest_name}</span>,</p>
          
          <p>Your booking has been confirmed. Here are the details:</p>
          
          <div class="booking-details">
            <h3>Booking Information</h3>
            <p><strong>Booking ID:</strong> #${booking.id}</p>
            <p><strong>Apartment:</strong> ${booking.apartment_name}</p>
            <p><strong>Floor:</strong> ${booking.apartment_floor || 'Not specified'}</p>
            <p><strong>Unit:</strong> ${booking.apartment_unit || 'Not specified'}</p>
            <p><strong>Check-in:</strong> ${checkInDate} at ${checkInTime}</p>
            <p><strong>Check-out:</strong> ${checkOutDate} at ${checkOutTime}</p>
            <p><strong>Duration:</strong> ${booking.days} day(s)</p>
            <p><strong>Status:</strong> <span class="highlight">${booking.booking_status.toUpperCase()}</span></p>
          </div>
          
          <div class="payment-details">
            <h3>Payment Summary</h3>
            <p><strong>Base Rate:</strong> $${booking.base_rate} per day</p>
            <p><strong>Season Multiplier:</strong> ${booking.multiplier}x</p>
            <p><strong>Subtotal:</strong> $${booking.subtotal}</p>
            <p><strong>Discount:</strong> $${booking.discount}</p>
            <p><strong>Tax:</strong> $${booking.tax}</p>
            <p class="total"><strong>Total Amount:</strong> $${booking.grand_total}</p>
            <p><strong>Amount Paid:</strong> $${booking.amount_paid}</p>
            <p><strong>Balance:</strong> $${booking.grand_total - booking.amount_paid}</p>
            <p><strong>Payment Status:</strong> <span class="highlight">${booking.payment_status.replace('_', ' ').toUpperCase()}</span></p>
          </div>
          
          <p><strong>Important Notes:</strong></p>
          <ul>
            <li>Please arrive at the specified check-in time</li>
            <li>Bring a valid ID for check-in</li>
            <li>Early check-in or late check-out may be available upon request</li>
            <li>Contact us if you need to modify your booking</li>
          </ul>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          <strong>Apartment Booking Team</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>Booking ID: #${booking.id} | Confirmed on ${moment().format('MMMM DD, YYYY')}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Booking Confirmation

Dear ${booking.guest_name},

Your booking has been confirmed. Here are the details:

BOOKING INFORMATION:
- Booking ID: #${booking.id}
- Apartment: ${booking.apartment_name}
- Floor: ${booking.apartment_floor || 'Not specified'}
- Unit: ${booking.apartment_unit || 'Not specified'}
- Check-in: ${checkInDate} at ${checkInTime}
- Check-out: ${checkOutDate} at ${checkOutTime}
- Duration: ${booking.days} day(s)
- Status: ${booking.booking_status.toUpperCase()}

PAYMENT SUMMARY:
- Base Rate: $${booking.base_rate} per day
- Season Multiplier: ${booking.multiplier}x
- Subtotal: $${booking.subtotal}
- Discount: $${booking.discount}
- Tax: $${booking.tax}
- Total Amount: $${booking.grand_total}
- Amount Paid: $${booking.amount_paid}
- Balance: $${booking.grand_total - booking.amount_paid}
- Payment Status: ${booking.payment_status.replace('_', ' ').toUpperCase()}

IMPORTANT NOTES:
- Please arrive at the specified check-in time
- Bring a valid ID for check-in
- Early check-in or late check-out may be available upon request
- Contact us if you need to modify your booking

If you have any questions, please don't hesitate to contact us.

Best regards,
Apartment Booking Team

---
This is an automated email. Please do not reply to this message.
Booking ID: #${booking.id} | Confirmed on ${moment().format('MMMM DD, YYYY')}
  `;

  return { html, text };
};

// Send test email
const sendTestEmail = async (toEmail) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'Test Email - Apartment Booking System',
      html: '<h1>Test Email</h1><p>This is a test email from the Apartment Booking System.</p>',
      text: 'Test Email\n\nThis is a test email from the Apartment Booking System.'
    };

    await transporter.sendMail(mailOptions);
    console.log('Test email sent successfully');

  } catch (error) {
    console.error('Send test email error:', error);
    throw error;
  }
};

// Get email configuration status
const getEmailConfigStatus = () => {
  const requiredEnvVars = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  return {
    configured: missingVars.length === 0,
    missingVars,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    from: process.env.EMAIL_FROM
  };
};

module.exports = {
  sendBookingEmail,
  sendTestEmail,
  getEmailConfigStatus
};

