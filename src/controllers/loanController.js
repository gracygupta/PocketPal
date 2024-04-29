const http_codes = require("../constants/http_codes");
const pool = require("../db/connection");
const axios = require("axios");

function prepareCreditScoreData(customerData, loanData) {
  const currentYear = new Date().getFullYear();
  let totalLoanTaken = 0;
  let emisPaidOnTime = 0;
  let totalEmisTenure = 0;
  let activeLoans = 0;
  let pastLoansPaidOnTime = 0;
  let noOfPastLoans = 0;
  let loanTakenThisYear = 0;
  let noOfLoanTakenThisYear = 0;

  loanData.forEach((loan) => {
    const loanStartYear = new Date(loan.start_date).getFullYear();
    const loanEndYear = new Date(loan.end_date).getFullYear();
    totalLoanTaken += parseFloat(loan.loan_amount);
    emisPaidOnTime += loan.emis_paid_on_time;
    totalEmisTenure += loan.tenure;

    if (loanEndYear >= currentYear) {
      activeLoans += 1;
    }
    if (loanEndYear < currentYear) {
      pastLoansPaidOnTime += loan.emis_paid_on_time === loan.tenure ? 1 : 0;
      noOfPastLoans += 1;
    }
    if (loanStartYear === currentYear) {
      loanTakenThisYear += parseFloat(loan.loan_amount);
      noOfLoanTakenThisYear += 1;
    }
  });

  const currentDebt = parseInt(customerData.current_debt);
  const approvedLimit = parseInt(customerData.approved_limit);

  return {
    currentDebt,
    approvedLimit,
    totalLoanTaken,
    emisPaidOnTime,
    totalEmisTenure,
    totalLoansTaken: loanData.length,
    activeLoans,
    pastLoansPaidOnTime,
    noOfPastLoans,
    loanTakenThisYear,
    noOfLoanTakenThisYear,
  };
}

// Calculate credit score based on loan data
function calculateCreditScore(customerData, loanData) {
  let {
    currentDebt,
    approvedLimit,
    totalLoanTaken,
    emisPaidOnTime,
    totalEmisTenure,
    totalLoansTaken,
    activeLoans,
    pastLoansPaidOnTime,
    noOfPastLoans,
    loanTakenThisYear,
    noOfLoanTakenThisYear,
  } = prepareCreditScoreData(customerData, loanData);

  if (currentDebt > approvedLimit) {
    return 0;
  }

  const utilization = currentDebt / approvedLimit;
  const debtUtilizationScore = 100 * (1 - utilization);

  const paymentRatio = emisPaidOnTime / totalEmisTenure;
  const paymentHistoryScore = 100 * paymentRatio;

  const loanStabilityRatio =
    noOfPastLoans > 0 ? pastLoansPaidOnTime / noOfPastLoans : 1;
  const loanStabilityScore = 100 * loanStabilityRatio;

  const currentYearIntensity = loanTakenThisYear / approvedLimit;
  const yearActivityScore = 100 * (1 - currentYearIntensity);

  const diversityScore = 100 * (1 - activeLoans / totalLoansTaken);

  const aggregateScore =
    0.25 * debtUtilizationScore +
    0.2 * paymentHistoryScore +
    0.2 * loanStabilityScore +
    0.15 * yearActivityScore +
    0.2 * diversityScore;
  const creditScore = Math.min(aggregateScore, 100);

  return creditScore.toFixed(2);
}

// Calculate monthly installment based on loan details
function calculateMonthlyInstallment(loanAmount, interestRate, tenure) {
  const r = interestRate / 1200;
  const n = tenure;
  const emi = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return emi.toFixed(2);
}

exports.checkEligibility = async (req, res) => {
  try {
    const { customer_id, loan_amount, interest_rate, tenure } = req.body;

    const customerDataQuery = await pool.query(
      `SELECT * FROM customers WHERE customer_id = $1;`,
      [customer_id]
    );

    const customerData = customerDataQuery.rows[0];

    // Query loan data for the customer from the database
    const loanDataQuery = `
          SELECT * FROM loans WHERE customer_id = $1;
        `;
    const loanDataValues = [customer_id];
    const loanDataResult = await pool.query(loanDataQuery, loanDataValues);
    const loanData = loanDataResult.rows;

    // Calculate credit score
    const creditScore = calculateCreditScore(customerData, loanData);

    // Determine if the loan can be approved based on credit score
    let approval = false;
    let corrected_interest_rate = interest_rate;
    if (creditScore > 50) {
      approval = true;
    } else if (50 >= creditScore && creditScore > 30) {
      corrected_interest_rate = Math.max(interest_rate, 12);
      approval = true;
    } else if (30 >= creditScore && creditScore > 10) {
      corrected_interest_rate = Math.max(interest_rate, 16);
      approval = true;
    }

    // Calculate monthly installment
    const monthly_installment = calculateMonthlyInstallment(
      loan_amount,
      corrected_interest_rate,
      tenure
    );

    // Check if loan amount exceeds approved limit
    if (loan_amount > customerData.approved_limit) {
      approval = false;
    }

    // Response body
    const responseBody = {
      customer_id,
      approval,
      interest_rate,
      corrected_interest_rate,
      tenure,
      monthly_installment,
      creditScore,
    };

    return res.status(http_codes.success_code).json({
      success: true,
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

getStartDate = () => {
  const currentDate = new Date();

  const options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  };
  const formattedDate = currentDate.toLocaleString("en-IN", options);
  const dateWithDashes = formattedDate.replace(/\//g, "-");
  return dateWithDashes;
};

getEndDate = (tenure) => {
  const currentDate = new Date();

  const month = tenure % 12;
  const year = parseInt(tenure / 12);
  // Calculate the end date by adding the tenure (in months) to the current date
  const endDate = new Date(currentDate);
  endDate.setMonth(endDate.getMonth() + month);
  endDate.setFullYear(endDate.getFullYear() + year);

  // Convert the end date to "mm-dd-yyyy" format
  const options = {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  };
  const formattedEndDate = endDate.toLocaleString("en-IN", options);
  const endDateWithDashes = formattedEndDate.replace(/\//g, "-");

  return endDateWithDashes;
};

exports.createLoan = async (req, res) => {
  try {
    const { customer_id, loan_amount, interest_rate, tenure } = req.body;

    // check-eligibility
    const response = await axios.post(
      "http://localhost:3000/check-eligibility",
      { customer_id, loan_amount, interest_rate, tenure }
    );
    const data = response.data.data;

    let loan_id = null;
    let message = "";

    if (data.approval == true) {
      const customerQuery = {
        text: `UPDATE customers
                   SET current_debt = current_debt + $1
                   WHERE customer_id = $2`,
        values: [loan_amount, customer_id],
      };
      const updatedCustomer = await pool.query(customerQuery);

      const start_date = getStartDate();
      const end_date = getEndDate(parseInt(tenure));

      // Query loan data for the customer from the database
      const loanQuery = {
        text: `INSERT INTO loans 
               (customer_id, loan_amount, tenure, interest_rate, monthly_repayment, emis_paid_on_time, start_date, end_date) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
               RETURNING loan_id`,
        values: [
          customer_id,
          loan_amount,
          tenure,
          data.corrected_interest_rate,
          data.monthly_installment,
          0,
          start_date,
          end_date,
        ],
      };

      const loanDataResult = await pool.query(loanQuery);
      loan_id = loanDataResult.rows[0].loan_id;
      message = `load approved with credit score ${data.creditScore}`;

      // Insert EMI documents for the loan
      const emiAmount = data.monthly_installment;
      //   const emiStartDate = new Date(start_date);
      for (let i = 1; i <= tenure; i++) {
        const emiDueDate = getEndDate(i);
        const emiQuery = {
          text: `INSERT INTO emis 
                 (customer_id, loan_id, emi_number, emi_amount, emi_date, emi_status) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
          values: [customer_id, loan_id, i, emiAmount, emiDueDate, "pending"],
        };
        await pool.query(emiQuery);
      }
    } else {
      message = `loan is not approved due to low credit score ${data.creditScore}`;
    }

    let responseBody = {
      loan_id,
      customer_id,
      loan_approved: data.approval,
      message,
      monthly_installment: data.monthly_installment,
    };
    return res.json({ success: true, data: responseBody });
  } catch (err) {
    console.log(err);
    return res.status(http_codes.internal_server_error).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.viewLoan = async (req, res) => {
  try {
    const loan_id = req.params.loan_id;
    const loanQuery = {
      text: `SELECT loans.*, customers.* 
               FROM loans 
               INNER JOIN customers ON loans.customer_id = customers.customer_id 
               WHERE loans.loan_id = $1`,
      values: [loan_id],
    };

    const loanDataResult = await pool.query(loanQuery);
    const result = loanDataResult.rows[0];

    const responseBody = {
      loan_id: result.loan_id,
      customer: {
        first_name: result.first_name,
        last_name: result.last_name,
        age: result.age,
      },
      loan_amount: parseFloat(result.loan_amount),
      interest_rate: parseFloat(result.interest_rate),
      monthly_installment: parseFloat(result.monthly_repayment),
      tenure: result.tenure,
    };

    return res
      .status(http_codes.success_code)
      .json({ success: true, data: responseBody });
  } catch (err) {
    console.log(err);
    return res.status(http_codes.internal_server_error).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.makePayment = async (req, res) => {
  try {
    const customer_id = req.params.customer_id;
    const loan_id = req.params.loan_id;
    const { payment_amount } = req.body;

    // Get the current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // Months are zero-based, so add 1

    // Update the loans document to increment emis_paid_on_time
    const updateLoanQuery = {
      text: `UPDATE loans SET emis_paid_on_time = emis_paid_on_time + $1 WHERE loan_id = $2 RETURNING emis_paid_on_time`,
      values: [1, loan_id],
    };
    const loanResult = await pool.query(updateLoanQuery);
    console.log("loanResult", loanResult.rows[0]);
    const updated_emis_paid_on_time = loanResult.rows[0].emis_paid_on_time;
    console.log("updated_emis_paid_on_time", updated_emis_paid_on_time);

    // Retrieve the EMIs with emi_date in the current month
    const emiQuery = {
      text: `SELECT emi_id, emi_number, emi_amount, emi_date, emi_status 
      FROM emis 
      WHERE customer_id = $1 AND loan_id = $2
      AND EXTRACT(MONTH FROM emi_date) = $3`,
      values: [customer_id, loan_id, currentMonth],
    };
    const emiResult = await pool.query(emiQuery);
    console.log(emiResult.rows);
    const emis = emiResult.rows;

    if (emis[0] && emis[0].emi_status == "paid") {
      console.log("already paid");
      // Update the loans document to increment emis_paid_on_time
      const updateLoanQuery = {
        text: `UPDATE loans SET emis_paid_on_time = emis_paid_on_time - $1 WHERE loan_id = $2`,
        values: [1, loan_id],
      };
      await pool.query(updateLoanQuery);
      return res.status(http_codes.bad_request).json({
        success: false,
        message: "emi already paid for the month",
      });
    }
    // Process payment for each EMI in the current month
    for (const emi of emis) {
      const { emi_id, emi_amount } = emi;

      // Calculate the due installment amount
      const dueInstallmentAmount = emi_amount;

      // Recalculate the EMI amount if the payment amount is different from the due installment amount
      let newEmiAmount = dueInstallmentAmount;
      if (payment_amount !== dueInstallmentAmount) {
        // Implement your logic to recalculate the EMI amount here
        newEmiAmount = payment_amount;
      }

      // Update the status of the EMI
      let emi_status = "paid";
      if (newEmiAmount < dueInstallmentAmount) {
        emi_status = "partial";
      }

      const updateEmiStatusQuery = {
        text: `UPDATE emis SET emi_status = $1, emi_amount = $2 WHERE emi_id = $3`,
        values: [emi_status, newEmiAmount, emi_id],
      };
      await pool.query(updateEmiStatusQuery);
    }

    // Update the customer's current debt
    const updateCustomerQuery = {
      text: `UPDATE customers SET current_debt = current_debt - $1 WHERE customer_id = $2`,
      values: [payment_amount, customer_id],
    };
    await pool.query(updateCustomerQuery);

    // Respond with success message
    res.status(http_codes.success_code).json({
      success: true,
      message: "Payment made successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(http_codes.internal_server_error).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.viewStatement = () => {
  try {
  } catch (err) {
    console.log(err);
    return res.status(http_codes.internal_server_error).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
