const router = require("express").Router();
const bookingController = require("../controllers/bookingController");

router.post("/", bookingController.createBooking);
router.post("/:id/cancel", bookingController.cancelBooking);
router.get("/", bookingController.listBookings);
router.get(
  "/reports/room-utilization",
  bookingController.roomUtilizationReport,
);

module.exports = router;
