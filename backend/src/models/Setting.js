const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

settingSchema.statics.get = async function (key, defaultValue) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

settingSchema.statics.set = async function (key, value) {
  return this.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Setting', settingSchema);
