const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const insertController = require("../controllers/importControllers");
const multer = require("multer");

// Multer setup to handle file uploads
const upload = multer({ dest: "../uploads/" });

router.post(
  "/insert-data",
  upload.fields([
    { name: "customerData", maxCount: 1 },
    { name: "loanData", maxCount: 1 },
  ]),
  insertController.import_data
);

module.exports = router;
