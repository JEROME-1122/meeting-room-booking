const bookingService = require("../services/bookingService");

exports.createBooking = async (req, res) => {
  try {
    const key = req.header("Idempotency-Key");
    const booking = await bookingService.createBooking(req.body, key);
    res.status(201).json(booking);
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: "BookingError", message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id);
    res.json(booking);
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: "BookingError", message: err.message });
  }
};

exports.listBookings = async (req, res) => {
  try {
    const bookings = await bookingService.listBookings(req.query);
    res.json(bookings);
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: "BookingError", message: err.message });
  }
};

exports.roomUtilizationReport = async (req, res) => {
  try {
    const report = await bookingService.roomUtilizationReport(
      req.query.from,
      req.query.to,
    );
    res.json(report);
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: "ReportError", message: err.message });
  }
};
