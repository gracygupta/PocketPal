const pg = require("pg");
const { Pool } = pg;
require("dotenv").config();

const pool = new Pool({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.DB_PORT, //DEFAULT 5432
});

dbConnect = async () => {
  try {
    const client = await pool.connect();
    console.log("DB Connection Successful");
    client.release();
  } catch (err) {
    console.error("DB Connection Error:", err);
  }
};
dbConnect();

pool.on("connect", (client) => {
  console.log(
    `Connected to database ${client.database} on host ${client.host}`
  );
});

pool.on("error", (err, client) => {
  if (err) {
    console.log(err);
    console.log(
      `Error Connecting to database ${client.database} on host ${client.host}`
    );
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
