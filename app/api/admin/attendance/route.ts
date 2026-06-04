const express = require('express');
const router = express.Router();
// Maan lete hain aapke paas Primsma, Mongoose, ya SQL Query Models imported hain
const { AttendanceModel, TimetableModel } = require('../models'); 

/**
 * @route   POST /api/attendance/mark
 * @desc    Mark or toggle attendance for a specific teacher, period, class, and date
 * @access  Private/Admin
 */
router.post('/mark', async (req, res) => {
  try {
    const { classId, periodId, teacherId, date, isAbsent } = req.body;

    // Basic Validation Checks
    if (!classId || !periodId || !teacherId || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required configuration parameters (classId, periodId, teacherId, date).' 
      });
    }

    // Date Format string cleaning (YYYY-MM-DD format control)
    const formattedDate = new Date(date).toISOString().split('T')[0];

    if (isAbsent) {
      // Agar 'isAbsent' true hai, toh entry update ya upsert karein database mein
      // Example using an upsert logic (SQL/NoSQL pattern matching)
      await AttendanceModel.upsert({
        where: {
          teacher_period_date_unique: { date: formattedDate, periodId, teacherId, classId }
        },
        update: { isAbsent: true },
        create: { date: formattedDate, periodId, teacherId, classId, isAbsent: true }
      });
    } else {
      // Agar 'isAbsent' false hai (Teacher present hai), toh database se exclusion record remove kar dein
      // Kyunki default status humesha 'Present' mana jata hai.
      await AttendanceModel.deleteMany({
        where: { date: formattedDate, periodId, teacherId, classId }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Attendance updated successfully for date ${formattedDate}`
    });

  } catch (error) {
    console.error('Backend Matrix Save Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error while writing data logs.' 
    });
  }
});

module.exports = router;