const http_codes = require("../constants/http_codes");
const pool = require("../db/connection");

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