// controllers/timetableController.js
const mongoose = require("mongoose");
const Timetable = require("../models/timetable.js");
const subject = require("../models/subjectSchema.js");
const Sclass = require("../models/sclassSchema.js");

// Add a timetable entry

const addTimetableEntry = async (req, res) => {
  try {
    const { entries, adminID } = req.body;

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ message: "Entries array required" });
    }

    const school = adminID;

    // Use bulkWrite for upsert operations
    const bulkOps = entries.map((e) => ({
      updateOne: {
        filter: {
          school: new mongoose.Types.ObjectId(school),
          classId: new mongoose.Types.ObjectId(e.classId),
          day: e.day,
          periodNumber: e.periodNumber
        },
        update: {
          $set: {
            subject: e.subject,
            teacherId: e.teacherId || null
          }
        },
        upsert: true // Insert if doesn't exist, update if exists
      }
    }));

    await Timetable.bulkWrite(bulkOps);

    res.status(201).json({ message: "Timetable saved successfully" });
  } catch (error) {
    console.error("Error saving timetable:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get timetable for a class
const getClassTimetable = async (req, res) => {
  try {
    const { classId } = req.params;

    console.log("Looking for timetable of class:", classId);

    // Get timetable entries
    const timetable = await Timetable.find({
      classId: new mongoose.Types.ObjectId(classId),
    }).lean();

    if (!timetable || timetable.length === 0) {
      console.log("No timetable found in DB");
      return res.status(200).json([]);
    }

    // Manually fetch subject names for each entry
    const timetableWithSubjects = await Promise.all(
      timetable.map(async (entry) => {
        try {
          // Fetch subject name using a direct query
          const subject = await mongoose.connection.db
            .collection('subjects')
            .findOne({ _id: new mongoose.Types.ObjectId(entry.subject) });
          
          return {
            ...entry,
            subjectName: subject ? subject.subName : 'Unknown Subject'
          };
        } catch (err) {
          return {
            ...entry,
            subjectName: 'Unknown Subject'
          };
        }
      })
    );

    res.status(200).json(timetableWithSubjects);
  } catch (error) {
    console.error("Error fetching timetable:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get timetable for a teacher
// Get timetable for a teacher
const getTeacherTimetable = async (req, res) => {
  try {
    const { teacherId } = req.params;

    console.log("Looking for timetable of teacher:", teacherId);

    // Get all timetable entries
    const timetable = await Timetable.find().lean();

    if (!timetable || timetable.length === 0) {
      console.log("No timetable found in DB");
      return res.status(200).json([]);
    }

    // Attach subject + class + filter by teacher
    const teacherTimetable = await Promise.all(
      timetable.map(async (entry) => {
        try {
          // Fetch subject
          const subject = await mongoose.connection.db
            .collection("subjects")
            .findOne({ _id: new mongoose.Types.ObjectId(entry.subject) });

          // Fetch class
          const sclass = await mongoose.connection.db
            .collection("sclasses") // 👈 make sure collection name matches your DB
            .findOne({ _id: new mongoose.Types.ObjectId(entry.classId) });

          if (subject && subject.teacher?.toString() === teacherId) {
            return {
              ...entry,
              subjectName: subject.subName,
              teacherId: subject.teacher,
              classId: sclass
                ? { _id: sclass._id, sclassName: sclass.sclassName }
                : null,
            };
          } else {
            return null;
          }
        } catch (err) {
          console.error("Error attaching subject/class:", err);
          return null;
        }
      })
    );

    // Remove nulls
    const filtered = teacherTimetable.filter((e) => e !== null);

    res.status(200).json(filtered);
  } catch (error) {
    console.error("Error fetching teacher timetable:", error);
    res.status(500).json({ message: error.message });
  }
};



// Update timetable entry
const updateTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Timetable.findByIdAndUpdate(id, req.body, {
      new: true,
    }).lean();

    if (!updated) {
      return res.send({ message: "Timetable entry not found" });
    }

    res.status(200).json({
      message: "Timetable updated",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete timetable entry
const deleteTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Timetable.findByIdAndDelete(id);

    if (!deleted) {
      return res.send({ message: "Timetable entry not found" });
    }

    res.status(200).json({ message: "Timetable entry deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addTimetableEntry,
  getClassTimetable,
  getTeacherTimetable,
  updateTimetableEntry,
  deleteTimetableEntry,
};