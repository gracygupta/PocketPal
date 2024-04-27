const express = require("express");
const rateLimit = require("express-rate-limit");
const logger = require("morgan");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db/connection");

dotenv.config();
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 2500, // limit each IP to 2500 requests per windowMs
});

app.set("trust proxy", 1);
app.use(limiter);
app.use(logger("dev"));
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM customers");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.use("/", require("./router/index"));

app.use((req, res, next) => {
  return res.status(404).json({ message: "404 Not Found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
