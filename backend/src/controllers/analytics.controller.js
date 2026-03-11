const analyticsService = require('../services/analytics.service');
const { success } = require('../utils/response');

const getOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getOverview();
    return success(res, data, 'Overview fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getPipeline = async (req, res, next) => {
  try {
    const data = await analyticsService.getPipeline();
    return success(res, { pipeline: data }, 'Pipeline fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getTrends = async (req, res, next) => {
  try {
    const data = await analyticsService.getTrends();
    return success(res, { trends: data }, 'Trends fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const data = await analyticsService.getStats();
    return success(res, data, 'Stats fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getSources = async (req, res, next) => {
  try {
    const data = await analyticsService.getSources();
    return success(res, data, 'Sources fetched successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getPipeline, getTrends, getStats, getSources };
