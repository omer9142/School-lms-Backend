const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

  profileImage: {
  public_id: String,
  url: String
},

  name: {
    type: String,
    required: true
  },
  fatherName: {
  type: String,
  required: true
},
  studentId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'STU-' + Date.now().toString().slice(-6)
  },
  rollNum: {
    type: Number,
    required: true
  },
  dob: {
  type: Date,
  required: true
},
phoneNumber: {
  type: String,
  required: true
},
emergencyContact: {
  type: String,
  required: true
},
address: {
  type: String,
  required: true
},
  email: {
    type: String,
    required: true,
    unique: true,
    match: /.+\@.+\..+/ // Simple email validation regex
  },
  password: {
    type: String,
    required: true
  },
  sclassName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sclass',
    required: true,
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'admin',
    required: true,
  },
  role: {
    type: String,
    default: "Student"
  },
  examResult: [
    {
      subName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'subject',
      },
      marksObtained: {
        type: Number,
        default: 0
      }
    }
  ],
  attendance: [{
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['Present', 'Absent'],
      required: true
    },
    subName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'subject',
      required: true
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model("student", studentSchema);
