const Room = require("../models/roomModel");

exports.createRoom = async (data) => {
  const { name, capacity } = data;
  if (!name || capacity < 1)
    throw { status: 400, message: "Invalid room data" };

  try {
    const room = await Room.create(data);
    return room;
  } catch (err) {
    if (err.code === 11000)
      throw { status: 409, message: "Room name must be unique" };
    throw err;
  }
};

exports.listRooms = async (query) => {
  const filter = {};
  if (query.minCapacity) filter.capacity = { $gte: Number(query.minCapacity) };
  if (query.amenity) filter.amenities = query.amenity;
  return await Room.find(filter);
};
