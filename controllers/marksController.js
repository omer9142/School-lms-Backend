const Marks = require("../models/Marks.js");
const Student = require("../models/studentSchema.js");
const Subject = require("../models/subjectSchema.js");

// Add marks (no change)
const addMarks = async (req, res) => {
  try {
    const { studentId, subjectId, teacherId, assessmentType, topic, date, obtainedMarks, totalMarks } = req.body;

    if (!teacherId) return res.status(400).json({ message: "Teacher ID is required" });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const Teacher = require("../models/teacherSchema.js");
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const newMarks = new Marks({
      studentId,
      teacherId,
      subjectId,
      assessmentType: assessmentType || "Other",
      topic,
      date: date || new Date(),
      obtainedMarks,
      totalMarks,
    });

    await newMarks.save();

    res.status(201).json({ message: "Marks added successfully", marks: newMarks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add marks", error: error.message });
  }
};

// Get all marks for a teacher
// Get all marks for a teacher
const getTeacherMarks = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!teacherId) return res.status(400).json({ message: "Teacher ID is required" });

    const marks = await Marks.find({ teacherId })
      .populate({
        path: "studentId",
        select: "name rollNum sclassName",
        populate: { path: "sclassName", select: "sclassName" } // populate the class name
      })
      .populate("subjectId", "subName")
      .populate("teacherId", "name");

    res.status(200).json(marks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch marks" });
  }
};

// Get marks for a specific student
const getStudentMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ message: "Student ID is required" });

    const marks = await Marks.find({ studentId })
      .populate({
        path: "studentId",
        select: "name rollNum sclassName",
        populate: { path: "sclassName", select: "sclassName" }
      })
      .populate("subjectId", "subName")
      .populate("teacherId", "name");

    res.status(200).json(marks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch student marks" });
  }
};

// Get marks by subject
const getSubjectMarks = async (req, res) => {
  try {
    const { subjectId } = req.params;
    if (!subjectId) return res.status(400).json({ message: "Subject ID is required" });

    const marks = await Marks.find({ subjectId })
      .populate({
        path: "studentId",
        select: "name rollNum sclassName",
        populate: { path: "sclassName", select: "sclassName" }
      })
      .populate("teacherId", "name");

    res.status(200).json(marks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch subject marks" });
  }
};

// Update marks
const updateMarks = async (req, res) => {
  try {
    const { id } = req.params;
    const { obtainedMarks, totalMarks, topic, assessmentType, date } = req.body;

    const updatedMarks = await Marks.findByIdAndUpdate(
      id,
      { obtainedMarks, totalMarks, topic, assessmentType, date },
      { new: true }
    )
      .populate({
        path: "studentId",
        select: "name rollNum sclassName",
        populate: { path: "sclassName", select: "sclassName" }
      })
      .populate("subjectId", "subName")
      .populate("teacherId", "name");

    if (!updatedMarks) return res.status(404).json({ message: "Marks record not found" });

    res.status(200).json(updatedMarks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update marks" });
  }
};


// Delete marks (no change)
const deleteMarks = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMarks = await Marks.findByIdAndDelete(id);

    if (!deletedMarks) return res.status(404).json({ message: "Marks record not found" });

    res.status(200).json({ message: "Marks record deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete marks" });
  }
};

module.exports = {
  addMarks,
  getTeacherMarks,
  getStudentMarks,
  getSubjectMarks,
  updateMarks,
  deleteMarks
};
