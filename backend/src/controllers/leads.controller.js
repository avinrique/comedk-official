const leadsService = require('../services/leads.service');
const { success, error } = require('../utils/response');

const createLead = async (req, res, next) => {
  try {
    const lead = await leadsService.createLead(req.body);
    return success(res, { lead }, 'Lead created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getLeads = async (req, res, next) => {
  try {
    const result = await leadsService.getLeads(req.query);
    return success(res, result, 'Leads fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getLeadById = async (req, res, next) => {
  try {
    const lead = await leadsService.getLeadById(req.params.id);
    return success(res, { lead }, 'Lead fetched successfully');
  } catch (err) {
    next(err);
  }
};

const updateLead = async (req, res, next) => {
  try {
    const lead = await leadsService.updateLead(req.params.id, req.body, req.user._id);
    return success(res, { lead }, 'Lead updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    await leadsService.deleteLead(req.params.id);
    return success(res, null, 'Lead deleted successfully');
  } catch (err) {
    next(err);
  }
};

const exportLeads = async (req, res, next) => {
  try {
    const leads = await leadsService.getLeadsForExport(req.query);

    const headers = [
      'Name',
      'Phone',
      'Email',
      'State',
      'City',
      'Exam',
      'Category',
      'Branch',
      'Status',
      'Source',
      'Priority',
      'Assigned To',
      'Course',
      'Budget',
      'Created At',
    ];

    const rows = leads.map((lead) => [
      lead.name || '',
      lead.phone || '',
      lead.email || '',
      lead.state || '',
      lead.city || '',
      lead.exam || '',
      lead.category || '',
      lead.branch || '',
      lead.status || '',
      lead.source || '',
      lead.priority || '',
      lead.assignedTo ? lead.assignedTo.name : '',
      lead.course || '',
      lead.budget || '',
      lead.createdAt ? new Date(lead.createdAt).toISOString() : '',
    ]);

    const escapeCSV = (val) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  exportLeads,
};
