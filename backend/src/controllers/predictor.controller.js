const { success } = require('../utils/response');
const predictorService = require('../services/predictor.service');

const getExams = async (req, res, next) => {
  try {
    const exams = predictorService.getExamMetadata();

    return success(res, { exams }, 'Exams fetched successfully');
  } catch (err) {
    next(err);
  }
};

const predict = async (req, res, next) => {
  try {
    const { exam, inputType, inputValue, category, branch, round } = req.body;

    if (!exam) {
      return res.status(400).json({
        success: false,
        message: 'exam is required',
      });
    }

    if (!inputType || !['marks', 'rank'].includes(inputType)) {
      return res.status(400).json({
        success: false,
        message: 'inputType must be "marks" or "rank"',
      });
    }

    if (inputValue == null || isNaN(Number(inputValue))) {
      return res.status(400).json({
        success: false,
        message: 'inputValue must be a valid number',
      });
    }

    const result = predictorService.predict({
      exam,
      inputType,
      inputValue,
      category: category || '__all__',
      branch: branch || '__all__',
      round: round || '__all__',
    });

    // Collect the categories & branches available for this exam so the
    // front-end can populate filter dropdowns.
    const examMeta = predictorService
      .getExamMetadata()
      .find((e) => e.id === exam || e.name === exam);

    const responseData = {
      predictedRank: result.predictedRank,
      rankRange: result.rankRange,
      colleges: result.colleges,
      totalMatches: result.totalMatches,
      filters: {
        categories: examMeta ? examMeta.categories : [],
        branches: examMeta ? examMeta.branches : [],
        rounds: examMeta && examMeta.rounds ? examMeta.rounds : [],
      },
    };

    return success(res, responseData, 'Prediction results');
  } catch (err) {
    next(err);
  }
};

module.exports = { getExams, predict };
