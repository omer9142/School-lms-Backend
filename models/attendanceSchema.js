// models/attendanceSchema.js
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "student",
    required: true,
  },
  sclass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "sclass",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Leave"],
    required: true,
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "teacher", // should always be the class teacher
    required: true,
  },
}, { timestamps: true });

/**
 * ✅ Prevent duplicate entries:
 * Only one record per student per class per day
 */
attendanceSchema.index(
  { student: 1, sclass: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("attendance", attendanceSchema);
