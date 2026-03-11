const path = require('path');
const { parseCSV } = require('../utils/csvParser');

// ---------------------------------------------------------------------------
// Data Loading (at module load time, cached in memory)
// ---------------------------------------------------------------------------

const cutoffs = require('../data/cutoffs.json');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Normalise a CSV row coming from the JoSAA cutoff file into the unified
 * shape { name, branch, category, cutoffRank, exam }.
 */
const normaliseJosaa = (row) => ({
  name: row['Institute'],
  branch: row['Program'],
  category: row['Category'],
  cutoffRank: Number(row['Closing Rank']),
  exam: row['Exam'],
});

/**
 * Normalise a NEET CSV row.
 */
const normaliseNeet = (row) => ({
  name: row['College'],
  branch: row['Course'],
  category: row['Category'],
  cutoffRank: Number(row['Closing Rank']),
  exam: 'NEET',
});

/**
 * Normalise a COMEDK CSV row.
 */
const normaliseComedk = (row) => ({
  name: row['College'],
  branch: row['Branch'],
  category: row['Category'],
  cutoffRank: Number(row['Closing Rank']),
  exam: 'COMEDK',
});

/**
 * Normalise an SRM CSV row.
 */
const normaliseSrm = (row) => ({
  name: row['name'],
  branch: row['branch'],
  category: row['category'],
  cutoffRank: Number(row['cutoff_rank']),
  exam: 'SRM',
});

/**
 * Normalise a VIT CSV row.
 */
const normaliseVit = (row) => ({
  name: row['name'],
  branch: row['branch'],
  category: row['category'],
  cutoffRank: Number(row['cutoff_rank']),
  exam: 'VIT',
});

// Load and normalise every CSV once at startup.
let collegeData = [];

try {
  const josaaRows = parseCSV(path.join(DATA_DIR, 'josaa_cutoffs.csv'));
  collegeData = collegeData.concat(josaaRows.map(normaliseJosaa));
} catch (err) {
  console.warn('Warning: could not load josaa_cutoffs.csv –', err.message);
}

try {
  const neetRows = parseCSV(path.join(DATA_DIR, 'neet_cutoffs.csv'));
  collegeData = collegeData.concat(neetRows.map(normaliseNeet));
} catch (err) {
  console.warn('Warning: could not load neet_cutoffs.csv –', err.message);
}

try {
  const comedkRows = parseCSV(path.join(DATA_DIR, 'comedk_cutoffs.csv'));
  collegeData = collegeData.concat(comedkRows.map(normaliseComedk));
} catch (err) {
  console.warn('Warning: could not load comedk_cutoffs.csv –', err.message);
}

try {
  const srmRows = parseCSV(path.join(DATA_DIR, 'srm_cutoffs.csv'));
  collegeData = collegeData.concat(srmRows.map(normaliseSrm));
} catch (err) {
  console.warn('Warning: could not load srm_cutoffs.csv –', err.message);
}

try {
  const vitRows = parseCSV(path.join(DATA_DIR, 'vit_cutoffs.csv'));
  collegeData = collegeData.concat(vitRows.map(normaliseVit));
} catch (err) {
  console.warn('Warning: could not load vit_cutoffs.csv –', err.message);
}

// ---------------------------------------------------------------------------
// Exam name mapping – the controller / front-end uses slugified IDs while
// the data & cutoffs.json use human-readable names.
// ---------------------------------------------------------------------------

const EXAM_ID_TO_NAME = {
  'jee-main': 'JEE Main',
  'jee_main': 'JEE Main',
  'neet': 'NEET',
  'comedk': 'COMEDK',
  'srm': 'SRM',
  'srmjee': 'SRM',
  'vit': 'VIT',
  'viteee': 'VIT',
};

const EXAM_NAME_TO_ID = Object.fromEntries(
  Object.entries(EXAM_ID_TO_NAME).map(([id, name]) => [name, id])
);

// ---------------------------------------------------------------------------
// Helper: resolve whatever the caller passes (slug or display name) into the
// canonical display name used in data files & cutoffs.json.
// ---------------------------------------------------------------------------

const resolveExamName = (exam) => {
  if (EXAM_ID_TO_NAME[exam]) return EXAM_ID_TO_NAME[exam];
  if (EXAM_NAME_TO_ID[exam]) return exam; // already a display name
  return null;
};

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Given marks and a sorted (descending by marks) array of { marks, rank }
 * points, interpolate the expected rank.
 */
const interpolateRank = (marks, marksRankTable) => {
  if (!marksRankTable || marksRankTable.length === 0) return null;

  // The table is sorted descending by marks (highest marks first).
  const table = [...marksRankTable].sort((a, b) => b.marks - a.marks);

  // Above the highest marks in the table -> rank 1
  if (marks >= table[0].marks) return 1;

  // Below the lowest marks in the table -> extrapolate from the last two points
  const last = table[table.length - 1];
  if (marks <= last.marks) {
    if (table.length < 2) return last.rank;
    const secondLast = table[table.length - 2];
    const slope =
      (last.rank - secondLast.rank) / (secondLast.marks - last.marks);
    const extrapolated = Math.round(last.rank + slope * (last.marks - marks));
    return Math.max(extrapolated, last.rank); // rank can't improve below min marks
  }

  // Exact match
  const exact = table.find((p) => p.marks === marks);
  if (exact) return exact.rank;

  // Linear interpolation between the two surrounding points
  for (let i = 0; i < table.length - 1; i++) {
    const upper = table[i]; // higher marks, lower rank
    const lower = table[i + 1]; // lower marks, higher rank
    if (marks < upper.marks && marks > lower.marks) {
      const fraction =
        (upper.marks - marks) / (upper.marks - lower.marks);
      return Math.round(upper.rank + fraction * (lower.rank - upper.rank));
    }
  }

  return null;
};

/**
 * Given a predicted rank, produce an optimistic / pessimistic range that
 * accounts for year-to-year variation.
 */
const getRankRange = (rank, yearlyVariation = 0.15) => ({
  optimistic: Math.round(rank * (1 - yearlyVariation)),
  pessimistic: Math.round(rank * (1 + yearlyVariation)),
});

/**
 * Determine the admission chance label.
 *   studentRank <= cutoffRank * 0.8  -> "Safe"
 *   studentRank <= cutoffRank        -> "Good"
 *   studentRank <= cutoffRank * 1.2  -> "Reach"
 *   else                             -> null (don't include)
 */
const getChance = (cutoffRank, studentRank) => {
  if (studentRank <= cutoffRank * 0.8) return 'Safe';
  if (studentRank <= cutoffRank) return 'Good';
  if (studentRank <= cutoffRank * 1.2) return 'Reach';
  return null;
};

// Ordering for sorting chance labels
const CHANCE_ORDER = { Safe: 0, Good: 1, Reach: 2 };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main prediction function.
 *
 * @param {Object}  params
 * @param {string}  params.exam       – exam slug or display name
 * @param {string}  params.inputType  – "marks" | "rank"
 * @param {number}  params.inputValue – the numeric value
 * @param {string}  [params.category] – category filter ("__all__" = no filter)
 * @param {string}  [params.branch]   – branch filter  ("__all__" = no filter)
 * @returns {{ predictedRank, rankRange, colleges[], totalMatches }}
 */
const predict = ({ exam, inputType, inputValue, category, branch }) => {
  // --- Validate ---
  if (!exam) {
    const err = new Error('exam is required');
    err.statusCode = 400;
    throw err;
  }
  if (!inputType || !['marks', 'rank'].includes(inputType)) {
    const err = new Error('inputType must be "marks" or "rank"');
    err.statusCode = 400;
    throw err;
  }
  const numericValue = Number(inputValue);
  if (inputValue == null || isNaN(numericValue) || numericValue < 0) {
    const err = new Error('inputValue must be a non-negative number');
    err.statusCode = 400;
    throw err;
  }

  const examName = resolveExamName(exam);
  if (!examName) {
    const err = new Error(`Unknown exam: ${exam}`);
    err.statusCode = 400;
    throw err;
  }

  // --- Determine predicted rank ---
  let predictedRank;
  if (inputType === 'marks') {
    const examCutoff = cutoffs[examName];
    if (!examCutoff || !examCutoff.marksToRank) {
      const err = new Error(`No marks-to-rank data available for ${examName}`);
      err.statusCode = 400;
      throw err;
    }
    predictedRank = interpolateRank(numericValue, examCutoff.marksToRank);
    if (predictedRank === null) {
      const err = new Error('Could not interpolate rank for the given marks');
      err.statusCode = 400;
      throw err;
    }
  } else {
    predictedRank = Math.round(numericValue);
  }

  const rankRange = getRankRange(predictedRank);

  // --- Filter college data ---
  let filtered = collegeData.filter((c) => c.exam === examName);

  if (category && category !== '__all__') {
    filtered = filtered.filter((c) => c.category === category);
  }

  if (branch && branch !== '__all__') {
    filtered = filtered.filter((c) => c.branch === branch);
  }

  // --- Compute chances ---
  const colleges = [];
  for (const row of filtered) {
    const chance = getChance(row.cutoffRank, predictedRank);
    if (chance) {
      colleges.push({
        name: row.name,
        branch: row.branch,
        category: row.category,
        cutoffRank: row.cutoffRank,
        chance,
      });
    }
  }

  // --- Sort: Safe > Good > Reach, then by cutoffRank ascending ---
  colleges.sort((a, b) => {
    const orderDiff = CHANCE_ORDER[a.chance] - CHANCE_ORDER[b.chance];
    if (orderDiff !== 0) return orderDiff;
    return a.cutoffRank - b.cutoffRank;
  });

  return {
    predictedRank,
    rankRange,
    colleges,
    totalMatches: colleges.length,
  };
};

/**
 * Return metadata about each supported exam, including the categories and
 * branches that actually exist in the loaded data.
 */
const getExamMetadata = () => {
  // Deduplicate by name (aliases like jee_main and jee-main map to same exam)
  const seen = new Set();
  const exams = [];

  for (const [id, name] of Object.entries(EXAM_ID_TO_NAME)) {
    if (seen.has(name)) continue;
    seen.add(name);

    const rows = collegeData.filter((c) => c.exam === name);
    const categories = [...new Set(rows.map((r) => r.category))].sort();
    const branches = [...new Set(rows.map((r) => r.branch))].sort();

    const examCutoff = cutoffs[name];
    const maxMarks = examCutoff
      ? Math.max(...examCutoff.marksToRank.map((p) => p.marks))
      : null;

    exams.push({
      id,
      name,
      inputTypes: ['marks', 'rank'],
      maxMarks,
      categories,
      branches,
    });
  }

  return exams;
};

module.exports = {
  predict,
  getExamMetadata,
  // Exported for testing if needed
  interpolateRank,
  getRankRange,
  getChance,
};
