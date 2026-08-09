const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = require('./db/dbConfig');
const { initializeDatabase } = require('./db/dbFunctions');

const casesRoutes = require('./routes/casesRoutes');
const criteriasRoutes = require('./routes/criteriasRoutes');
const decisionMatrixRoutes = require('./routes/decisionMatrixRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 5000;

// Allowed origins come from the environment so a redeploy or a renamed
// frontend doesn't need a code change to stop being blocked.
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/cases', casesRoutes);
app.use('/api/criterias', criteriasRoutes);
app.use('/api/decisionMatrix', decisionMatrixRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint for Render
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

const server = app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initializeDatabase();
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log('Database connection pool closed.');
    } catch (err) {
      console.error('Error closing the database pool:', err);
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));   // Render sends SIGTERM
