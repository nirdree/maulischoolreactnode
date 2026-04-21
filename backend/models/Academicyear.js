// models/Academicyear.js
const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },   // e.g. "2024-2025"
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  isCurrent: { type: Boolean, default: false },
}, { timestamps: true });

// Only one academic year can be current
academicYearSchema.pre('save', async function () {
  if (this.isCurrent) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isCurrent: false }
    );
  }
});

module.exports = mongoose.model('AcademicYear', academicYearSchema);