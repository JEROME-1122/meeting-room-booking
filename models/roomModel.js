const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    floor: {
      type: Number,
    },
    amenities: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Room", roomSchema);
