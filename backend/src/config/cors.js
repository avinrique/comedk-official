const parseCorsOrigins = () => {
  const originsEnv = process.env.CORS_ORIGINS || '';
  if (!originsEnv) {
    return ['http://localhost:8000', 'http://localhost:8001'];
  }
  return originsEnv.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = parseCorsOrigins();

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = corsOptions;
