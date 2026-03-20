const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    floor: Number,
    amenities: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Room", roomSchema);
