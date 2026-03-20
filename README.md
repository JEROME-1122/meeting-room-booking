 Meeting Room Booking Service

 
1. Features

* Create and list meeting rooms
* Book meeting rooms with validations
* Prevent overlapping bookings
* Enforce working hours (Mon–Fri, 08:00–20:00)
* Idempotent booking creation (no duplicate bookings)
* Cancel bookings with 1-hour cutoff rule
* List bookings with filters & pagination
* Room utilization report

---

2.  Tech Stack

* Node.js
* Express.js
* MongoDB (Mongoose)
* Jest + Supertest (for testing)

 

3. Environment Variables

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/meeting_booking
```

---

4. Run the Server

```bash
npm run dev
```

Server will start at:

```
http://localhost:3000
```

---

 API Endpoints

  Rooms

  Create Room

 
POST /rooms
 

Body:

```json
{
  "name": "Conference Room A",
  "capacity": 10,
  "floor": 2,
  "amenities": ["projector", "whiteboard"]
}
```

---

5 List Rooms

```
GET /rooms
```

Query Params:

* `minCapacity`
* `amenity`

---

6 Bookings

7 Create Booking

```
POST /bookings
```

Headers:

```
Idempotency-Key: unique-key
```

Body:

```json
{
  "roomId": "ROOM_ID",
  "title": "Team Meeting",
  "organizerEmail": "test@mail.com",
  "startTime": "2026-03-24T10:00:00.000Z",
  "endTime": "2026-03-24T11:00:00.000Z"
}
```

---


7 List Bookings

```
GET /bookings
```

Query Params:

* `roomId`
* `from`, `to`
* `limit`, `offset`

---

8 Cancel Booking

```
POST /bookings/{id}/cancel
```

Rules:

* Can cancel only **1 hour before startTime**
* Already cancelled → returns same booking
* Cancelled bookings do NOT block new bookings

---

9 Reports

10 Room Utilization

```
GET /bookings/reports/room-utilization
```
 

Response:

```json
[
  {
    "roomId": "...",
    "roomName": "conference room a",
    "totalBookingHours": 12.5,
    "utilizationPercent": 0.45
  }
]
```

---

11  Idempotency

* Uses `Idempotency-Key` header
* Same request with same key → returns same booking
* Prevents duplicate bookings during retries
* Stored in database for persistence

---

12  Error Handling

Consistent error format:

```json
{
  "error": "ValidationError",
  "message": "startTime must be before endTime"
}
```

HTTP Status Codes:

* `400` → Validation error
* `404` → Resource not found
* `409` → Conflict (overlapping booking)

---

13  Running Tests

```bash
npm test
```

14Includes:

* Unit tests (booking rules)
* Integration tests (booking creation & conflicts)
* Idempotency tests
* Cancellation rule tests
* Utilization report tests

---

15  Project Structure

 
src/
  controllers/
  services/
  models/
  routes/
  tests/
 

 
