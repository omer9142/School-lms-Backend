const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/adminSchema.js');



const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'; // use env in production
const JWT_EXPIRES_IN = '1d'; // token expiry

// Admin Registration
const adminRegister = async (req, res) => {
    try {
        const { email, schoolName, password, ...rest } = req.body;

        const existingAdminByEmail = await Admin.findOne({ email });
        const existingSchool = await Admin.findOne({ schoolName });

        if (existingAdminByEmail) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        if (existingSchool) {
            return res.status(400).json({ message: 'School name already exists' });
        }

        const hashedPass = await bcrypt.hash(password, 10);

        const admin = new Admin({
            ...rest,
            email,
            schoolName,
            password: hashedPass
        });

        let result = await admin.save();
        result.password = undefined;

         // Generate JWT token
        const token = jwt.sign(
            { id: result._id, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            message: "Admin registered successfully",
            token,
            admin: result
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Login
// Admin Login
const adminLogIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: "User not found" });
        }

        // Compare entered password with stored hashed password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin._id, role: 'admin' },
            process.env.JWT_SECRET || JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || JWT_EXPIRES_IN }
        );

        admin.password = undefined; // remove password from output
        res.json({ 
            message: "Login successful",
            token, 
            admin 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};


// Get Admin Details (Protected)
const getAdminDetail = async (req, res) => {
    try {
        let admin = await Admin.findById(req.userId).select('-password');
        if (!admin) {
            return res.status(404).json({ message: "No admin found" });
        }
        res.json(admin);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { adminRegister, adminLogIn, getAdminDetail };
