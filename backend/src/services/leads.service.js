const Lead = require('../models/Lead');

const createLead = async (data) => {
  const lead = new Lead(data);
  await lead.save();
  return lead;
};

const getLeads = async (query) => {
  const {
    status,
    source,
    assignedTo,
    search,
    sort = '-createdAt',
    page = 1,
    limit = 20,
  } = query;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (source) {
    filter.source = source;
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const sortObj = {};
  const sortFields = sort.split(',');
  for (const field of sortFields) {
    if (field.startsWith('-')) {
      sortObj[field.substring(1)] = -1;
    } else {
      sortObj[field] = 1;
    }
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'name email role')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return {
    leads,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

const getLeadById = async (id) => {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email role')
    .populate('statusHistory.changedBy', 'name email');

  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  return lead;
};

const updateLead = async (id, data, userId) => {
  const lead = await Lead.findById(id);

  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  if (data.status && data.status !== lead.status) {
    lead.statusHistory.push({
      status: data.status,
      changedBy: userId,
      changedAt: new Date(),
      note: data.statusNote || '',
    });
  }

  delete data.statusNote;

  Object.keys(data).forEach((key) => {
    lead[key] = data[key];
  });

  await lead.save();

  const updated = await Lead.findById(id)
    .populate('assignedTo', 'name email role')
    .populate('statusHistory.changedBy', 'name email');

  return updated;
};

const deleteLead = async (id) => {
  const lead = await Lead.findByIdAndDelete(id);

  if (!lead) {
    const err = new Error('Lead not found');
    err.statusCode = 404;
    throw err;
  }

  return lead;
};

const getLeadsForExport = async (query) => {
  const { status, source, assignedTo, search } = query;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (source) {
    filter.source = source;
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { name: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
    ];
  }

  const leads = await Lead.find(filter)
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  return leads;
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadsForExport,
};
