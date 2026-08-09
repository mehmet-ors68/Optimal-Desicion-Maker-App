const { Pool } = require("pg");

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });


// Connection details come from .env only — see .env.example for the shape.
// Never paste a real connection string into this file: it is tracked by git.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

const isLocal = process.env.DATABASE_URL.includes("localhost");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's managed Postgres terminates TLS with a cert this client can't chain,
  // so verification is off there. A local database needs no TLS at all.
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});


// Log successful connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

// Handle database errors
pool.on("error", (err) => {
  console.error("Unexpected database error, couldn't connect", err);
});

// Export the pool and query function
module.exports = pool;