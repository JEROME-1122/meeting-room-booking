const Booking = require("../models/bookingModel");
const Room = require("../models/roomModel");
const Idempotency = require("../models/idempotencyModel");

const mongoose = require("mongoose");

exports.createBooking = async (data, idempotencyKey) => {
  try {
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
        message: "Booking outside working hours",
      };

    const room = await Room.findById(roomId);
    if (!room) throw { status: 404, message: "Room not found" };

    if (idempotencyKey) {
      const idem = await Idempotency.findOne({
        key: idempotencyKey,
        organizerEmail,
      });

      if (idem) {
        if (idem.status === "completed") return idem.response;
        throw { status: 409, message: "Request in progress" };
      }

      await Idempotency.create({
        key: idempotencyKey,
        organizerEmail,
        status: "in-progress",
      });
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
  } catch (err) {
  
    if (idempotencyKey) {
      await Idempotency.deleteOne({
        key: idempotencyKey,
        organizerEmail: data.organizerEmail,
      });
    }

    throw err;
  }
};

exports.cancelBooking = async (id) => {
   
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { status: 400, message: "Invalid bookingId" };
  }

  const booking = await Booking.findById(id);
  if (!booking) throw { status: 404, message: "Booking not found" };

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

    let totalBookedHours = 0;

    roomBookings.forEach((b) => {
      const overlapStart = new Date(Math.max(b.startTime, start));
      const overlapEnd = new Date(Math.min(b.endTime, end));

      if (overlapStart < overlapEnd) {
        totalBookedHours += (overlapEnd - overlapStart) / (1000 * 60 * 60);
      }
    });

    let totalBusinessHours = 0;
    let current = new Date(start);

    while (current < end) {
      const day = current.getDay();

      if (day >= 1 && day <= 5) {
        const dayStart = new Date(current);
        dayStart.setHours(8, 0, 0, 0);

        const dayEnd = new Date(current);
        dayEnd.setHours(20, 0, 0, 0);

        const overlapStart = new Date(Math.max(dayStart, start));
        const overlapEnd = new Date(Math.min(dayEnd, end));

        if (overlapStart < overlapEnd) {
          totalBusinessHours += (overlapEnd - overlapStart) / (1000 * 60 * 60);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return {
      roomId: room._id,
      roomName: room.name,
      totalBookingHours: +totalBookedHours.toFixed(2),
      utilizationPercent: totalBusinessHours
        ? +((totalBookedHours / totalBusinessHours) * 100).toFixed(2)
        : 0,
    };
  });

  return report;
};
