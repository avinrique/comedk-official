const Reminder = require('../models/Reminder');
const Lead = require('../models/Lead');
const { success, error } = require('../utils/response');

const getReminders = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role !== 'admin') {
      filter.assignedTo = req.user._id;
    } else if (req.query.assignedTo) {
      filter.assignedTo = req.query.assignedTo;
    }

    if (req.query.isCompleted !== undefined) {
      filter.isCompleted = req.query.isCompleted === 'true';
    }

    const reminders = await Reminder.find(filter)
      .populate('lead', 'name phone email status')
      .populate('assignedTo', 'name email')
      .sort({ dueAt: 1 })
      .lean();

    return success(res, { reminders }, 'Reminders fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getLeadReminders = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return error(res, 'Lead not found', 404);
    }

    const reminders = await Reminder.find({ lead: leadId })
      .populate('assignedTo', 'name email')
      .sort({ dueAt: 1 })
      .lean();

    return success(res, { reminders }, 'Reminders fetched successfully');
  } catch (err) {
    next(err);
  }
};

const createReminder = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return error(res, 'Lead not found', 404);
    }

    const reminder = new Reminder({
      lead: leadId,
      assignedTo: req.body.assignedTo || req.user._id,
      dueAt: req.body.dueAt,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
    });

    await reminder.save();

    const populated = await Reminder.findById(reminder._id)
      .populate('lead', 'name phone email status')
      .populate('assignedTo', 'name email');

    return success(res, { reminder: populated }, 'Reminder created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateReminder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return error(res, 'Reminder not found', 404);
    }

    if (
      req.user.role !== 'admin' &&
      reminder.assignedTo.toString() !== req.user._id.toString()
    ) {
      return error(res, 'You can only update your own reminders', 403);
    }

    const allowedFields = ['title', 'description', 'dueAt', 'isCompleted', 'priority'];
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        reminder[key] = req.body[key];
      }
    }

    if (req.body.isCompleted === true && !reminder.completedAt) {
      reminder.completedAt = new Date();
    }

    if (req.body.isCompleted === false) {
      reminder.completedAt = null;
    }

    await reminder.save();

    const populated = await Reminder.findById(reminder._id)
      .populate('lead', 'name phone email status')
      .populate('assignedTo', 'name email');

    return success(res, { reminder: populated }, 'Reminder updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getReminders, getLeadReminders, createReminder, updateReminder };
