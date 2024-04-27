const pg = require("pg");
const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "PocketPal",
  password: "0410",
  port: 5432,
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
