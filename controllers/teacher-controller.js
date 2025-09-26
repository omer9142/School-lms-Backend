const bcrypt = require('bcrypt');
const Teacher = require('../models/teacherSchema.js');
const Subject = require('../models/subjectSchema.js');
const Admin = require('../models/adminSchema.js');

const teacherRegister = async (req, res) => {
    try {
        console.log("Teacher registration request body:", req.body);
        
        const { 
  name, email, password, role, adminID, 
  teachSubject, teachSclass, 
  dob, fatherName, address, phoneNumber, emergencyContact 
} = req.body;

        
        // Get school from admin (same fix as class creation)
        let schoolReference = null;
        if (adminID) {
            const admin = await Admin.findById(adminID);
            if (!admin) {
                return res.status(404).send({ message: 'Admin not found' });
            }
            if (!admin.schoolName) {
                return res.status(400).send({ message: 'Admin does not have a school assigned' });
            }
            schoolReference = admin._id; // Use admin ID as school reference
        } else {
            return res.status(400).send({ message: 'Admin ID is required' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Handle teachSclass as array properly
        let teachSclassArray = [];
        if (teachSclass) {
            if (typeof teachSclass === 'string') {
                teachSclassArray = [teachSclass];
            } 
            else if (Array.isArray(teachSclass)) {
                teachSclassArray = teachSclass;
            }
        }

        // Handle teachSubject as array properly  
        let teachSubjectArray = [];
        if (teachSubject) {
            if (typeof teachSubject === 'string') {
                teachSubjectArray = [teachSubject];
            }
            else if (Array.isArray(teachSubject)) {
                teachSubjectArray = teachSubject;
            }
        }

        console.log("Creating teacher with processed data:", {
            name, email, role,
            school: schoolReference,
            teachSclass: teachSclassArray,
            teachSubject: teachSubjectArray
        });

        const teacher = new Teacher({ 
  name, 
  email, 
  password: hashedPass, 
  role, 
  school: schoolReference,
  dob,
  fatherName,
  address,
  phoneNumber,
  emergencyContact,
  teachSclass: teachSclassArray,
  teachSubject: teachSubjectArray
});


        const existingTeacherByEmail = await Teacher.findOne({ email });

        if (existingTeacherByEmail) {
            return res.send({ message: 'Email already exists' });
        }

        let result = await teacher.save();
        console.log("Teacher created successfully:", result);
        
        // Update subjects with teacher reference (if any subjects assigned)
        if (teachSubjectArray.length > 0) {
            for (const subjectId of teachSubjectArray) {
                await Subject.findByIdAndUpdate(subjectId, { teacher: teacher._id });
            }
        }
        
        result.password = undefined;
        res.send(result);
        
    } catch (err) {
        console.error("teacherRegister error:", err);
        res.status(500).json({ error: err.message });
    }
};

const teacherLogIn = async (req, res) => {
    try {
        let teacher = await Teacher.findOne({ email: req.body.email });
        if (teacher) {
            const validated = await bcrypt.compare(req.body.password, teacher.password);
            if (validated) {
                teacher = await teacher.populate("teachSubject", "subName sessions")
                teacher = await teacher.populate("school", "schoolName")
                teacher = await teacher.populate("teachSclass", "sclassName")
                teacher.password = undefined;
                res.send(teacher);
            } else {
                res.send({ message: "Invalid password" });
            }
        } else {
            res.send({ message: "Teacher not found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getTeachers = async (req, res) => {
    try {
        let teachers = await Teacher.find({ school: req.params.id })
            .populate("teachSubject", "subName")
            .populate("teachSclass", "sclassName");
        if (teachers.length > 0) {
            let modifiedTeachers = teachers.map((teacher) => {
                return { ...teacher._doc, password: undefined };
            });
            res.send(modifiedTeachers);
        } else {
            res.send({ message: "No teachers found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getTeacherDetail = async (req, res) => {
  try {
    let teacher = await Teacher.findById(req.params.id)
      .populate({
        path: "teachSubject",
        select: "subName subCode sessions sclassName",
        populate: {
          path: "sclassName",
          select: "sclassName",
        },
      })
      .populate("school", "schoolName")
      .populate("teachSclass", "sclassName");

    if (teacher) {
      teacher.password = undefined;
      res.send(teacher);
    } else {
      res.send({ message: "No teacher found" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

const assignTeacherToClass = async (req, res) => {
    const { teacherId, sclassId } = req.body;
    try {
        console.log("Assigning teacher:", teacherId, "to class:", sclassId);
        
        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        console.log("Teacher found:", teacher);
        console.log("Teacher's current classes:", teacher.teachSclass);

        // Ensure teachSclass is an array before using .some()
        if (!teacher.teachSclass) {
            teacher.teachSclass = [];
        }

        // Check if teacher is already assigned to this class
        const isAlreadyAssigned = teacher.teachSclass.some(id => 
            id && id.toString() === sclassId
        );

        if (!isAlreadyAssigned) {
            teacher.teachSclass.push(sclassId);
            console.log("Added class to teacher");
        } else {
            console.log("Teacher already assigned to this class");
        }

        const savedTeacher = await teacher.save();
        console.log("Teacher saved:", savedTeacher);
        
        res.json({ message: "Teacher assigned to class successfully", teacher: savedTeacher });
    } catch (error) {
        console.error("assignTeacherToClass error:", error);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
};

const updateTeacherSubject = async (req, res) => {
  const { teacherId, subjectId } = req.body;

  try {
    const subject = await Subject.findById(subjectId).select('sclass');
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Append subject to teacher.teachSubject and ensure the teacher has the subject's class in teachSclass
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        $addToSet: {
          teachSubject: subjectId,
          teachSclass: subject.sclass,
        },
      },
      { new: true }
    )
      .populate('teachSclass', 'sclassName')
      .populate('teachSubject', 'subName sessions sclass');

    // Mark the subject as assigned to this teacher
    await Subject.findByIdAndUpdate(subjectId, { teacher: updatedTeacher._id });

    res.json(updatedTeacher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update teacher subject', error: error.message });
  }
};

const deleteTeacher = async (req, res) => {
    try {
        const teacherId = req.params.id;

        // Delete teacher
        const deletedTeacher = await Teacher.findByIdAndDelete(teacherId);
        if (!deletedTeacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        // Unset teacher from any subject that referenced them
        await Subject.updateMany(
            { teacher: teacherId },
            { $unset: { teacher: "" } }
        );

        res.send({ message: "Teacher deleted successfully", deletedTeacher });
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteTeachersByClass = async (req, res) => {
    try {
        const deletionResult = await Teacher.deleteMany({ sclassName: req.params.id });

        const deletedCount = deletionResult.deletedCount || 0;

        if (deletedCount === 0) {
            res.send({ message: "No teachers found to delete" });
            return;
        }

        const deletedTeachers = await Teacher.find({ sclassName: req.params.id });

        await Subject.updateMany(
            { teacher: { $in: deletedTeachers.map(teacher => teacher._id) }, teacher: { $exists: true } },
            { $unset: { teacher: "" }, $unset: { teacher: null } }
        );

        res.send(deletionResult);
    } catch (error) {
        res.status(500).json(error);
    }
};

const updateTeacher = async (req, res) => {
  const teacherId = req.params.id;
  const { name, email, phoneNumber, address, emergencyContact } = req.body;

  try {
    // Fetch teacher first
    let teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Ensure all fields exist and update only provided fields
    teacher.name = name !== undefined ? name : teacher.name;
    teacher.email = email !== undefined ? email : teacher.email;
    teacher.phoneNumber = phoneNumber !== undefined ? phoneNumber : teacher.phoneNumber || '';
    teacher.address = address !== undefined ? address : teacher.address || '';
    teacher.emergencyContact = emergencyContact !== undefined ? emergencyContact : teacher.emergencyContact || '';

    const updatedTeacher = await teacher.save();

    // Remove sensitive info before sending
    updatedTeacher.password = undefined;

    res.json(updatedTeacher);
  } catch (err) {
    console.error('updateTeacher error:', err);
    res.status(500).json({ message: 'Failed to update teacher', error: err.message });
  }
};



const teacherAttendance = async (req, res) => {
    const { status, date } = req.body;

    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.send({ message: 'Teacher not found' });
        }

        const existingAttendance = teacher.attendance.find(
            (a) =>
                a.date.toDateString() === new Date(date).toDateString()
        );

        if (existingAttendance) {
            existingAttendance.status = status;
        } else {
            teacher.attendance.push({ date, status });
        }

        const result = await teacher.save();
        return res.send(result);
    } catch (error) {
        res.status(500).json(error)
    }
};

const assignClassTeacher = async (req, res) => {
  const { teacherId, sclassId } = req.body;

  try {
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    teacher.classTeacherOf = sclassId; // make this teacher the class teacher
    await teacher.save();

    const updatedTeacher = await Teacher.findById(teacherId)
      .populate("classTeacherOf", "sclassName");

    res.json({
      message: "Teacher assigned as class teacher successfully",
      teacher: updatedTeacher
    });
  }
    catch (error) {
    // Handle duplicate key error (E11000)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "A class teacher is already assigned to this class.",
      });
    }

    res.status(500).json({
      message: error.message || "Something went wrong while assigning class teacher",
    });
  }
};


module.exports = {
    teacherRegister,
    teacherLogIn,
    getTeachers,
    getTeacherDetail,
    updateTeacherSubject,
    deleteTeacher,
    deleteTeachersByClass,
    teacherAttendance,
    assignTeacherToClass,
    updateTeacher,
    assignClassTeacher,
};