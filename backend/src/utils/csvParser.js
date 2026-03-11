const fs = require('fs');
const { parse } = require('csv-parse/sync');

const parseCSV = (filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: true,
  });

  return records;
};

module.exports = { parseCSV };
