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

const cors = require('cors');
const corsOptions = require('./config/cors');

const app = express();

const NEW_KEY = '/etc/letsencrypt/live/lsconsultancyservices.com/privkey.pem';
const NEW_CERT = '/etc/letsencrypt/live/lsconsultancyservices.com/fullchain.pem';
const OLD_KEY = '/etc/letsencrypt/live/lspredictor.com/privkey.pem';
const OLD_CERT = '/etc/letsencrypt/live/lspredictor.com/fullchain.pem';
const SSL_KEY_PATH = fs.existsSync(NEW_KEY) ? NEW_KEY : OLD_KEY;
const SSL_CERT_PATH = fs.existsSync(NEW_CERT) ? NEW_CERT : OLD_CERT;
const useSSL = fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH);
const sslOptions = useSSL ? {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH)
} : null;

app.use(cors(corsOptions));
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
app.use(express.static(frontendPath, {
  setHeaders: function (res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (/\.(js|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
  }
}));

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

    if (useSSL) {
      https.createServer(sslOptions, app).listen(PORT, () => {
        console.log(`LS Predictor HTTPS server running on port ${PORT}`);
        console.log(`Health check: https://lsconsultancyservices.com/api/health`);
      });
    } else {
      app.listen(PORT, () => {
        console.log(`LS Predictor HTTP server running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
      });
    }
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
