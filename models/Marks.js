const mongoose = require("mongoose");

const marksSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",  // lowercase to match your Student model
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",  // lowercase to match your Teacher model
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subject",  // lowercase to match your Subject model
      required: true,
    },
    assessmentType: {
      type: String,
      enum: ["Test", "Quiz", "Mid Term", "Final", "Other"],
      default: "Other",
    },
    topic: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    obtainedMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("marks", marksSchema); // lowercase "marks"
