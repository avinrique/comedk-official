const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('./config/database');
const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const leadsRoutes = require('./routes/leads.routes');
const notesRoutes = require('./routes/notes.routes');
const remindersRoutes = require('./routes/reminders.routes');
const remindersGeneralRoutes = require('./routes/reminders.general.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const predictorRoutes = require('./routes/predictor.routes');
const usersRoutes = require('./routes/users.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'COMEDK Official API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/leads/:leadId/notes', notesRoutes);
app.use('/api/leads/:leadId/reminders', remindersRoutes);
app.use('/api/reminders', remindersGeneralRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/predictor', predictorRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`COMEDK Official API server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
