# FleetFlow — Complete Fleet Management & Logistics Platform

A modern, full-featured fleet management and logistics platform connecting shippers, drivers, and fleet owners on a single intelligent platform.

## Features ✨

### User Roles
- **🚛 Truck Drivers**: Browse loads, apply for jobs, track trips, upload proof-of-delivery, view earnings
- **🏢 Fleet Owners**: Manage trucks, assign drivers, track fleet, view analytics
- **📦 Shippers**: Post loads, set pricing, receive bids, track deliveries, manage payments
- **⚙️ Admin**: Oversee system, approve users, manage disputes, view platform analytics

### Core Features
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Fleet Management**: Add/edit trucks, assign drivers, track status
- **Load Management**: Post loads with details, enable bidding, track assignments
- **Bidding System**: Drivers can apply/bid on loads; shippers can accept bids
- **Trip Tracking**: Real-time status updates (picked up, in transit, delivered)
- **Proof of Delivery**: Upload photos/signatures with timestamp
- **Messaging**: In-app chat between drivers and shippers
- **Payments**: Track invoices, pending payments, payment status
- **Admin Tools**: User verification, document approval, system reports
- **Mobile-Responsive**: Works seamlessly on desktop and mobile

## Tech Stack

- **Frontend**: HTML5, CSS3, vanilla JavaScript
- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Auth**: JWT + bcrypt passwd hashing
- **API**: RESTful HTTP endpoints

## Quick Start

### Prerequisites
- Node.js 14+ installed
- npm package manager

### Installation

```bash
# Clone or extract the project
cd slvs mani charan reddy

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Running the Platform

```bash
# Terminal 1: Start the API server (port 3001)
npm run dev

# Terminal 2: Start the frontend server (port 8000)
node server.js

# Open in browser
http://localhost:8000
```

### Demo Credentials

Log in at `http://localhost:8000/auth.html`:

| Role        | Email               | Password |
|-------------|-------------------|----------|
| Driver      | driver@test.com    | pass123  |
| Shipper     | shipper@test.com   | pass123  |
| Fleet Owner | owner@test.com     | pass123  |
| Admin       | admin@test.com     | pass123  |

## Project Structure

```
├── api/
│   ├── db/
│   │   └── init.js              # Database initialization & schema
│   ├── middleware/
│   │   └── auth.js              # JWT auth & RBAC middleware
│   ├── routes/
│   │   ├── auth.js              # User registration & login
│   │   ├── trucks.js            # Truck management
│   │   ├── loads.js             # Load posting & bidding
│   │   ├── trips.js             # Trip tracking & POD
│   │   ├── payments.js          # Invoicing & payments
│   │   ├── messages.js          # In-app messaging
│   │   └── admin.js             # Admin dashboard & reports
│   └── index.js                 # Express app entrypoint
├── landing.html                 # Marketing landing page
├── auth.html                    # Login & registration page
├── driver.html                  # Driver dashboard
├── shipper.html                 # Shipper dashboard
├── fleet-owner.html             # Fleet owner dashboard
├── admin.html                   # Admin dashboard
├── index.html                   # Legacy dashboard (deprecated)
├── server.js                    # Static file server
├── package.json                 # Dependencies
├── ARCHITECTURE.md              # System design & specifications
├── ERD.md                       # Entity-relationship diagram
└── README.md                    # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user (includes role & profile data)
- `POST /api/auth/login` - Login, returns JWT token
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/me` - Update profile

### Trucks
- `GET /api/trucks` - List trucks (with filters)
- `POST /api/trucks` - Add new truck
- `PUT /api/trucks/:id` - Update truck status
- `POST /api/trucks/:id/assign-driver` - Assign driver to truck

### Loads
- `GET /api/loads` - List available loads (with filters & search)
- `POST /api/loads` - Post new load (shipper only)
- `PUT /api/loads/:id` - Edit load
- `POST /api/loads/:id/bids` - Place bid on load
- `GET /api/loads/:id/bids` - View bids for load
- `POST /api/loads/:id/assign` - Accept bid & assign load

### Trips
- `GET /api/trips` - Get user's trips
- `POST /api/trips` - Create new trip (on load assignment)
- `PATCH /api/trips/:id/status` - Update trip status
- `POST /api/trips/:id/pod` - Upload proof of delivery
- `GET /api/trips/:id/details` - Get trip with load details

### Payments
- `GET /api/payments` - List user's payments
- `POST /api/payments/charge` - Initiate payment
- `POST /api/payments/:id/confirm` - Confirm payment
- `GET /api/payments/:id/invoice` - Get invoice details

### Messages
- `GET /api/messages` - List user's messages
- `GET /api/messages/conversation/:user_id` - Get conversation with user
- `POST /api/messages` - Send message
- `PATCH /api/messages/:id/read` - Mark message as read
- `GET /api/messages/unread/count` - Get unread count

### Admin
- `GET /api/admin/users` - List all users
- `GET /api/admin/reports` - Get system reports
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `POST /api/admin/users/:id/verify-document` - Approve document
- `POST /api/admin/users/:id/suspend` - Suspend/activate user

## Database Schema

Tables: `users`, `companies`, `trucks`, `driver_profiles`, `loads`, `bids`, `trips`, `payments`, `documents`, `messages`, `maintenance`

See [ERD.md](ERD.md) for complete entity-relationship diagram.

## Security Features

- ✅ JWT token-based authentication (24-hour expiry)
- ✅ Role-based access control (RBAC) middleware
- ✅ Bcrypt password hashing
- ✅ Input validation on auth routes
- ✅ CORS enabled for frontend requests
- ✅ Unique constraints on emails & truck registrations

## Next Steps & Enhancements

### Phase 2 (Short-term)
- [ ] Real-time GPS tracking with Mapbox integration
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Email notifications via SendGrid
- [ ] Document storage (AWS S3 / Cloudinary)
- [ ] Advanced analytics & reporting
- [ ] Rating & review system

### Phase 3 (Mid-term)
- [ ] Mobile app (React Native / Flutter)
- [ ] Real-time chat with WebSockets
- [ ] Automated invoice generation (PDF)
- [ ] Integration with payment gateways (Stripe/PayPal)
- [ ] Multi-language support
- [ ] Dark mode UI

### Phase 4 (Long-term)
- [ ] AI-based load matching & route optimization
- [ ] ELD (Electronic Logging Device) integration
- [ ] Fuel expense tracking
- [ ] Driver performance analytics
- [ ] SOC 2 compliance & security audit
- [ ] Kubernetes deployment & auto-scaling

## Testing

### Manual Testing Workflow
1. Go to `http://localhost:8000`
2. Click "Get Started" or "Sign In"
3. Register as a new user OR log in with demo credentials
4. Explore role-specific dashboards and features

### API Testing with cURL

```bash
# Register a new driver
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@test.com","password":"pass123","name":"John","role":"driver","license_number":"DL123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@test.com","password":"pass123"}'

# Get user info (replace TOKEN)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## Troubleshooting

### Port 3000/3001 already in use
```bash
# PowerShell: Run API on different port
$env:PORT=3002; node api/index.js
```

### Database not initializing
```bash
# Remove old database and restart
rm fleetflow.db
npm run dev
```

### CORS errors
Make sure both servers are running:
- API: `http://localhost:3001`
- Frontend: `http://localhost:8000`

## Contributing

This is a complete scaffold implementation.  Contributions welcome for:
- Bug fixes
- Performance optimization
- Feature enhancements
- Documentation improvements

## License

MIT - Use freely for commercial or personal projects

## Support

For questions or issues, refer to [ARCHITECTURE.md](ARCHITECTURE.md) for system design details or create an issue in the repository.

---

**Built with ❤️ for modern logistics**
