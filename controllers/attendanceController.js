// controllers/attendanceController.js
const Attendance = require("../models/attendanceSchema");
const Student = require("../models/studentSchema");
const Teacher = require("../models/teacherSchema");

const markClassAttendance = async (req, res) => {
  try {
    const { teacherId, sclassId, date, records } = req.body;

    // 1. Verify teacher is class teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher || !teacher.classTeacherOf || teacher.classTeacherOf.toString() !== sclassId) {
      return res.status(403).json({ 
        message: "Only the class teacher can mark attendance for this class." 
      });
    }

    // 2. Ensure students belong to that class
    const students = await Student.find({ sclassName: sclassId }).select("_id");
    const studentIds = students.map(s => s._id.toString());
    
    for (const rec of records) {
      if (!studentIds.includes(rec.studentId)) {
        return res.status(400).json({ 
          message: `Student ${rec.studentId} does not belong to this class` 
        });
      }
    }

    // 3. Bulk upsert attendance records
    const ops = records.map(rec => ({
      updateOne: {
        filter: {
          student: rec.studentId,
          sclass: sclassId,
          date: new Date(date)
        },
        update: {
          student: rec.studentId,
          sclass: sclassId,
          date: new Date(date),
          status: rec.status,
          markedBy: teacherId,
        },
        upsert: true,
      }
    }));

    await Attendance.bulkWrite(ops);

    res.json({ message: "Attendance saved successfully" });
    
  } catch (err) {
    console.error("markClassAttendance error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get attendance by class & date
const getClassAttendance = async (req, res) => {
  try {
    const { sclassId } = req.params;
    const { date } = req.query;

    const query = { sclass: sclassId };
    if (date) {
      query.date = new Date(date);
    }

    const records = await Attendance.find(query)
      .populate("student", "name rollNo")
      .populate("markedBy", "name");

    res.json(records);
  } catch (err) {
    console.error("getClassAttendance error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;

    const records = await Attendance.find({ student: studentId })
      .select('date status -_id')    // Only return needed fields
      .sort({ date: 1 });

    res.json(records);
  } catch (err) {
    console.error("getStudentAttendance error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { markClassAttendance, getClassAttendance, getStudentAttendance };
