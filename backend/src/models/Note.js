const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'Lead reference is required'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
    },
    type: {
      type: String,
      enum: ['note', 'call', 'email', 'whatsapp', 'meeting', 'status_change'],
      default: 'note',
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Note', noteSchema);
