-- Apartment Booking Admin System Database Schema
-- Created for React + Node.js + MySQL stack

-- Create database
CREATE DATABASE IF NOT EXISTS apartment_booking;
USE apartment_booking;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'super_admin') NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Apartments table
CREATE TABLE apartments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    floor ENUM('ground', 'first', 'second') NULL,
    unit VARCHAR(50) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Guests table
CREATE TABLE guests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address TEXT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NULL,
    guest_type ENUM('local', 'foreign') NOT NULL DEFAULT 'local',
    place_or_country VARCHAR(100) NULL,
    introduced ENUM('yes', 'no') NOT NULL DEFAULT 'no',
    introduced_by VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pricing rules table
CREATE TABLE pricing_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rate_1_3 DECIMAL(10,2) NOT NULL COMMENT 'Rate for 1-3 days',
    rate_4_6 DECIMAL(10,2) NOT NULL COMMENT 'Rate for 4-6 days',
    rate_7_plus DECIMAL(10,2) NOT NULL COMMENT 'Rate for 7+ days',
    season_regular DECIMAL(3,2) NOT NULL DEFAULT 1.00 COMMENT 'Regular season multiplier',
    season_peak DECIMAL(3,2) NOT NULL DEFAULT 1.20 COMMENT 'Peak season multiplier',
    season_offpeak DECIMAL(3,2) NOT NULL DEFAULT 0.80 COMMENT 'Off-peak season multiplier',
    tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Tax percentage',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    effective_date DATE NOT NULL,
    updated_by INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Bookings table
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guest_id INT NOT NULL,
    apartment_id INT NOT NULL,
    floor ENUM('ground', 'first', 'second') NULL,
    unit_no VARCHAR(50) NULL,
    from_datetime DATETIME NOT NULL,
    to_datetime DATETIME NOT NULL,
    days INT NOT NULL,
    season ENUM('regular', 'peak', 'offpeak') NOT NULL DEFAULT 'regular',
    base_rate DECIMAL(10,2) NOT NULL,
    multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(10,2) NOT NULL,
    payment_type ENUM('full', 'advance', 'other') NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('pending', 'partially_paid', 'paid') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cash', 'card', 'bank', 'online') NOT NULL DEFAULT 'cash',
    booking_status ENUM('draft', 'tentative', 'confirmed', 'checked-in', 'checked-out', 'cancelled') NOT NULL DEFAULT 'draft',
    booking_by_user INT NOT NULL,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
    FOREIGN KEY (apartment_id) REFERENCES apartments(id),
    FOREIGN KEY (booking_by_user) REFERENCES users(id)
);

-- Audit logs table
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity VARCHAR(50) NOT NULL COMMENT 'Table name or entity type',
    entity_id INT NOT NULL COMMENT 'ID of the affected record',
    action ENUM('create', 'update', 'delete') NOT NULL,
    old_value JSON NULL COMMENT 'Previous values (for updates/deletes)',
    new_value JSON NULL COMMENT 'New values (for creates/updates)',
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX idx_bookings_apartment_id ON bookings(apartment_id);
CREATE INDEX idx_bookings_dates ON bookings(from_datetime, to_datetime);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Insert sample data

-- Sample users
INSERT INTO users (name, email, password_hash, role) VALUES
('Super Admin', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge', 'super_admin'), -- password: password123
('Reception Staff', 'reception@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge', 'admin'); -- password: password123

-- Sample apartments
INSERT INTO apartments (name, floor, unit) VALUES
('Apartment 1', 'ground', 'G01'),
('Apartment 2', 'ground', 'G02'),
('Apartment 3', 'first', 'F01'),
('Apartment 4', 'first', 'F02'),
('Apartment 5', 'second', 'S01'),
('Apartment 6', 'second', 'S02');

-- Sample pricing rules
INSERT INTO pricing_rules (rate_1_3, rate_4_6, rate_7_plus, season_regular, season_peak, season_offpeak, tax_percent, effective_date, updated_by) VALUES
(100.00, 90.00, 80.00, 1.00, 1.20, 0.80, 10.00, CURDATE(), 1);

-- Sample guests
INSERT INTO guests (name, address, phone, email, guest_type, place_or_country, introduced, introduced_by) VALUES
('John Doe', '123 Main St, City', '+1234567890', 'john@example.com', 'local', 'Downtown', 'no', NULL),
('Jane Smith', '456 Oak Ave, Town', '+1234567891', 'jane@example.com', 'foreign', 'USA', 'yes', 'Travel Agent'),
('Mike Johnson', '789 Pine Rd, Village', '+1234567892', 'mike@example.com', 'local', 'Suburbs', 'no', NULL);

-- Sample bookings
INSERT INTO bookings (guest_id, apartment_id, floor, unit_no, from_datetime, to_datetime, days, season, base_rate, multiplier, subtotal, discount, tax, grand_total, payment_type, amount_paid, payment_status, payment_method, booking_status, booking_by_user) VALUES
(1, 1, 'ground', 'G01', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY), 2, 'regular', 100.00, 1.00, 200.00, 0.00, 20.00, 220.00, 'full', 220.00, 'paid', 'cash', 'confirmed', 2),
(2, 3, 'first', 'F01', DATE_ADD(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 8 DAY), 3, 'peak', 100.00, 1.20, 360.00, 50.00, 31.00, 341.00, 'advance', 200.00, 'partially_paid', 'card', 'confirmed', 2),
(3, 5, 'second', 'S01', DATE_ADD(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 15 DAY), 5, 'regular', 90.00, 1.00, 450.00, 0.00, 45.00, 495.00, 'full', 0.00, 'pending', 'cash', 'tentative', 2);

-- Create views for common queries

-- View for booking details with guest and apartment info
CREATE VIEW booking_details AS
SELECT 
    b.*,
    g.name as guest_name,
    g.phone as guest_phone,
    g.email as guest_email,
    g.address as guest_address,
    g.guest_type,
    g.place_or_country,
    g.introduced,
    g.introduced_by,
    a.name as apartment_name,
    a.floor as apartment_floor,
    a.unit as apartment_unit,
    u.name as booked_by_name
FROM bookings b
LEFT JOIN guests g ON b.guest_id = g.id
LEFT JOIN apartments a ON b.apartment_id = a.id
LEFT JOIN users u ON b.booking_by_user = u.id;

-- View for daily arrivals and departures
CREATE VIEW daily_schedule AS
SELECT 
    DATE(from_datetime) as date,
    'arrival' as type,
    guest_name,
    apartment_name,
    from_datetime,
    booking_status
FROM booking_details
WHERE booking_status IN ('confirmed', 'checked-in')
UNION ALL
SELECT 
    DATE(to_datetime) as date,
    'departure' as type,
    guest_name,
    apartment_name,
    to_datetime,
    booking_status
FROM booking_details
WHERE booking_status IN ('confirmed', 'checked-in', 'checked-out');

-- Create stored procedures

-- Procedure to calculate booking totals
DELIMITER //
CREATE PROCEDURE CalculateBookingTotal(IN booking_id INT)
BEGIN
    DECLARE base_rate DECIMAL(10,2);
    DECLARE days INT;
    DECLARE multiplier DECIMAL(3,2);
    DECLARE discount DECIMAL(10,2);
    DECLARE tax_percent DECIMAL(5,2);
    DECLARE subtotal DECIMAL(10,2);
    DECLARE tax DECIMAL(10,2);
    DECLARE grand_total DECIMAL(10,2);
    
    -- Get booking details
    SELECT b.days, b.discount, b.season, pr.rate_1_3, pr.rate_4_6, pr.rate_7_plus, pr.tax_percent
    INTO days, discount, @season, @rate_1_3, @rate_4_6, @rate_7_plus, tax_percent
    FROM bookings b
    CROSS JOIN pricing_rules pr
    WHERE b.id = booking_id
    AND pr.effective_date <= CURDATE()
    ORDER BY pr.effective_date DESC
    LIMIT 1;
    
    -- Calculate base rate
    IF days <= 3 THEN
        SET base_rate = @rate_1_3;
    ELSEIF days <= 6 THEN
        SET base_rate = @rate_4_6;
    ELSE
        SET base_rate = @rate_7_plus;
    END IF;
    
    -- Get season multiplier
    SELECT 
        CASE @season
            WHEN 'regular' THEN season_regular
            WHEN 'peak' THEN season_peak
            WHEN 'offpeak' THEN season_offpeak
            ELSE 1.00
        END INTO multiplier
    FROM pricing_rules
    WHERE effective_date <= CURDATE()
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Calculate totals
    SET subtotal = (base_rate * days * multiplier) - discount;
    SET tax = (subtotal * tax_percent) / 100;
    SET grand_total = subtotal + tax;
    
    -- Update booking
    UPDATE bookings 
    SET base_rate = base_rate,
        multiplier = multiplier,
        subtotal = subtotal,
        tax = tax,
        grand_total = grand_total
    WHERE id = booking_id;
    
    SELECT subtotal, tax, grand_total;
END //
DELIMITER ;

-- Create triggers for audit logging

-- Trigger for booking changes
DELIMITER //
CREATE TRIGGER booking_audit_insert
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity, entity_id, action, old_value, new_value, user_id)
    VALUES ('bookings', NEW.id, 'create', NULL, JSON_OBJECT(
        'guest_id', NEW.guest_id,
        'apartment_id', NEW.apartment_id,
        'from_datetime', NEW.from_datetime,
        'to_datetime', NEW.to_datetime,
        'booking_status', NEW.booking_status,
        'grand_total', NEW.grand_total
    ), NEW.booking_by_user);
END //

CREATE TRIGGER booking_audit_update
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity, entity_id, action, old_value, new_value, user_id)
    VALUES ('bookings', NEW.id, 'update', JSON_OBJECT(
        'guest_id', OLD.guest_id,
        'apartment_id', OLD.apartment_id,
        'from_datetime', OLD.from_datetime,
        'to_datetime', OLD.to_datetime,
        'booking_status', OLD.booking_status,
        'grand_total', OLD.grand_total
    ), JSON_OBJECT(
        'guest_id', NEW.guest_id,
        'apartment_id', NEW.apartment_id,
        'from_datetime', NEW.from_datetime,
        'to_datetime', NEW.to_datetime,
        'booking_status', NEW.booking_status,
        'grand_total', NEW.grand_total
    ), NEW.booking_by_user);
END //

CREATE TRIGGER booking_audit_delete
BEFORE DELETE ON bookings
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (entity, entity_id, action, old_value, new_value, user_id)
    VALUES ('bookings', OLD.id, 'delete', JSON_OBJECT(
        'guest_id', OLD.guest_id,
        'apartment_id', OLD.apartment_id,
        'from_datetime', OLD.from_datetime,
        'to_datetime', OLD.to_datetime,
        'booking_status', OLD.booking_status,
        'grand_total', OLD.grand_total
    ), NULL, OLD.booking_by_user);
END //
DELIMITER ;

-- Grant permissions (adjust as needed for your environment)
-- GRANT ALL PRIVILEGES ON apartment_booking.* TO 'your_user'@'localhost';
-- FLUSH PRIVILEGES;

