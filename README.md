# Apartment Booking System

A comprehensive apartment booking management system built with React frontend and Node.js backend with MySQL database.

## Features

- **User Authentication**: Secure login system with role-based access (Admin/Reception)
- **Booking Management**: Create, edit, and manage apartment bookings
- **Guest Management**: Store and manage guest information with detailed profiles
- **Apartment Management**: Manage apartment inventory and availability
- **Pricing Rules**: Flexible pricing system with seasonal rates and multipliers
- **Reports & Analytics**: Generate booking reports and occupancy analytics
- **Audit Logging**: Track all system changes and user activities
- **Email Notifications**: Send booking confirmations via email

## Tech Stack

### Frontend
- React.js
- React Bootstrap
- React Router
- Axios for API calls
- React DatePicker
- React Toastify

### Backend
- Node.js
- Express.js
- MySQL Database
- bcryptjs for password hashing
- JWT for authentication
- Nodemailer for email sending

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/mathivarman/BookingReact.git
   cd BookingReact
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

3. **Database Configuration**
   - Create a MySQL database
   - Copy `.env.example` to `.env` and update the database credentials:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=apartment_booking
     DB_PORT=3306
     ```

4. **Database Setup**
   ```bash
   npm run setup-db
   ```

5. **Start Backend Server**
   ```bash
   npm start
   ```

6. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

## Default Login Credentials

### Admin User
- **Email**: admin@example.com
- **Password**: password123

### Reception User
- **Email**: reception@example.com
- **Password**: password123

## Project Structure

```
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── guests.js
│   │   ├── apartments.js
│   │   ├── pricing.js
│   │   ├── reports.js
│   │   ├── audit.js
│   │   └── users.js
│   ├── services/
│   │   ├── auditService.js
│   │   └── emailService.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validation.js
│   ├── server.js
│   └── setup-database-simple.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── bookings/
│   │   │   ├── guests/
│   │   │   ├── dashboard/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── layout/
│   │   ├── context/
│   │   ├── utils/
│   │   └── App.js
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking

### Guests
- `GET /api/guests` - Get all guests
- `POST /api/guests` - Create new guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest

### Apartments
- `GET /api/apartments` - Get all apartments
- `POST /api/apartments` - Create new apartment
- `PUT /api/apartments/:id` - Update apartment
- `DELETE /api/apartments/:id` - Delete apartment

### Reports
- `GET /api/reports/booking-summary` - Get booking summary
- `GET /api/reports/occupancy` - Get occupancy reports
- `GET /api/reports/revenue` - Get revenue reports

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@example.com or create an issue in the GitHub repository.

