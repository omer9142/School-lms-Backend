// models/timetable.js
const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
    },
    periodNumber: {
      type: Number,
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: false,
    },
  },
  { timestamps: true }
);

// Prevent duplicate entries (same class, same day, same period)
timetableSchema.index(
  { school: 1, classId: 1, day: 1, periodNumber: 1 },
  { unique: true }
);

const Timetable = mongoose.model("Timetable", timetableSchema);
module.exports = Timetable;  // ✅ CommonJS export
