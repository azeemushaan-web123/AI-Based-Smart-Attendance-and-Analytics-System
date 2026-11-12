const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rollNo: { type: String, required: true, unique: true },
    course: { type: String },
    year: { type: Number },
    email: { type: String },
    faceEncoding: { type: [Number], default: [] }, // Python se aayega
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);