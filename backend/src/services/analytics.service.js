const Lead = require('../models/Lead');

const getOverview = async () => {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [totalLeads, newThisWeek, enrolledCount, statusCounts] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
    Lead.countDocuments({ status: 'enrolled' }),
    Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const conversionRate = totalLeads > 0
    ? parseFloat(((enrolledCount / totalLeads) * 100).toFixed(2))
    : 0;

  const leadsByStatus = {};
  for (const item of statusCounts) {
    leadsByStatus[item._id] = item.count;
  }

  return {
    totalLeads,
    newThisWeek,
    conversionRate,
    enrolledCount,
    leadsByStatus,
  };
};

const getPipeline = async () => {
  const pipeline = await Lead.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const statusOrder = ['new', 'contacted', 'qualified', 'enrolled', 'lost'];
  const result = statusOrder.map((status) => {
    const found = pipeline.find((p) => p._id === status);
    return { status, count: found ? found.count : 0 };
  });

  return result;
};

const getTrends = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trends = await Lead.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const result = [];
  const current = new Date(thirtyDaysAgo);
  while (current <= now) {
    const dateStr = current.toISOString().split('T')[0];
    const found = trends.find((t) => t._id === dateStr);
    result.push({
      date: dateStr,
      count: found ? found.count : 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
};

const getStats = async () => {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const Reminder = require('../models/Reminder');

  const [totalLeads, newThisWeek, newLastWeek, enrolledCount, followupsDue] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
    Lead.countDocuments({ createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }),
    Lead.countDocuments({ status: 'enrolled' }),
    Reminder.countDocuments({ isCompleted: false, dueAt: { $lte: now } }),
  ]);

  const conversionRate = totalLeads > 0
    ? parseFloat(((enrolledCount / totalLeads) * 100).toFixed(2))
    : 0;

  const totalChange = newLastWeek > 0
    ? parseFloat((((newThisWeek - newLastWeek) / newLastWeek) * 100).toFixed(1))
    : 0;

  return {
    total_leads: totalLeads,
    new_this_week: newThisWeek,
    conversion_rate: conversionRate,
    followups_due: followupsDue,
    total_change: totalChange,
    new_change: totalChange,
  };
};

const getSources = async () => {
  const sources = await Lead.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return sources.map((s) => ({
    source: s._id || 'unknown',
    count: s.count,
  }));
};

module.exports = { getOverview, getPipeline, getTrends, getStats, getSources };
