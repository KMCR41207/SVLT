# FleetFlow — Architecture & Feature Specification

This document captures user roles, UI/UX flows, core features, data models, and an initial REST API surface to implement the platform described.

## 1. User Roles
- Fleet Owner / Transport Company: manages trucks, drivers, company profile, sees fleet analytics, assigns trucks.
- Truck Driver: views assigned jobs, updates trip status, uploads proof-of-delivery, views payouts.
- Load Provider / Shipper: posts loads, sets price or allows bidding, views offers and assignments.
- Admin (optional but recommended): verifies accounts/documents, manages disputes, monitors system-wide reports.

## 2. High-level UX Flows
- Public landing page: marketing + links to register / login.
- Registration: choose role (driver, fleet owner, shipper). Role-specific profile setup.
- Fleet Owner dashboard: Trucks, Drivers, Loads (applied/assigned), Maintenance, Documents, Payouts.
- Driver dashboard: Available loads, Applied loads, Assigned trips, Status updates, POD upload.
- Shipper dashboard: Post load, Manage posted loads, View bids, Accept offers, Track delivery.
- Admin panel: User approvals, document verification, suspend/activate accounts, reports, platform settings.

## 3. Core Features (mapping to pages / components)
- Auth: register, login, forgot password, JWT-based sessions.
- Profiles: user, company, driver profile (license, experience), truck profile (type, capacity, documents).
- Fleet Management: CRUD trucks, assign drivers, statuses (available, on_trip, maintenance), maintenance reminders.
- Load Management: CRUD loads, specify pickup/delivery, weight, type, preferred price/bidding, pickup windows.
- Bidding / Applying: drivers/fleet owners can apply or place bids; shipper accepts.
- Tracking & Status: manual trip status updates; GPS integration later for real-time tracking.
- Proof of Delivery (POD): upload photo, signature, timestamp.
- Messaging: basic in-app chat (sender/receiver), with optional phone-masking and email/SMS notifications.
- Payments: track payment status, invoices, driver payouts, integration hooks for payment gateway.
- Admin tools: document verification, user moderation, commission rules, analytics.

## 4. Data Models (relational-style summary)

- User
  - id (uuid)
  - email
  - password_hash
  - role (enum: driver, fleet_owner, shipper, admin)
  - name
  - phone
  - is_verified (bool)
  - created_at, updated_at

- Company (optional link for fleet_owner)
  - id, owner_user_id
  - name, address, gst_vat_id
  - docs (RC, insurance) metadata

- DriverProfile
  - id, user_id
  - license_number, license_expiry
  - experience_years
  - documents

- Truck
  - id, company_id
  - registration_number
  - type (enum: mini, 10ft, 20ft, trailer, etc.)
  - capacity_tons
  - status (available, on_trip, maintenance)
  - assigned_driver_id (nullable)
  - documents

- Load (Job)
  - id, shipper_id
  - title, description, goods_type
  - weight_tons, volume (optional)
  - pickup_location (geo or address), delivery_location
  - pickup_datetime_window
  - price_fixed (nullable), bidding_enabled (bool)
  - status (open, assigned, in_progress, completed, cancelled)
  - assigned_truck_id (nullable), assigned_driver_id (nullable)
  - proof_of_delivery (file refs)
  - created_at, updated_at

- Bid / Application
  - id, load_id
  - bidder_user_id or bidder_company_id
  - proposed_price
  - message, created_at, status (pending, accepted, rejected)

- Trip / Tracking
  - id, load_id, truck_id, driver_id
  - start_time, pickup_time, delivery_time
  - status (assigned, picked_up, in_transit, delivered)
  - gps_trace (optional link to telemetry storage)

- Payment / Invoice
  - id, load_id, payer_id, payee_id
  - amount, method, status (pending, paid, failed)
  - invoice_pdf_ref

- Document
  - id, owner_type, owner_id, doc_type, file_ref, verified (bool), expiry_date

## 5. Initial REST API Surface (concise)

Auth
- POST /api/auth/register  — body includes role and profile data
- POST /api/auth/login     — returns JWT
- POST /api/auth/refresh   — refresh token

Users & Profiles
- GET /api/users/me
- PUT /api/users/me
- GET /api/users/:id (admin)

Companies & Fleet
- POST /api/companies
- GET /api/companies/:id
- POST /api/trucks
- GET /api/trucks (filters: company, status, capacity)
- GET /api/trucks/:id
- PUT /api/trucks/:id
- POST /api/trucks/:id/assign-driver

Drivers
- GET /api/drivers/:id/profile
- POST /api/drivers/:id/documents

Loads & Bids
- POST /api/loads        — create load (shipper)
- GET /api/loads         — query loads (filters: pickup, delivery, weight, date)
- GET /api/loads/:id
- PUT /api/loads/:id     — (shipper/edit/cancel)
- POST /api/loads/:id/bids — place bid/apply (driver/fleet)
- GET /api/loads/:id/bids  — list bids (owner view)
- POST /api/loads/:id/assign — assign to bidder or truck (owner/admin)

Trips & Tracking
- POST /api/trips       — create trip (on assignment)
- PATCH /api/trips/:id/status — update status (driver)
- POST /api/trips/:id/pod — upload POD
- GET /api/trips/:id/gps — fetch GPS trace

Payments
- POST /api/payments/charge — initiate payment (shipper)
- GET /api/payments/:id
- POST /api/payments/:id/confirm

Admin
- GET /api/admin/users
- POST /api/admin/users/:id/verify-document
- POST /api/admin/suspend-user/:id
- GET /api/admin/reports (filters)

Notifications
- POST /api/notifications/send (system)
- GET /api/notifications (user)

Security & Auth
- Use JWT for auth; refresh tokens stored securely.
- Role-based middleware for route protection; enforce least privilege.

## 6. Search & Filters
- Allow search by city, route, date range.
- Filters: truck type, capacity, weight range, price range, pickup date.
- Sorting: distance (calculate Haversine server-side), payout, earliest pickup.

## 7. UI / UX Notes
- Mobile-first responsive layout; simplified flows for drivers (one-tap status updates).
- Map view for loads and trips (Mapbox or Google Maps integration later).
- Accessibility: large touch targets, readable fonts, color contrast.

## 8. Security, Privacy & Compliance
- Encrypt sensitive data at rest where required.
- Store documents securely, enforce expiry checks.
- Audit logs for critical actions (assignments, payments, document verifications).

## 9. Tech Stack Recommendation (starter)
- Frontend: React + TypeScript, Tailwind CSS (fast, responsive components).
- Backend: Node.js + Express or NestJS; PostgreSQL for relational data.
- Auth: JWT + refresh tokens, bcrypt for passwords.
- Storage: S3-compatible for documents and POD.
- Maps: Mapbox or Google Maps API.
- Hosting: AWS (ECS / Lambda) or Vercel + serverless API.

## 10. Next Steps (short-term)
1. Finalize data model ERD and relations.
2. Implement auth + RBAC and user registration flows.
3. Build minimal CRUD for Trucks and Loads (API + simple UI pages).
4. Add admin document verification endpoints and UI.

---
For the next iteration I can: produce an ERD diagram, generate OpenAPI (Swagger) spec for the API, or scaffold the backend/auth endpoints. Which would you like me to do next?
