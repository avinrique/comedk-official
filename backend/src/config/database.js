const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let retryCount = 0;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
    retryCount = 0;
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Attempting reconnection (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY_MS / 1000}s...`);
      setTimeout(() => {
        connectWithRetry();
      }, RETRY_DELAY_MS);
    } else {
      console.error('Max reconnection attempts reached. Exiting.');
      process.exit(1);
    }
  });

  await connectWithRetry();
};

const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Retrying connection (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      await connectWithRetry();
    } else {
      console.error('Max connection retries reached. Exiting.');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
