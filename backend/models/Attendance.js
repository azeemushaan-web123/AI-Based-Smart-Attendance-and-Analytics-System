const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: String, required: true }, // "2026-11-08"
    status: { type: String, enum: ["present", "absent"], default: "present" },
    method: { type: String, default: "face" },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);