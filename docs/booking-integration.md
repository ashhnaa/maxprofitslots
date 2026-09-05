# Booking Data Integration Architecture

## Why This Layer Exists

Sports arena owners already have their own booking management systems.
The **Sports Turf Profit Optimizer** is designed to work *alongside* an
existing booking system — not replace it.

Rather than forcing data migration, the application connects to whatever
booking system an arena uses through this **Booking Data Provider** layer.
The Profit Optimization engine always talks to the provider interface and
never directly to a database or third-party API.

---

## Architecture

```
==========================================================
              SPORTS TURF PROFIT OPTIMIZER
==========================================================

  [Arena's Existing Booking System]
           |
           | (REST API / Webhook / DB adapter)
           v
  +---------------------------------+
  |    Booking Data Provider        |  <--- THIS LAYER
  |  interface (BookingProvider.js) |
  +---------------------------------+
           |
     +-----+------+
     |             |
     v             v
  DemoBooking   ExternalBooking
  Provider      Provider
  (PostgreSQL)  (Future real API)
           |
           v
  +---------------------------------+
  |   Profit Optimization System    |
  |                                 |
  |  Analytics  ML Predict  RAG     |
  |        \       |       /        |
  |         [Decision Engine]       |
  |               |                 |
  |            [Agent]              |
  |               |                 |
  |         Action / API            |
  +---------------------------------+
```

---

## Current Implementation: DemoBookingProvider

During hackathon development, the **PostgreSQL synthetic database** acts
as a simulated booking system.

```
PostgreSQL (sports_turf_db)
  tables: arenas, slots, customers, bookings
         |
         | raw DB rows
         v
  DemoBookingProvider
         |
         | normalizeSlot() / normalizeBooking() / normalizeCustomer()
         |   converts snake_case columns → camelCase objects
         v
  BookingProvider interface
         |
         v
  /api/booking/* routes
```

**Key design decisions:**
- `DemoBookingProvider` is the only file that knows raw column names.
- All other code uses camelCase normalized objects.
- The synthetic dataset (generated in Step 3) is the data source.

---

## Future: ExternalBookingProvider

When integrating a real arena, swap the provider:

```bash
# backend/.env
BOOKING_PROVIDER=external
EXTERNAL_BOOKING_API_URL=https://api.arena-booking-system.com/v1
EXTERNAL_BOOKING_API_KEY=your-api-key-here
```

The `ExternalBookingProvider` implements the same interface:

```
Arena Booking System (e.g. Playo, SportzBuddy, custom ERP)
         |
         | HTTPS REST API calls
         v
  ExternalBookingProvider
         |
         | normalize external response → standard objects
         v
  BookingProvider interface  (SAME interface as demo)
         |
         v
  No changes needed in routes, analytics, ML, or agent
```

### What the external API must provide

| Operation | Expected endpoint |
|---|---|
| List arenas | `GET /arenas` |
| Slots by date | `GET /slots?date=YYYY-MM-DD&arenaId=` |
| Single slot | `GET /slots/:id` |
| Bookings | `GET /bookings?fromDate=&toDate=&customerId=` |
| Customer profile | `GET /customers/:id` |
| Customer history | `GET /customers/:id/bookings` |

Authentication: Bearer token / API key via `Authorization` header.

---

## Provider Contract (BookingProvider.js)

Every provider must implement:

| Method | Description |
|---|---|
| `getArenas()` | All arena venues |
| `getAvailableSlots(filters)` | Vacant slots, optional filters |
| `getSlotById(id)` | Single slot |
| `getSlotsByDate(date, filters)` | All slots on a date |
| `getBookingsForSlot(slotId)` | Bookings linked to a slot |
| `getHistoricalBookings(filters)` | Historical bookings with date/sport filters |
| `getCustomers(options)` | Customer list |
| `getCustomerById(id)` | Single customer |
| `getCustomerBookingHistory(id, opts)` | Customer's full booking history |
| `getBookingStatistics(filters)` | Aggregated fill rates, revenue, cancellations |

---

## API Endpoints

All endpoints are prefixed with `/api/booking/`.

| Method | Path | Description |
|---|---|---|
| GET | `/arenas` | All arenas |
| GET | `/slots` | Available slots (or all if `?date=` provided) |
| GET | `/slots/:id` | Single slot + its bookings |
| GET | `/bookings` | Historical bookings (filterable) |
| GET | `/customers` | Customer list |
| GET | `/customers/:id` | Single customer |
| GET | `/customers/:id/history` | Customer booking history |
| GET | `/statistics` | Fill rates, revenue, cancellations |

### Query Parameters

`/api/booking/slots`
- `date=YYYY-MM-DD` — filter by date
- `arenaId=1` — filter by arena
- `sport=Football` — filter by sport
- `period=PEAK|NON_PEAK` — filter by period
- `status=AVAILABLE|BOOKED|BLOCKED` — filter by status

`/api/booking/bookings`
- `fromDate=YYYY-MM-DD`, `toDate=YYYY-MM-DD`
- `arenaId`, `sport`, `period`, `status`
- `limit`, `offset`

`/api/booking/statistics`
- `arenaId`, `fromDate`, `toDate`

---

## Switching Provider

To switch from demo to external (when ready):

1. `BOOKING_PROVIDER=external` in `backend/.env`
2. Implement all methods in `ExternalBookingProvider.js`
3. Restart the backend — **no other files need to change**

---

## Independence Principle

The future **Profit Optimization Agent** must interact with the system
through provider methods only:

```
Agent
  |
  | calls provider.getAvailableSlots()
  | calls provider.getBookingStatistics()
  | calls provider.getCustomerBookingHistory()
  v
BookingProvider (interface)
  |
  v
DemoBookingProvider OR ExternalBookingProvider
```

The agent never writes raw SQL. The agent never calls external HTTP APIs.
This ensures the optimization logic remains portable across any booking
system the arena owner already uses.
