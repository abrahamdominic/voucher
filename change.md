# Build a Production-Ready Guest Wi-Fi Voucher Platform + Admin Dashboard

Build a complete, modern, production-ready **Guest Wi-Fi Voucher Sales Platform** inspired by the UX and flow of:

https://sunrise-cafe-kappa.vercel.app/

The reference site is a Wi-Fi access portal where a customer:

1. Lands on the Guest Wi-Fi homepage.
2. Clicks **Get connected**.
3. Selects a Wi-Fi access plan.
4. Reviews the selected plan.
5. Enters their phone number and email.
6. Pays for the selected plan.
7. The system automatically generates/assigns a Wi-Fi voucher.
8. The customer sees a success screen containing their voucher/access code.
9. The customer can copy the voucher and start browsing.

Do NOT build this as a mobile-data-selling website.

This platform sells **Wi-Fi access vouchers**. The vouchers allow customers to connect to a specific Wi-Fi/access-point network and browse the internet for the duration/data allowance purchased.

---

## 1. TECH STACK

Use a modern production-ready stack:

* Next.js with App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Supabase

  * PostgreSQL database
  * Authentication
  * Row Level Security
  * Storage where required
* Payment gateway abstraction so the system can support Nigerian payment providers such as Paystack/Flutterwave
* Vercel-ready deployment
* Responsive design
* Server-side validation
* Secure API routes/server actions

Structure the project cleanly and professionally.

Use reusable components rather than duplicating UI code.

---

# 2. CUSTOMER WEBSITE

Create a beautiful customer-facing Wi-Fi voucher portal.

The design should feel:

* Premium
* Minimal
* Modern
* Fast
* Trustworthy
* Mobile-first
* Easy for non-technical customers
* Similar in simplicity to the supplied Sunrise Café reference

Do not copy branding, logos, images, or copyrighted assets from the reference website.

Create an image folder, i will paste the image in the image folder you create later the name of the logo will be logo.png

Use the reference only for the overall UX flow.

---

# 3. HOMEPAGE

Create a clean landing page.

Hero section:

**Fast Wi-Fi**

Large heading:

**[NK Swift DATA]**

Example:

**Connect to fast, reliable Wi-Fi**

Supporting text:

**Get connected in under a minute. Choose a plan, pay securely, and receive your access voucher instantly.**

Primary CTA:

**Get Connected**

Secondary information:

* Fast internet
* Secure payment
* Instant voucher
* Easy activation

Add a subtle Wi-Fi/network visual.

The homepage must work perfectly on:

* Mobile
* Tablet
* Laptop
* Desktop

---

# 4. CONNECTION FLOW

Implement the customer flow as a polished multi-step experience.

## Step 1 — Welcome

Display:

Guest Wi-Fi

[NK Swift Data]

Fast, reliable Wi-Fi for our guests.

Button:

**Get connected**

---

# 5. STEP 2 — CHOOSE YOUR PLAN

Create a plan-selection page.

Display available plans dynamically from Supabase.

Each plan should show:

* Plan name
* Price
* Duration
* Data allowance if applicable
* Speed
* Description
* Availability
* Popular badge where applicable

Example:

### 1 Hour

₦500

1 hour access

### 6 Hours

₦1,500

6 hour access

### 24 Hours

₦3,000

24 hour access

Do NOT hardcode these example prices in production.

Admins must be able to create and modify plans from the admin dashboard.

Allow the administrator to define:

* Name
* Description
* Price
* Duration
* Data allowance
* Speed limit
* Number of devices
* Active/inactive status
* Display order
* Popular status

Selected plan should be visually highlighted.

Button:

**Continue**

---

# 6. STEP 3 — CONFIRM & PAY

Display a checkout summary.

Show:

Plan
Duration
Price
Data allowance
Total

Collect:

* Phone number
* Email address

Validate both fields.

Phone number should support Nigerian numbers.

Example placeholder:

080X XXX XXXX

Email placeholder:

[you@example.com](mailto:you@example.com)

Add a secure payment section.

Button:

**Pay now**

Before payment:

* Validate plan still exists
* Verify plan is active
* Recalculate price server-side
* Never trust price sent from the browser
* Create an order with pending status

---

# 7. PAYMENT SYSTEM

Implement payment securely.

Create a payment abstraction so another provider can easily be added later.

Support a Nigerian payment gateway such as:

* Paystack

Structure payment logic so it is easy to replace or add:

* Flutterwave
* Paystack
* Other providers

Never expose secret API keys to the client.

Payment flow:

1. Customer selects plan.
2. Server creates pending order.
3. Server calculates the real amount.
4. Payment transaction is initialized.
5. Customer completes payment.
6. Payment provider sends callback/webhook.
7. Server verifies transaction.
8. Server confirms payment.
9. Server allocates/generates voucher.
10. Voucher is returned to customer.
11. Order becomes completed.

Never mark an order as paid based only on a frontend callback.

Use webhook/payment verification as the source of truth.

Prevent:

* Duplicate payments
* Duplicate voucher allocation
* Fake successful-payment requests
* Amount manipulation
* Plan-price manipulation

---

# 8. VOUCHER SYSTEM

This is the most important part of the platform.

The system must support Wi-Fi access vouchers.

Create a voucher management system.

Each voucher should have:

* ID
* Voucher code
* Plan ID
* Order ID
* Status
* Created at
* Activated at
* Expires at
* Duration
* Data allowance
* Device limit
* Customer phone
* Customer email
* Usage information if available

Voucher statuses:

* Available
* Reserved
* Issued
* Active
* Expired
* Suspended
* Revoked
* Used

Generate secure, unpredictable voucher codes.

Example format:

DS-7K4P-X92M

Do not use sequential voucher codes.

Prevent duplicate codes.

---

# 9. VOUCHER INVENTORY

Support two voucher modes.

## Mode A — Generated vouchers

The system generates voucher codes automatically.

## Mode B — Imported vouchers

Admins can upload/import pre-created vouchers from an external Wi-Fi system.

Support CSV import.

CSV example:

voucher_code,plan_id

DS-ABC123,1
DS-XYZ789,1

Validate imported vouchers.

Reject:

* Duplicate codes
* Invalid plans
* Empty codes
* Already-used vouchers

Show import results:

* Imported
* Duplicates
* Invalid
* Failed

---

# 10. SUCCESS PAGE

After confirmed payment and voucher allocation, show:

# You're connected!

Your access voucher has been issued successfully.

Display:

### Voucher Code

`DS-7K4P-X92M`

Buttons:

**Copy code**

**Start browsing**

Also show:

* Plan
* Duration
* Expiry
* Data allowance
* Order reference

Provide clear instructions:

1. Connect to the Wi-Fi network.
2. Open the Wi-Fi login page.
3. Enter your voucher code.
4. Start browsing.

Add:

**Keep this voucher code for your records.**

Do not expose sensitive internal database IDs.

---

# 11. CUSTOMER ORDER LOOKUP

Allow customers to retrieve previous voucher/order information.

Create a simple:

**Check my voucher**

page.

Customer enters:

* Phone number
* Email or order reference

Return matching orders/vouchers securely.

Do not expose another customer's orders.

Implement rate limiting and secure lookup logic.

---

# 12. CUSTOMER RECEIPT

After successful payment, generate a digital receipt.

Include:

* Business name
* Order number
* Customer phone
* Customer email
* Plan
* Amount
* Payment status
* Voucher
* Date
* Expiry

Add:

**Download receipt**

and optionally:

**Email receipt**

---

# 13. ADMIN AUTHENTICATION

Create a completely separate protected admin dashboard.

Admin URL:

`/admin`

Require authentication.

Use Supabase Auth.

Support:

* Email/password login
* Secure session handling
* Logout
* Password reset

Do not allow normal customers to access admin pages.

Use role-based access control.

Roles:

### Super Admin

Full access.

### Admin

Operational access.

### Staff

Limited operational access.

Never rely only on hiding frontend routes.

Enforce permissions server-side and through Supabase RLS.

---

# 14. ADMIN DASHBOARD

Create a professional SaaS-style dashboard.

Sidebar navigation:

* Dashboard
* Orders
* Vouchers
* Plans
* Customers
* Payments
* Wi-Fi Settings
* Analytics
* Notifications
* Staff
* Settings
* Audit Logs

Responsive mobile sidebar.

---

# 15. ADMIN DASHBOARD OVERVIEW

Display statistics:

### Today's Revenue

₦XXX,XXX

### Today's Orders

XXX

### Active Vouchers

XXX

### Available Vouchers

XXX

### Expired Vouchers

XXX

### Customers

XXX

### Conversion Rate

XX%

Add charts:

* Revenue over time
* Orders over time
* Most popular plans
* Voucher usage
* Payment methods

Allow:

* Today
* 7 days
* 30 days
* 3 months
* 12 months
* Custom range

---

# 16. ORDER MANAGEMENT

Create a complete orders page.

Table columns:

* Order ID
* Customer
* Phone
* Plan
* Amount
* Payment status
* Voucher
* Created
* Actions

Statuses:

* Pending
* Paid
* Failed
* Cancelled
* Refunded

Add:

* Search
* Filters
* Date range
* Status filter
* Plan filter
* Pagination
* Export CSV

Clicking an order opens a detailed order page.

---

# 17. VOUCHER MANAGEMENT

Create a complete voucher management page.

Display:

* Voucher code
* Plan
* Status
* Customer
* Created
* Activated
* Expiry
* Usage

Actions:

* View
* Revoke
* Suspend
* Reactivate
* Delete only where safe
* Export
* Search

Add bulk operations.

Admin should be able to:

* Generate vouchers
* Import vouchers
* Export vouchers
* Assign vouchers
* Revoke vouchers
* Suspend vouchers

---

# 18. PLAN MANAGEMENT

Create CRUD functionality.

Admin can:

* Create plan
* Edit plan
* Duplicate plan
* Activate/deactivate plan
* Delete/archive plan
* Reorder plans

Fields:

* Name
* Description
* Price
* Duration
* Data limit
* Speed
* Device limit
* Status
* Popular
* Display order

Changes should immediately reflect on the customer website.

---

# 19. CUSTOMER MANAGEMENT

Create customers page.

Display:

* Name if available
* Phone
* Email
* Number of orders
* Total spent
* Last purchase
* Active voucher
* Account status

Customer details page should show:

* Orders
* Payments
* Vouchers
* Usage history

Add search and filtering.

---

# 20. PAYMENT MANAGEMENT

Create payments page.

Display:

* Transaction ID
* Order ID
* Customer
* Amount
* Provider
* Payment method
* Status
* Date

Statuses:

* Pending
* Successful
* Failed
* Refunded

Add payment verification information.

---

# 21. WIFI SETTINGS

Create a dedicated Wi-Fi settings page.

Allow admins to configure:

* Wi-Fi network name
* Captive portal URL
* Access point name
* Router identifier
* Voucher authentication method
* Session duration
* Default speed
* Default data limit
* Device limit
* Connection instructions

Important:

The web application should not pretend that a voucher automatically connects a device to Wi-Fi.

Design the platform so it can integrate with the actual network infrastructure through an API.

Create a clean abstraction:

`WiFiProvider`

with operations such as:

* createVoucher()
* activateVoucher()
* revokeVoucher()
* suspendVoucher()
* getVoucherStatus()
* getVoucherUsage()

This allows integration with systems such as:

* MikroTik
* UniFi
* RADIUS
* Custom captive portal
* Other supported hotspot systems

Keep network-provider credentials server-side.

---

# 22. WIFI PROVIDER INTEGRATION

Build the architecture so the payment platform and Wi-Fi infrastructure are separate.

Flow:

Customer
↓
Select Plan
↓
Create Order
↓
Payment
↓
Payment Webhook
↓
Voucher Service
↓
WiFi Provider API
↓
Voucher Created/Allocated
↓
Customer Receives Voucher

If the external Wi-Fi provider is temporarily unavailable:

* Do not lose the payment
* Mark voucher allocation as pending
* Retry automatically
* Notify admin
* Allow admin to manually retry
* Never charge the customer twice

---

# 23. ANALYTICS

Create an analytics section.

Metrics:

* Total revenue
* Daily revenue
* Monthly revenue
* Total orders
* Paid orders
* Failed orders
* Active vouchers
* Voucher activation rate
* Most popular plans
* Average order value
* Returning customers

Charts should be responsive and easy to understand.

---

# 24. NOTIFICATIONS

Create notification management.

Support:

* Successful payment
* Voucher issued
* Voucher expiring
* Payment failed
* Voucher revoked

Prepare integrations for:

* Email
* SMS
* WhatsApp

Do not hardcode a specific messaging provider into the business logic.

---

# 25. SETTINGS

Create settings pages for:

### Business

* Business name
* Logo
* Phone
* Email
* Address
* Support information

### Branding

* Logo
* Favicon
* Primary color
* Secondary color
* Website title
* Description

### Payment

* Payment provider
* Public key
* Secret key
* Webhook settings

Never display secret credentials in plaintext.

### Wi-Fi

* Network name
* Captive portal
* Provider
* API settings

### Notifications

* Email
* SMS
* WhatsApp

---

# 26. AUDIT LOGS

Create an audit log system.

Record important administrative actions:

* Admin login
* Admin logout
* Plan created
* Plan edited
* Plan deleted
* Voucher generated
* Voucher imported
* Voucher revoked
* Order manually updated
* Payment refunded
* Settings changed
* Staff account created

Store:

* Actor
* Action
* Resource
* Resource ID
* Timestamp
* IP where appropriate
* Metadata

Admins should not be able to silently modify audit records.

---

# 27. STAFF MANAGEMENT

Super Admin can:

* Create admin
* Create staff
* Disable account
* Reset access
* Change role
* Remove staff

Permission matrix:

Super Admin:

* Everything

Admin:

* Orders
* Vouchers
* Plans
* Customers
* Payments
* Analytics

Staff:

* Orders
* Voucher operations
* Customer support

---

# 28. DATABASE

Design a proper normalized PostgreSQL schema.

At minimum create:

* profiles
* roles
* plans
* vouchers
* customers
* orders
* order_items
* payments
* wifi_providers
* wifi_sessions
* voucher_usage
* notifications
* audit_logs
* settings

Use:

* UUID primary keys
* timestamps
* foreign keys
* indexes
* unique constraints
* appropriate CHECK constraints

Use database transactions for critical operations.

---

# 29. SECURITY

Treat this as a real payment application.

Implement:

* Supabase RLS
* Server-side authorization
* Input validation
* Zod schemas
* Secure API routes
* Rate limiting
* CSRF protection where applicable
* Secure webhook verification
* Idempotency keys
* Database transactions
* Proper error handling
* No secrets in frontend
* No service-role key in browser
* No price trust from client
* No voucher trust from client
* No admin-only operation exposed to customers

Never log:

* Payment secrets
* API secrets
* Passwords
* Sensitive tokens

---

# 30. PAYMENT + VOUCHER IDEMPOTENCY

This is critical.

If the payment provider sends the same webhook multiple times:

The system must NOT:

* Create multiple orders
* Create multiple vouchers
* Charge the customer again

Use:

* Transaction references
* Unique constraints
* Idempotency keys
* Database transactions

Example:

Payment successful
↓
Check transaction reference
↓
Already processed?
→ Yes: return success without creating another voucher
→ No: process payment and issue voucher

---

# 31. ERROR HANDLING

Create polished error states.

Examples:

Payment failed:

**Payment could not be completed**

Please try again.

Voucher generation failed:

**Payment received**

Your payment was successful, but we're still preparing your Wi-Fi voucher.

Please wait while we finish setting up your access.

Admin should immediately see this issue.

Do not show raw database errors to users.

---

# 32. LOADING STATES

Every asynchronous action should have a proper loading state.

Examples:

* Loading plans
* Processing payment
* Verifying payment
* Generating voucher
* Loading dashboard
* Saving settings
* Importing vouchers

Use skeleton loaders where appropriate.

Prevent duplicate button clicks.

---

# 33. RESPONSIVE DESIGN

The entire application must be responsive.

Customer portal:

* Mobile-first
* Tablet
* Desktop

Admin dashboard:

* Desktop optimized
* Tablet responsive
* Mobile responsive

Do not allow:

* Horizontal overflow
* Text clipping
* Broken tables
* Buttons overflowing
* Tiny unreadable text

On mobile, convert complex tables into cards where appropriate.

---

# 34. UI DESIGN

Use a premium modern design.

Customer portal:

* Clean white/dark-neutral interface
* Soft shadows
* Rounded cards
* Strong typography
* Large CTA buttons
* Smooth transitions
* Minimal distractions

Admin:

* Professional SaaS dashboard
* Sidebar
* Top navigation
* Cards
* Charts
* Data tables
* Status badges
* Modals/drawers
* Toast notifications

Use consistent spacing and typography.

Do not over-animate the interface.

---

# 35. CUSTOMER UX

The entire customer process should feel like:

Homepage
→ Get Connected
→ Select Plan
→ Confirm & Pay
→ Processing
→ Voucher Issued

Keep the number of steps minimal.

The customer should never need to create an account just to purchase Wi-Fi unless the business explicitly enables accounts.

Support guest checkout.

---

# 36. ADMIN UX

The admin should be able to manage the entire business without touching the code.

The admin must be able to:

* Change plans
* Change prices
* Add/remove plans
* Manage vouchers
* Import vouchers
* Generate vouchers
* View orders
* View payments
* View customers
* View analytics
* Manage Wi-Fi integration
* Manage staff
* Configure business information
* Configure notifications

---

# 37. DATABASE MIGRATIONS

Create proper Supabase SQL migrations.

Do not ask the developer to manually create tables through the dashboard.

Include:

* Schema
* Indexes
* Constraints
* RLS policies
* Functions
* Triggers
* Seed data

Create a seed dataset with realistic sample plans.

---

# 38. ENVIRONMENT VARIABLES

Create `.env.example`.

Include placeholders for:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

PAYMENT_PROVIDER=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=

WIFI_PROVIDER=
WIFI_API_URL=
WIFI_API_KEY=
WIFI_API_SECRET=

EMAIL_PROVIDER=
SMS_PROVIDER=
WHATSAPP_PROVIDER=

Do not put real credentials into the repository.

---

# 39. PROJECT STRUCTURE

Use a clean structure similar to:

app/
page.tsx
connect/
plans/
checkout/
success/
voucher/
admin/
login/
dashboard/
orders/
vouchers/
plans/
customers/
payments/
analytics/
wifi/
notifications/
staff/
settings/
audit-logs/

components/
customer/
admin/
ui/

lib/
supabase/
payments/
vouchers/
wifi/
notifications/
auth/

types/

hooks/

supabase/
migrations/
seed/

public/

---

# 40. IMPORTANT BUSINESS LOGIC

Never generate a voucher before confirmed payment unless the business specifically uses pre-generated voucher inventory.

Preferred flow:

Order created
↓
Payment initiated
↓
Payment verified
↓
Voucher allocated/generated
↓
Wi-Fi provider configured
↓
Voucher issued
↓
Customer notified

If using imported voucher inventory:

Payment verified
↓
Select available voucher for matching plan
↓
Reserve voucher
↓
Assign voucher to order
↓
Activate/configure voucher
↓
Issue voucher

Use database locking/transactions so two customers cannot receive the same voucher.

---

# 41. ADMIN MANUAL VOUCHER ISSUE

Allow an authorized admin to manually issue a voucher.

Admin selects:

* Customer
* Plan
* Voucher
* Expiry

Require a reason.

Record this action in audit logs.

Never allow staff to bypass permissions.

---

# 42. REFUNDS

Create refund support.

When an order is refunded:

* Update payment status
* Update order status
* Revoke voucher if it has not been used
* Record refund
* Create audit log

If the voucher is already active/used, show an appropriate warning and require authorized admin confirmation.

Do not automatically refund based solely on frontend actions.

---

# 43. SEARCH

Implement global admin search.

Search:

* Order ID
* Voucher code
* Phone
* Email
* Customer
* Transaction ID

Results should appear quickly.

---

# 44. EXPORTS

Allow authorized admins to export:

* Orders
* Payments
* Customers
* Vouchers
* Analytics reports

Use CSV.

Apply current filters when exporting.

---

# 45. SEO

Create proper metadata:

* Title
* Description
* Open Graph
* Favicon
* Robots
* Sitemap

Make the customer landing page SEO-friendly.

---

# 46. ACCESSIBILITY

Implement:

* Semantic HTML
* Keyboard navigation
* Proper labels
* Accessible buttons
* ARIA where required
* Sufficient contrast
* Visible focus states

---

# 47. TESTING

Before considering the project complete, test:

### Customer

* Homepage
* Plan selection
* Checkout
* Invalid phone
* Invalid email
* Payment success
* Payment failure
* Duplicate payment
* Voucher generation
* Voucher copying
* Receipt

### Admin

* Login
* Logout
* Authorization
* Dashboard
* Plan CRUD
* Voucher CRUD
* Voucher import
* Orders
* Customers
* Payments
* Analytics
* Staff permissions
* Settings
* Audit logs

### Security

Test that:

* Customer cannot access admin pages
* Staff cannot access Super Admin functions
* Client cannot modify plan prices
* Client cannot mark payment successful
* Client cannot create arbitrary vouchers
* Webhook cannot be replayed
* Duplicate vouchers cannot be created
* Unauthorized users cannot access another customer's voucher

---

# 48. FINAL REQUIREMENT

Do not build a static mockup.

Build a **fully functional full-stack application**.

The customer-facing website and admin dashboard must be connected to the same Supabase backend.

Every important admin change must reflect on the customer website.

The payment flow must be production-safe.

The voucher system must be production-safe.

The Wi-Fi integration must be designed as a real backend integration rather than a fake frontend simulation.

If an external Wi-Fi API is not yet available, create a clean mock provider implementing the same `WiFiProvider` interface so it can later be replaced with the real MikroTik/RADIUS/UniFi/custom captive-portal implementation without rewriting the rest of the application.

Do not leave TODO placeholders for core functionality.

Build the application incrementally:

1. Database
2. Authentication
3. Customer UI
4. Plans
5. Orders
6. Payments
7. Voucher system
8. Wi-Fi provider abstraction
9. Admin dashboard
10. Analytics
11. Notifications
12. Security/RLS
13. Testing
14. Production deployment configuration

At the end, provide:

* Complete project
* Supabase migrations
* Seed data
* `.env.example`
* README.md
* Local development instructions
* Supabase setup instructions
* Payment gateway setup instructions
* Wi-Fi provider integration instructions
* Deployment instructions for Vercel
* Admin login setup instructions

Make the final UI polished enough to be used as a real commercial Wi-Fi voucher platform.


build it to be also compatible on whatsapp and telegram because i want to integrate it with whatsapp and telegram as a miniapp and voucher delivery.