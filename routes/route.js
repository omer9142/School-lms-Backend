//IMPORTS

const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware.js');
const upload = require('../middleware/multerCloudinary.js');
const studentController = require('../controllers/student_controller.js');
const Student = require('../models/studentSchema.js'); 
const { markClassAttendance, getClassAttendance, getStudentAttendance } = require('../controllers/attendanceController.js');

const { 
  adminRegister, adminLogIn, getAdminDetail 
} = require('../controllers/admin-controller.js');

const { 
  sclassCreate, sclassList, deleteSclass, deleteSclasses, getSclassDetail, getSclassStudents 
} = require('../controllers/class-controller.js');

const { 
  complainCreate, complainList 
} = require('../controllers/complain-controller.js');

const { 
  noticeCreate, noticeList, deleteNotices, deleteNotice, updateNotice 
} = require('../controllers/notice-controller.js');

const {
  studentRegister,
  studentLogIn,
  getStudents,
  getStudentDetail,
  deleteStudents,
  deleteStudent,
  updateStudent,
  deleteStudentsByClass,
  updateExamResult,
  getStudentTimetable,

} = require('../controllers/student_controller.js');

const { 
  subjectCreate, classSubjects, deleteSubjectsByClass, getSubjectDetail, deleteSubject, freeSubjectList, allSubjects, deleteSubjects 
} = require('../controllers/subject-controller.js');

const { 
  teacherRegister, teacherLogIn, getTeachers, getTeacherDetail, deleteTeachersByClass, deleteTeacher, updateTeacherSubject, teacherAttendance, assignTeacherToClass, updateTeacher ,assignClassTeacher
} = require('../controllers/teacher-controller.js');

const {
  createHomework,
  getHomeworkByClass,
  getStudentHomework,
  submitHomework,
  getHomeworkByTeacher,
  updateHomework,
  deleteHomework
} = require('../controllers/homeworkController.js');  // Add your homework controller here

const { login } = require('../controllers/auth-controller.js');

const {
  addTimetableEntry,
  getClassTimetable,
  getTeacherTimetable,
  updateTimetableEntry,
  deleteTimetableEntry
} = require('../controllers/timetableController.js');



const { addMarks, getTeacherMarks, getStudentMarks, getSubjectMarks , updateMarks , deleteMarks } = require('../controllers/marksController.js');

//ROUTES

router.post('/Login', login); 

// Admin
router.post('/AdminReg', adminRegister);
router.post('/AdminLogin', adminLogIn);
router.get('/Admin/:id', verifyToken, requireRole(['Admin']), getAdminDetail);

// Student
router.post('/StudentReg', studentRegister);
// {
//   "name": "Areeba Ali",
//   "fatherName": "Junaid Ali",
//   "rollNum": 2,
//   "dob": "2011-05-12",
//   "phoneNumber": "03001234567",
//   "emergencyContact": "03112223344",
//   "address": "House #20, Street 7, Lahore",
//   "email": "areeba@example.com",
//   "password": "incorrect123",
//   "sclassName": "4B",
//   "adminID": "688ba11a44ed4cb740793e23"
// }


router.get("/Students/:id", getStudents);
router.get("/Student/:id", getStudentDetail);
router.delete("/Students/:id", deleteStudents);
router.delete("/StudentsClass/:id", deleteStudentsByClass);
router.delete("/Student/:id", deleteStudent);
router.put("/Student/:id", updateStudent);
router.put('/UpdateExamResult/:id', updateExamResult);
router.get('/Students', async (req, res) => {
  try {
    const students = await Student.find()
      .populate('sclassName', 'sclassName')
      .populate('school', 'schoolName')
      .lean();

    // remove password if it exists
    const safe = students.map(({ password, ...rest }) => rest);
    res.status(200).json(safe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/Timetable/student/:studentId", getStudentTimetable);


// Student profile image upload
router.post('/Student/:id/uploadProfile', upload.single('file'), studentController.profilePicture);

router.put(
  '/Student/:id/uploadProfile',
  upload.single('file'), // match frontend key
  studentController.profilePicture
);

// GET /Attendance/Student/:studentId
router.get('/Attendance/Student/:studentId', getStudentAttendance);

// Teacher
router.post('/TeacherReg', teacherRegister);
router.post('/TeacherLogin', teacherLogIn);
router.get("/Teachers/:id", getTeachers);
router.get("/Teacher/:id", getTeacherDetail);
router.delete("/Teacher/:id", deleteTeacher);
router.delete("/TeachersClass/:id", deleteTeachersByClass);
router.delete("/Teacher/:id", deleteTeacher);
router.put("/TeacherSubject", updateTeacherSubject);
router.post('/TeacherAttendance/:id', teacherAttendance);
router.put("/assign-class", assignTeacherToClass);
router.put("/Teacher/:id", updateTeacher); 
router.post("/assign-class-teacher", assignClassTeacher);


//attendance
router.post("/Attendance/Mark", markClassAttendance);
router.get("/Attendance/:sclassId", getClassAttendance);

// Notice
router.post('/NoticeCreate', noticeCreate);
router.get('/NoticeList/:id', noticeList);
router.delete("/Notices/:id", deleteNotices);
router.delete("/Notice/:id", deleteNotice);
router.put("/Notice/:id", updateNotice);

// Complain
router.post('/ComplainCreate', complainCreate);
router.get('/ComplainList/:id', complainList);

// Sclass
router.post('/SclassCreate', sclassCreate);
router.get('/SclassList/:id', sclassList);
router.get("/Sclass/:id", getSclassDetail);
router.get("/Sclass/Students/:id", getSclassStudents);
router.delete("/Sclasses/:id", deleteSclasses);
router.delete("/Sclass/:id", deleteSclass);

// Subject
router.post('/SubjectCreate', subjectCreate);
router.get('/AllSubjects/:id', allSubjects);
router.get('/ClassSubjects/:id', classSubjects);
router.get('/FreeSubjectList/:id', freeSubjectList);
router.get("/Subject/:id", getSubjectDetail);
router.delete("/Subject/:id", deleteSubject);
router.delete("/Subjects/:id", deleteSubjects);
router.delete("/SubjectsClass/:id", deleteSubjectsByClass);


//timetable routes
router.post("/timetable", addTimetableEntry); // add
router.get("/timetable/class/:classId", getClassTimetable); // get by class
router.get("/timetable/teacher/:teacherId", getTeacherTimetable); // get by teacher
router.put("/:id", updateTimetableEntry); // update
router.delete("/:id", deleteTimetableEntry); // delete


//Marks routes
// Add marks (teacher only)
router.post("/marks/add", addMarks);
router.get("/marks/teacher/:teacherId", getTeacherMarks);
router.get("/marks/student/:studentId", getStudentMarks);
router.get("/marks/subject/:subjectId", getSubjectMarks);
router.put("/marks/:id", updateMarks);
router.delete("/marks/:id", deleteMarks);


// Homework (added without auth for now)
router.post('/Homework', createHomework);               // Create new homework
router.get('/Homework/Class/:classId', getHomeworkByClass);   // Get homework for a class
router.get('/Homework/Student', getStudentHomework);          // Get homework for logged-in student (you can later add auth)
router.post('/Homework/Submit/:homeworkId', submitHomework);  // Submit homework
router.get('/Homework/Teacher', getHomeworkByTeacher);        // Get homework for teacher
router.put('/Homework/:homeworkId', updateHomework);          // Update homework
router.delete('/Homework/:homeworkId', deleteHomework);       // Delete homework

module.exports = router;
