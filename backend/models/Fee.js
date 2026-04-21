// models/Fee.js
const mongoose = require('mongoose');

// ── Fee Record ───────────────────────────────────────────────
const feeSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classroom:    { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  month:        { type: Number, required: true, min: 1, max: 12 },
  year:         { type: Number, required: true },
  tuitionFee:   { type: Number, required: true, min: 0 },
  transportFee: { type: Number, default: 0 },
  activityFee:  { type: Number, default: 0 },
  otherFee:     { type: Number, default: 0 },
  lateFine:     { type: Number, default: 0 },
  discount:     { type: Number, default: 0 },
  totalAmount:  { type: Number, required: true },
  finalAmount:  { type: Number, required: true },
  status:       {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue', 'PartiallyPaid', 'Waived'],
    default: 'Pending',
  },
  dueDate:      { type: Date, required: true },
  notes:        { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

feeSchema.index({ student: 1, month: 1, year: 1 }, { unique: true });

// ── Fee Payment (receipt) ────────────────────────────────────
const feePaymentSchema = new mongoose.Schema({
  fee:           { type: mongoose.Schema.Types.ObjectId, ref: 'Fee', required: true },
  student:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  receiptNo:     { type: String, unique: true },
  amountPaid:    { type: Number, required: true },
  paymentDate:   { type: Date, required: true, default: Date.now },
  paymentMode:   {
    type: String,
    enum: ['Cash', 'Cheque', 'Online', 'UPI', 'BankTransfer'],
    required: true,
  },
  transactionId: { type: String },
  collectedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes:         { type: String },
  academicYear:  { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

feePaymentSchema.pre('save', async function () {
  if (!this.receiptNo) {
    const year = new Date().getFullYear();

    const lastPayment = await this.constructor
      .findOne({ receiptNo: new RegExp(`RCP-${year}`) })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastPayment && lastPayment.receiptNo) {
      const lastNumber = parseInt(lastPayment.receiptNo.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    this.receiptNo = `RCP-${year}-${String(nextNumber).padStart(5, '0')}`;
  }
});

const Fee        = mongoose.model('Fee',        feeSchema);
const FeePayment = mongoose.model('FeePayment', feePaymentSchema);

module.exports = { Fee, FeePayment };