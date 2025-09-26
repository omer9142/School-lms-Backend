const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  profileImage: {
    public_id: String,
    url: String,
  },
  name: { type: String, required: true },
  fatherName: { type: String },
  dob: { type: Date },
  phoneNumber: { type: String },
  emergencyContact: { type: String },
  address: { type: String },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "Teacher" },

  school: { type: mongoose.Schema.Types.ObjectId, ref: "admin", required: true },

  // Subjects/classes this teacher teaches (subject-teacher role)
  teachSubject: [{ type: mongoose.Schema.Types.ObjectId, ref: "subject", default: [] }],
  teachSclass: [{ type: mongoose.Schema.Types.ObjectId, ref: "sclass", default: [] }],

  // NEW: homeroom/class-teacher assignment (one class for MVP)
  classTeacherOf: { type: mongoose.Schema.Types.ObjectId, ref: "sclass", default: null },

  // LEGACY (subject-based) attendance — keep for now so nothing breaks; stop writing new data here.
  attendance: [
    {
      date: { type: Date, required: true },
      presentCount: String,
      absentCount: String,
    },
  ],
}, { timestamps: true });

/**
 * Optional but recommended:
 * Ensure only one class-teacher per class (within a school).
 * Partial index allows many teachers with null classTeacherOf.
 */
teacherSchema.index(
  { school: 1, classTeacherOf: 1 },
  { unique: true, partialFilterExpression: { classTeacherOf: { $type: "objectId" } } }
);

module.exports = mongoose.model("teacher", teacherSchema);
