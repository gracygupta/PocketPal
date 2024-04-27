const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validator = require("../middlewares/validator");

router.post(
  "/register",
  [
    body("first_name")
      .exists()
      .withMessage("first_name required")
      .isString()
      .withMessage("first_name is not a valid string"),
    body("last_name")
      .exists()
      .withMessage("last_name required")
      .isString()
      .withMessage("last_name is not a valid string"),
    body("age")
      .exists()
      .withMessage("age required")
      .isInt()
      .withMessage("age is not a valid number"),
    body("phone_number")
      .exists()
      .withMessage("phone_number is required")
      .isLength({ min: 10 })
      .withMessage("phone_number must be at least 10 characters"),
    body("monthly_income")
      .exists()
      .withMessage("monthly_income is required")
      .isNumeric()
      .withMessage("monthly_income is not a valid income"),
  ],
  validator.validateRequest,
  require("../controllers/registerController").register
);

module.exports = router;
