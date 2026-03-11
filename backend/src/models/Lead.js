const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
    },
  },
  { _id: false }
);

const enrolledDetailsSchema = new mongoose.Schema(
  {
    college: String,
    course: String,
    year: String,
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    exam: {
      type: String,
      enum: ['JEE Main', 'NEET', 'COMEDK', 'SRM', 'VIT'],
    },
    inputType: {
      type: String,
      enum: ['marks', 'rank'],
    },
    inputValue: {
      type: Number,
    },
    predictedRank: {
      type: Number,
    },
    category: {
      type: String,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'enrolled', 'lost'],
      default: 'new',
    },
    source: {
      type: String,
      enum: ['predictor', 'website', 'whatsapp', 'referral', 'walk-in', 'phone'],
      default: 'website',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    course: {
      type: String,
      trim: true,
    },
    budget: {
      type: String,
      trim: true,
    },
    parentName: {
      type: String,
      trim: true,
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    lastContactedAt: {
      type: Date,
    },
    nextFollowUpAt: {
      type: Date,
    },
    statusHistory: [statusHistorySchema],
    lostReason: {
      type: String,
      trim: true,
    },
    enrolledDetails: enrolledDetailsSchema,
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
