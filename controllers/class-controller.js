const Sclass = require('../models/sclassSchema.js');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Admin = require('../models/adminSchema.js'); // ✅ Added missing Admin import

const sclassCreate = async (req, res) => {
    try {
        // 🔍 Debug: Log what we're receiving
        console.log("Request body:", req.body);
        console.log("AdminID received:", req.body.adminID);
        
        // ✅ First, fetch the admin to get their school reference
        const admin = await Admin.findById(req.body.adminID);
        console.log("Admin found:", admin);
        
        if (!admin) {
            console.log("❌ Admin not found with ID:", req.body.adminID);
            return res.status(404).send({ message: 'Admin not found' });
        }
        
        console.log("Admin's school:", admin.school);
        console.log("Admin's schoolName:", admin.schoolName);
        
        // Since you don't have a separate school schema, use the admin's ID as school reference
        // This matches what was working from the backend before
        if (!admin.schoolName) {
            console.log("❌ Admin has no school assigned");
            return res.status(400).send({ message: 'Admin does not have a school assigned' });
        }

        // Use admin._id as the school reference (like it was working before)
        const schoolReference = admin._id;
        
        // ✅ Check if class name already exists for the same admin
        const existingSclassByName = await Sclass.findOne({
            sclassName: req.body.sclassName,
            school: schoolReference
        });

        if (existingSclassByName) {
            console.log("❌ Class name already exists:", req.body.sclassName);
            return res.send({ message: 'Sorry this class name already exists' });
        }

        // ✅ Create new class with admin ID as school reference
        const sclass = new Sclass({
            sclassName: req.body.sclassName,
            school: schoolReference // This will be the admin's _id
        });

        console.log("Creating class:", sclass);
        const result = await sclass.save();
        console.log("✅ Class created successfully:", result);
        res.send(result);

    } catch (err) {
        console.error("❌ sclassCreate error:", err);
        res.status(500).json({ error: err.message });
    }
};

const sclassList = async (req, res) => {
    try {
        let sclasses = await Sclass.find({ school: req.params.id })
        if (sclasses.length > 0) {
            res.send(sclasses)
        } else {
            res.send({ message: "No sclasses found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const getSclassDetail = async (req, res) => {
  try {
    let sclass = await Sclass.findById(req.params.id)
      .populate("school", "schoolName");

    if (!sclass) {
      return res.send({ message: "No class found" });
    }

    // 🔑 Fetch teachers assigned to this class
    const teachers = await Teacher.find({ teachSclass: req.params.id })
      .select("name email");

    // Attach teachers to the response
    const sclassWithTeachers = {
      ...sclass.toObject(),
      teachers,
    };

    res.send(sclassWithTeachers);
  } catch (err) {
    res.status(500).json(err);
  }
};


const getSclassStudents = async (req, res) => {
    try {
        let students = await Student.find({ sclassName: req.params.id })
        if (students.length > 0) {
            let modifiedStudents = students.map((student) => {
                return { ...student._doc, password: undefined };
            });
            res.send(modifiedStudents);
        } else {
            res.send({ message: "No students found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

const deleteSclass = async (req, res) => {
    try {
        const deletedClass = await Sclass.findByIdAndDelete(req.params.id);
        if (!deletedClass) {
            return res.send({ message: "Class not found" });
        }
        const deletedStudents = await Student.deleteMany({ sclassName: req.params.id });
        const deletedSubjects = await Subject.deleteMany({ sclassName: req.params.id });
        const deletedTeachers = await Teacher.deleteMany({ teachSclass: req.params.id });
        res.send(deletedClass);
    } catch (error) {
        res.status(500).json(error);
    }
};

const deleteSclasses = async (req, res) => {
    try {
        const deletedClasses = await Sclass.deleteMany({ school: req.params.id });
        if (deletedClasses.deletedCount === 0) {
            return res.send({ message: "No classes found to delete" });
        }
        const deletedStudents = await Student.deleteMany({ school: req.params.id });
        const deletedSubjects = await Subject.deleteMany({ school: req.params.id });
        const deletedTeachers = await Teacher.deleteMany({ school: req.params.id });
        res.send(deletedClasses);
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports = { sclassCreate, sclassList, getSclassDetail, getSclassStudents, deleteSclass, deleteSclasses };