const bcrypt = require('bcrypt');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');
const Sclass = require('../models/sclassSchema.js');
const cloudinary = require('../utils/cloudinary');
const mongoose = require('mongoose');
const Timetable = require('../models/timetable.js');

const studentRegister = async (req, res) => {
  try {
    console.log('--- Student Registration Request ---');
    console.log('Request body:', { 
      ...req.body, 
      password: req.body.password ? '***PRESENT***' : '***MISSING***' 
    });

    // 1. Validate required fields
    const requiredFields = [
      'name',
      'fatherName',
      'email',
      'password',
      'rollNum',
      'dob',
      'phoneNumber',
      'emergencyContact',
      'address',
      'sclassName',
      'adminID'
    ];

    const missingFields = requiredFields.filter(
      field => !req.body[field] || req.body[field].toString().trim() === ''
    );
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // 2. Validate password length
    if (req.body.password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(req.body.password, salt);

    // 4. Find the class (by ID or name)
    let sclass;
    if (mongoose.Types.ObjectId.isValid(req.body.sclassName)) {
      sclass = await Sclass.findById(req.body.sclassName);
    } else {
      sclass = await Sclass.findOne({ 
        sclassName: req.body.sclassName, 
        school: req.body.adminID 
      });
    }

    if (!sclass) {
      return res.status(400).json({ 
        message: "Class not found. Please check class name." 
      });
    }

    // 5. Check roll number uniqueness in same class
    const existingStudent = await Student.findOne({ 
      rollNum: req.body.rollNum, 
      school: req.body.adminID, 
      sclassName: sclass._id 
    });
    if (existingStudent) {
      return res.status(400).json({ 
        message: 'Roll Number already exists in this class' 
      });
    }

    // 6. Check email uniqueness
    const emailExists = await Student.findOne({ email: req.body.email });
    if (emailExists) {
      return res.status(400).json({ 
        message: 'Email already exists' 
      });
    }

    // 7. Build student object
    const studentData = {
      name: req.body.name.trim(),
      fatherName: req.body.fatherName.trim(),
      rollNum: parseInt(req.body.rollNum),
      dob: new Date(req.body.dob),
      phoneNumber: req.body.phoneNumber.trim(),
      emergencyContact: req.body.emergencyContact.trim(),
      address: req.body.address.trim(),
      email: req.body.email.trim(),
      password: hashedPass,
      sclassName: sclass._id,
      school: req.body.adminID,
    };

    // 8. Save student
    const student = new Student(studentData);
    let result = await student.save();

    // 9. Populate related fields
    result = await Student.findById(result._id)
      .populate("school", "schoolName")
      .populate("sclassName", "sclassName");

    // Hide password
    result.password = undefined;

    console.log('✅ Student created successfully');
    return res.status(201).json(result);

  } catch (error) {
    console.error('❌ Student registration error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ 
        message: `${field} already exists` 
      });
    }

    return res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message 
    });
  }
};

// Cloudinary upload for profile image
const profilePicture = async (req, res) => {
  try {
    const studentId = req.params.id;

    console.log('--- profilePicture called ---');
    console.log('Student ID:', studentId);
    console.log('File received:', !!req.file);

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get student first
    const existingStudent = await Student.findById(studentId);
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Delete old image if exists
    if (existingStudent.profileImage && existingStudent.profileImage.public_id) {
      try {
        await cloudinary.uploader.destroy(existingStudent.profileImage.public_id);
        console.log('✅ Old image deleted from Cloudinary');
      } catch (deleteError) {
        console.error('⚠️ Error deleting old image:', deleteError);
      }
    } else {
      console.log('📝 No existing image to delete (first upload)');
    }

    // Save new image details
    const publicId = req.file.filename;
    const url = req.file.path;

    // Update student with new image
    const student = await Student.findByIdAndUpdate(
      studentId,
      { 
        profileImage: { 
          public_id: publicId, 
          url: url 
        } 
      },
      { new: true }
    ).select('-password')
     .populate("school", "schoolName")
     .populate("sclassName", "sclassName");

    console.log('✅ Profile image saved successfully');
    
    res.json({ 
      message: 'Profile image uploaded successfully', 
      student,
      isUpdate: !!existingStudent.profileImage
    });

  } catch (error) {
    console.error('❌ Profile picture error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

const studentLogIn = async (req, res) => {
    try {
        let student = await Student.findOne({ 
            rollNum: req.body.rollNum, 
            name: req.body.studentName 
        });
        
        if (student) {
            const validated = await bcrypt.compare(req.body.password, student.password);
            if (validated) {
                student = await student.populate("school", "schoolName");
                student = await student.populate("sclassName", "sclassName");
                student.password = undefined;
                student.examResult = undefined;
                student.attendance = undefined;
                res.json(student);
            } else {
                res.status(400).json({ message: "Invalid password" });
            }
        } else {
            res.status(404).json({ message: "Student not found" });
        }
    } catch (error) {
        console.error('Student login error:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
};

const getStudents = async (req, res) => {
    try {
        let students = await Student.find({ school: req.params.id })
            .populate("sclassName", "sclassName")
            .populate("school", "schoolName");

        if (students.length > 0) {
            let modifiedStudents = students.map((student) => {
                return { ...student._doc, password: undefined };
            });
            res.json(modifiedStudents);
        } else {
            res.status(404).json({ message: "No students found" });
        }
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getStudentDetail = async (req, res) => {
    try {
        let student = await Student.findById(req.params.id)
            .populate("school", "schoolName")
            .populate("sclassName", "sclassName")
            .populate("examResult.subName", "subName")
            .populate("attendance.subName", "subName sessions");
            
        if (student) {
            student.password = undefined;
            res.json(student);
        } else {
            res.status(404).json({ message: "No student found" });
        }
    } catch (error) {
        console.error('Get student detail error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const result = await Student.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.json({ message: "Student deleted successfully", result });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteStudents = async (req, res) => {
    try {
        const result = await Student.deleteMany({ school: req.params.id });
        if (result.deletedCount === 0) {
            res.status(404).json({ message: "No students found to delete" });
        } else {
            res.json({ message: `${result.deletedCount} students deleted`, result });
        }
    } catch (error) {
        console.error('Delete students error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteStudentsByClass = async (req, res) => {
    try {
        const result = await Student.deleteMany({ sclassName: req.params.id });
        if (result.deletedCount === 0) {
            res.status(404).json({ message: "No students found to delete" });
        } else {
            res.json({ message: `${result.deletedCount} students deleted from class`, result });
        }
    } catch (error) {
        console.error('Delete students by class error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// FIXED: Updated student function with better class handling
const updateStudent = async (req, res) => {
    try {
        console.log('Update student request body:', req.body);

        // Hash password if provided
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);
        }

        // Handle class assignment - support both ObjectId and class name
        if (req.body.sclassName) {
            let classId;
            
            // Check if it's already a valid ObjectId
            if (mongoose.Types.ObjectId.isValid(req.body.sclassName)) {
                // If it's already an ObjectId, verify it exists
                const existingClass = await Sclass.findById(req.body.sclassName);
                if (!existingClass) {
                    return res.status(400).json({ message: "Class not found with provided ID" });
                }
                classId = req.body.sclassName;
            } else {
                // If it's a class name, find the class by name
                const sclass = await Sclass.findOne({
                    sclassName: req.body.sclassName,
                    school: req.body.adminID || req.body.school
                });

                if (!sclass) {
                    return res.status(400).json({ message: "Class not found. Please check class name." });
                }
                classId = sclass._id;
            }

            req.body.sclassName = classId;
        }

        // Check for duplicate roll number in the same school/class
        if (req.body.rollNum) {
            const existingStudent = await Student.findOne({
                rollNum: req.body.rollNum,
                school: req.body.school || req.body.adminID,
                sclassName: req.body.sclassName,
                _id: { $ne: req.params.id } // Exclude current student
            });

            if (existingStudent) {
                return res.status(400).json({ message: "Roll number already exists in this class" });
            }
        }

        // Check for duplicate email
        if (req.body.email) {
            const existingEmail = await Student.findOne({
                email: req.body.email,
                _id: { $ne: req.params.id } // Exclude current student
            });

            if (existingEmail) {
                return res.status(400).json({ message: "Email already exists" });
            }
        }

        let result = await Student.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate("school", "schoolName")
         .populate("sclassName", "sclassName");

        if (!result) {
            return res.status(404).json({ message: "Student not found" });
        }

        result.password = undefined;
        res.json({ message: "Student updated successfully", student: result });
        
    } catch (error) {
        console.error('Update student error:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: Object.values(error.errors).map(e => e.message) 
            });
        }
        
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid ID format' });
        }
        
        res.status(500).json({ message: 'Server error during update', error: error.message });
    }
};

const updateExamResult = async (req, res) => {
    const { subName, marksObtained } = req.body;

    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const existingResult = student.examResult.find(
            (result) => result.subName.toString() === subName
        );

        if (existingResult) {
            existingResult.marksObtained = marksObtained;
        } else {
            student.examResult.push({ subName, marksObtained });
        }

        const result = await student.save();
        res.json({ message: 'Exam result updated successfully', student: result });
    } catch (error) {
        console.error('Update exam result error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getStudentTimetable = async (req, res) => {
  try {
    const { studentId } = req.params; // student id

    console.log("Fetching timetable for student:", studentId); // Changed from 'id' to 'studentId'
    console.log("Received student ID:", studentId); // Changed from 'id' to 'studentId'
    console.log("ID type:", typeof studentId); // Changed from 'id' to 'studentId'
    console.log("Is valid ObjectId?", mongoose.Types.ObjectId.isValid(studentId)); // Changed from 'id' to 'studentId'

    // Find the student first
    const student = await Student.findById(studentId); // Changed from 'StudentId' to 'studentId'
    console.log("Student found:", !!student);
    
    if (student) {
      console.log("Student details:", {
        name: student.name,
        sclassName: student.sclassName,
        email: student.email
      });
    }

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    console.log("Student found, class ID:", student.sclassName);

    // Rest of your code remains the same...
    const timetable = await Timetable.find({ 
      classId: new mongoose.Types.ObjectId(student.sclassName) 
    }).lean();

    if (!timetable || timetable.length === 0) {
      console.log("No timetable found for class");
      return res.status(200).json([]);
    }

    const timetableWithSubjects = await Promise.all(
      timetable.map(async (entry) => {
        try {
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

    console.log("Timetable with subjects:", timetableWithSubjects);
    res.status(200).json(timetableWithSubjects);
  } catch (error) {
    console.error("Error fetching student timetable:", error);
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
    studentRegister,
    studentLogIn,
    getStudents,
    getStudentDetail,
    deleteStudents,
    deleteStudent,
    updateStudent,
    deleteStudentsByClass,
    updateExamResult,
    profilePicture,
    getStudentTimetable,
};