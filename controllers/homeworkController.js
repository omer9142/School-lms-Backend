const Homework = require('../models/homeworkSchema.js');
const Student = require('../models/studentSchema.js');

// Create new homework assignment
const createHomework = async (req, res) => {
    try {
        const { title, description, subject, sclass, dueDate, attachments } = req.body;
        const teacherId = req.userId; // From auth middleware or however you get teacher
        const schoolId = req.schoolId; // Same for school

        // Validate due date
        const dueDateObj = new Date(dueDate);
        if (dueDateObj <= new Date()) {
            return res.status(400).json({ message: "Due date must be in the future" });
        }

        // Since subject and sclass are strings now, no need to verify in DB here

        const homework = new Homework({
            title,
            description,
            subject, // string like "Islamiyat"
            sclass,  // string like "4B"
            school: schoolId,
            teacher: teacherId,
            dueDate: dueDateObj,
            attachments: attachments || []
        });

        await homework.save();

        res.status(201).json({
            message: "Homework created successfully",
            homework
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all homework for a specific class (for students)
const getHomeworkByClass = async (req, res) => {
    try {
        const { className } = req.params; // expect className like "4B"
        const { status, page = 1, limit = 10 } = req.query;

        const query = { sclass: className };
        if (status && status !== 'all') {
            query.status = status;
        }

        const homework = await Homework.find(query)
            .sort({ assignedDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Homework.countDocuments(query);

        res.json({
            homework,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get homework for a specific student
const getStudentHomework = async (req, res) => {
    try {
        const studentId = req.userId;

        // Get student to find their class name (string)
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const className = student.sclassName; // assuming this is a string field like "4B"

        const homework = await Homework.find({ sclass: className }).sort({ dueDate: 1 });

        // Add submission status for each homework
        const homeworkWithStatus = homework.map(hw => {
            const submission = hw.submissions.find(sub =>
                sub.student.toString() === studentId.toString()
            );

            return {
                ...hw.toObject(),
                submissionStatus: submission ? submission.status : 'Not Submitted',
                isSubmitted: !!submission,
                grade: submission ? submission.grade : null
            };
        });

        res.json({ homework: homeworkWithStatus });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Submit homework (for students)
const submitHomework = async (req, res) => {
    try {
        const { homeworkId } = req.params;
        const { content, attachments } = req.body;
        const studentId = req.userId;

        const homework = await Homework.findById(homeworkId);
        if (!homework) {
            return res.status(404).json({ message: "Homework not found" });
        }

        // Check if student already submitted
        const existingSubmission = homework.submissions.find(
            sub => sub.student.toString() === studentId.toString()
        );

        if (existingSubmission) {
            return res.status(400).json({ message: "Homework already submitted" });
        }

        // Determine submission status
        const isLate = new Date() > homework.dueDate;
        const submissionStatus = isLate ? 'Late' : 'Submitted';

        homework.submissions.push({
            student: studentId,
            content,
            attachments: attachments || [],
            status: submissionStatus
        });

        await homework.save();

        res.json({
            message: "Homework submitted successfully",
            status: submissionStatus
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get homework by teacher (for teachers to see their assigned homework)
const getHomeworkByTeacher = async (req, res) => {
    try {
        const teacherId = req.userId;
        const { status, className } = req.query;

        const query = { teacher: teacherId };
        if (status && status !== 'all') query.status = status;
        if (className) query.sclass = className;

        const homework = await Homework.find(query).sort({ assignedDate: -1 });

        res.json({ homework });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update homework
const updateHomework = async (req, res) => {
    try {
        const { homeworkId } = req.params;
        const updates = req.body;
        const teacherId = req.userId;

        const homework = await Homework.findOne({
            _id: homeworkId,
            teacher: teacherId
        });

        if (!homework) {
            return res.status(404).json({ message: "Homework not found or unauthorized" });
        }

        Object.assign(homework, updates);
        await homework.save();

        res.json({ message: "Homework updated successfully", homework });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete homework
const deleteHomework = async (req, res) => {
    try {
        const { homeworkId } = req.params;
        const teacherId = req.userId;

        const homework = await Homework.findOneAndDelete({
            _id: homeworkId,
            teacher: teacherId
        });

        if (!homework) {
            return res.status(404).json({ message: "Homework not found or unauthorized" });
        }

        res.json({ message: "Homework deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createHomework,
    getHomeworkByClass,
    getStudentHomework,
    submitHomework,
    getHomeworkByTeacher,
    updateHomework,
    deleteHomework
};
