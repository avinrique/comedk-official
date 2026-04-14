const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('./config/database');
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
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/lspredictor.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/lspredictor.com/fullchain.pem')
};

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'LS Predictor API is running', timestamp: new Date().toISOString() });
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

// Serve frontend static files
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath));

// For any non-API route, serve the frontend (SPA fallback)
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`LS Predictor HTTPS server running on port ${PORT}`);
      console.log(`Health check: https://lspredictor.com/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
