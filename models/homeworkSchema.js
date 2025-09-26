const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    subject: { type: String, required: true },  // <-- Just a string now
    sclass: { type: String, required: true },   // <-- Just a string now
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    dueDate: { type: Date, required: true },
    assignedDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Overdue'],
        default: 'Active'
    },
    attachments: [{
        filename: String,
        url: String
    }],
    submissions: [{
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student'
        },
        submittedAt: {
            type: Date,
            default: Date.now
        },
        content: String,
        attachments: [{
            filename: String,
            url: String
        }],
        grade: {
            type: Number,
            min: 0,
            max: 100
        },
        feedback: String,
        status: {
            type: String,
            enum: ['Submitted', 'Graded', 'Late'],
            default: 'Submitted'
        }
    }]
}, {
    timestamps: true
});

// Index for efficient queries
homeworkSchema.index({ sclass: 1, dueDate: 1 });
homeworkSchema.index({ teacher: 1, assignedDate: -1 });

// Virtual for checking if homework is overdue
homeworkSchema.virtual('isOverdue').get(function () {
    return new Date() > this.dueDate && this.status !== 'Completed';
});

// Pre-save middleware to update status based on due date
homeworkSchema.pre('save', function (next) {
    if (new Date() > this.dueDate && this.status === 'Active') {
        this.status = 'Overdue';
    }
    next();
});

module.exports = mongoose.model('Homework', homeworkSchema);