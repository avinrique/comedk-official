const Note = require('../models/Note');
const Lead = require('../models/Lead');
const { success, error } = require('../utils/response');

const getNotes = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return error(res, 'Lead not found', 404);
    }

    const notes = await Note.find({ lead: leadId })
      .populate('author', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    return success(res, { notes }, 'Notes fetched successfully');
  } catch (err) {
    next(err);
  }
};

const createNote = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return error(res, 'Lead not found', 404);
    }

    const note = new Note({
      lead: leadId,
      author: req.user._id,
      type: req.body.type || 'note',
      content: req.body.content,
    });

    await note.save();

    const populated = await Note.findById(note._id)
      .populate('author', 'name email role');

    return success(res, { note: populated }, 'Note created successfully', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotes, createNote };
