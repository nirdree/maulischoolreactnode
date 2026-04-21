// models/Enquiry.js
const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  enquiryId:             { type: String, unique: true },
  classApplying:         { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  childName:             { type: String, required: true, trim: true },
  fatherName:            { type: String, required: true, trim: true },
  residentialAddress:    { type: String, required: true },
  pinCode:               { type: String, required: true },
  phoneNo:               { type: String, required: true },
  mobileNo:              { type: String, required: true },
  email:                 { type: String, required: true },
  gender:                { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  age:                   { type: Number, required: true },
  dateOfBirth:           { type: Date, required: true },
  preferredAdmissionDate:{ type: Date },
  remark:                { type: String },
  adminRemark:           { type: String },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'AdmissionDone', 'Cancelled', 'PlanningFuture', 'Other'],
    default: 'New',
  },
  convertedToAdmission:  { type: Boolean, default: false },
  academicYear:          { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

enquirySchema.pre('save', async function () {
  if (!this.enquiryId) {
    const year = new Date().getFullYear();

    const lastEnquiry = await this.constructor
      .findOne({ enquiryId: new RegExp(`ENQ-${year}`) })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastEnquiry && lastEnquiry.enquiryId) {
      const lastNumber = parseInt(lastEnquiry.enquiryId.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    this.enquiryId = `ENQ-${year}-${String(nextNumber).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Enquiry', enquirySchema);