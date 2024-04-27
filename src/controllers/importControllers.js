const http_codes = require("../constants/http_codes");
const csv = require("csv-parser");
const fs = require("fs");
const pool = require("../db/connection");

const readCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    const stream = fs
      .createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        data.push(row);
      })
      .on("end", () => {
        resolve(data);
      })
      .on("error", (error) => {
        reject(error);
      });

    stream.on("error", (error) => {
      reject(error);
    });
  });
};

exports.import_data = async (req, res) => {
  try {
    // Extract customer data
    const customerDataFilePath = req.files["customerData"][0].path;
    const customerData = await readCSV(customerDataFilePath);

    // Extract loan data
    const loanDataFilePath = req.files["loanData"][0].path;
    const loanData = await readCSV(loanDataFilePath);

    // Insert customer data
    for (const customer of customerData) {
      const query = `
            INSERT INTO customers (first_name, last_name, age, phone_number, monthly_salary, approved_limit, current_debt)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING customer_id;
          `;
      const values = [
        customer.first_name,
        customer.last_name,
        customer.age,
        customer.phone_number,
        customer.monthly_salary,
        customer.approved_limit,
        customer.current_debt,
      ];
      const result = await pool.query(query, values);
      const customerId = result.rows[0].customer_id;

      // Insert corresponding loan data
      const customerLoans = loanData.filter(
        (loan) => loan.customer_id == customerId
      );

      for (const loan of customerLoans) {
        const loanQuery = `
              INSERT INTO loans (customer_id, loan_amount, tenure, interest_rate, monthly_repayment, emis_paid_on_time, start_date, end_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `;
        const loanValues = [
          customerId,
          loan.loan_amount,
          loan.tenure,
          loan.interest_rate,
          loan.monthly_payment,
          loan.emis_paid_on_time,
          loan.start_date,
          loan.end_date,
        ];
        await pool.query(loanQuery, loanValues);
      }
    }

    // Send response
    res
      .status(http_codes.success_code)
      .json({ message: "Data ingested successfully" });

    // Clean up uploaded files
    fs.unlinkSync(customerDataFilePath);
    fs.unlinkSync(loanDataFilePath);
  } catch (err) {
    console.log(err);
    return res.status(http_codes.internal_server_error).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
