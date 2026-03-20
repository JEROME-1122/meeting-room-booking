const Booking = require("../models/bookingModel");
const Room = require("../models/roomModel");
const Idempotency = require("../models/idempotencyModel");

const mongoose = require("mongoose");

exports.createBooking = async (data, idempotencyKey) => {
  const { roomId, startTime, endTime, title, organizerEmail } = data;

  if (!roomId || !startTime || !endTime || !organizerEmail)
    throw { status: 400, message: "Missing required fields" };

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (start >= end)
    throw { status: 400, message: "startTime must be before endTime" };

  const duration = (end - start) / (1000 * 60);
  if (duration < 15 || duration > 240)
    throw { status: 400, message: "Booking duration must be 15-240 minutes" };

  const day = start.getDay();
  const hour = start.getHours();
  if (day === 0 || day === 6 || hour < 8 || hour >= 20)
    throw {
      status: 400,
      message: "Booking outside working hours (Mon-Fri 8-20)",
    };

  const room = await Room.findById(roomId);
  if (!room) throw { status: 404, message: "Room not found" };

  // Idempotency check
  if (idempotencyKey) {
    let idem = await Idempotency.findOne({
      key: idempotencyKey,
      organizerEmail,
    });
    if (idem) {
      if (idem.status === "completed") return idem.response;
      else throw { status: 409, message: "Request in progress" };
    }
    idem = await Idempotency.create({ key: idempotencyKey, organizerEmail });
  }

  const conflict = await Booking.findOne({
    roomId,
    status: "confirmed",
    startTime: { $lt: end },
    endTime: { $gt: start },
  });
  if (conflict) throw { status: 409, message: "Booking conflict" };

  const booking = await Booking.create({
    roomId,
    startTime,
    endTime,
    title,
    organizerEmail,
    idempotencyKey,
  });

  if (idempotencyKey) {
    await Idempotency.findOneAndUpdate(
      { key: idempotencyKey, organizerEmail },
      { status: "completed", response: booking },
    );
  }

  return booking;
};

exports.cancelBooking = async (id) => {
  const booking = await Booking.findById(id);
  if (!booking) throw { status: 404, message: "Booking not found" };

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    throw { status: 400, message: "Invalid roomId" };
  }

  if (booking.status === "cancelled") return booking;

  const now = new Date();
  if ((booking.startTime - now) / (1000 * 60) < 60)
    throw {
      status: 400,
      message: "Cannot cancel less than 1 hour before start",
    };

  booking.status = "cancelled";
  await booking.save();
  return booking;
};

exports.listBookings = async (query) => {
  const filter = {};
  if (query.roomId) filter.roomId = query.roomId;
  if (query.from) filter.endTime = { $gte: new Date(query.from) };
  if (query.to)
    filter.startTime = { ...filter.startTime, $lte: new Date(query.to) };

  const limit = Number(query.limit) || 10;
  const offset = Number(query.offset) || 0;

  const total = await Booking.countDocuments(filter);
  const items = await Booking.find(filter).skip(offset).limit(limit);

  return { items, total, limit, offset };
};

exports.roomUtilizationReport = async (from, to) => {
  if (!from || !to) throw { status: 400, message: "from and to required" };

  const start = new Date(from);
  const end = new Date(to);

  const rooms = await Room.find();
  const bookings = await Booking.find({
    status: "confirmed",
    startTime: { $lt: end },
    endTime: { $gt: start },
  });

  const report = rooms.map((room) => {
    const roomBookings = bookings.filter(
      (b) => b.roomId.toString() === room._id.toString(),
    );
    let totalBooked = 0;

    roomBookings.forEach((b) => {
      const overlapStart = b.startTime > start ? b.startTime : start;
      const overlapEnd = b.endTime < end ? b.endTime : end;
      totalBooked += (overlapEnd - overlapStart) / (1000 * 60 * 60); // hours
    });

    // total business hours
    let totalBusinessHours = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day >= 1 && day <= 5) totalBusinessHours += 12; // 8:00-20:00
      cur.setDate(cur.getDate() + 1);
    }

    return {
      roomId: room._id,
      roomName: room.name,
      totalBookingHours: totalBooked,
      utilizationPercent: totalBusinessHours
        ? +(totalBooked / totalBusinessHours).toFixed(2)
        : 0,
    };
  });

  return report;
};
