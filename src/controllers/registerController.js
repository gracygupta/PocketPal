const http_codes = require("../constants/http_codes");
const pool = require("../db/connection");

exports.register = async (req, res) => {
  try {
    const { first_name, last_name, age, monthly_income, phone_number } =
      req.body;

    // Calculate approved limit based on salary
    const approved_limit = Math.round((36 * monthly_income) / 100000) * 100000;

    // Insert new customer into the database
    const query = `
      INSERT INTO customers (first_name, last_name, age, monthly_salary, approved_limit, phone_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING customer_id;
    `;
    const values = [
      first_name,
      last_name,
      age,
      monthly_income,
      approved_limit,
      phone_number,
    ];
    const result = await pool.query(query, values);
    const customer_id = result.rows[0].customer_id;

    // Prepare response body
    const responseBody = {
      customer_id,
      name: `${first_name} ${last_name}`,
      age,
      monthly_income,
      approved_limit,
      phone_number,
    };

    // Send response
    return res.status(http_codes.success_code).json({
      success: true,
      message: "user registered successfully",
      data: responseBody,
    });
  } catch (err) {
    console.log(err);
    return res.status(http_codes.internal_server_error).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
