//server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const path = require('path');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth.js'));
app.use('/api/students',        require('./routes/students.js'));
app.use('/api/employees',       require('./routes/employees.js'));
app.use('/api/classrooms',      require('./routes/classrooms.js'));
app.use('/api/subjects',        require('./routes/subjects.js'));
app.use('/api/enquiries',       require('./routes/enquiries.js'));
app.use('/api/exams',           require('./routes/exams.js'));
app.use('/api/marks',           require('./routes/marks.js'));
app.use('/api/attendance',      require('./routes/attendance.js'));
app.use('/api/fees',            require('./routes/fees.js'));
app.use('/api/payroll',         require('./routes/payroll.js'));
app.use('/api/homework',        require('./routes/homework.js'));
app.use('/api/notices',         require('./routes/notices.js'));
app.use('/api/leaves',          require('./routes/leaves.js'));
app.use('/api/timetable',       require('./routes/timetable.js'));
app.use('/api/academic-years',  require('./routes/academicYears.js'));
app.use('/api/settings',        require('./routes/settings.js'));
app.use('/api/promote',         require('./routes/promote.js'));
app.use('/api/reports',         require('./routes/reports.js'));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Connect to MongoDB & Start ───────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
