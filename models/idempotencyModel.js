const mongoose = require("mongoose");

const idempotencySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    organizerEmail: { type: String, required: true },
    response: Object,
    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },
  },
  { timestamps: true },
);

idempotencySchema.index({ key: 1, organizerEmail: 1 }, { unique: true });

module.exports = mongoose.model("Idempotency", idempotencySchema);
