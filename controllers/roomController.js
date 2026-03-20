const roomService = require("../services/roomService");

exports.createRoom = async (req, res) => {
  try {
    const room = await roomService.createRoom(req.body);
    res.status(201).json(room);
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.name || "Error",
      message: err.message,
    });
  }
};

exports.listRooms = async (req, res) => {
  const rooms = await roomService.listRooms(req.query);
  res.json(rooms);
};
