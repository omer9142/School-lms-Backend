// controllers/auth-controller.js
const bcrypt = require('bcryptjs'); // bcryptjs is safe & compatible with bcrypt hashes
const jwt = require('jsonwebtoken');

const Admin = require('../models/adminSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Student = require('../models/studentSchema.js');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

const login = async (req, res) => {
  try {
    const { email, password, rollNum, studentName } = req.body;

    // Basic validation
    if (!password || (!email && !(rollNum && studentName))) {
      return res.status(400).json({ message: 'Provide password and either email OR rollNum+studentName' });
    }

    let user = null;
    let role = null;

    // Preferred flow: login by email (search priority: Admin > Teacher > Student)
    if (email) {
      user = await Admin.findOne({ email });
      if (user) role = 'Admin';
      else {
        user = await Teacher.findOne({ email });
        if (user) role = 'Teacher';
        else {
          user = await Student.findOne({ email });
          if (user) role = 'Student';
        }
      }
    } else {
      // Legacy student login using roll number + name
      user = await Student.findOne({ rollNum: rollNum, name: studentName });
      if (user) role = 'Student';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Populate useful relations depending on role (not heavy, just helpful for frontend)
    let populated;
    if (role === 'Student') {
      populated = await Student.findById(user._id)
        .populate('sclassName', 'sclassName')
        .populate('school', 'schoolName')
        .lean();
    } else if (role === 'Teacher') {
      populated = await Teacher.findById(user._id)
        .populate('teachSubject', 'subName sessions')
        .populate('teachSclass', 'sclassName')
        .populate('school', 'schoolName')
        .populate('classTeacherOf', 'sclassName') 
        .lean();
    } else { // Admin
      populated = await Admin.findById(user._id).select('-password').lean();
    }

    // sanitize (ensure password removed)
    delete populated.password;

    // token role uses lowercase for easy checks in server middleware
    const tokenRole = role.toLowerCase(); // 'admin' | 'teacher' | 'student'

    const token = jwt.sign(
      { id: populated._id || populated.id, role: tokenRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return normalized shape: message, token, role (capitalized), user object
    res.json({
      message: 'Login successful',
      token,
      role,          // "Admin" / "Teacher" / "Student" (frontend prefers this)
      user: populated
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login };
