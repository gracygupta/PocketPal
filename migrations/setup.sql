-- customers table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    age NUMERIC,
    phone_number VARCHAR(15),
    monthly_salary NUMERIC,
    approved_limit NUMERIC,
    current_debt NUMERIC
);

-- loans table
CREATE TABLE loans (
    loan_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    loan_amount NUMERIC,
    tenure INT,
    interest_rate NUMERIC,
    monthly_repayment NUMERIC,
    emis_paid_on_time INT,
    start_date DATE,
    end_date DATE
);

-- emis table
CREATE TABLE emis (
    emi_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    loan_id INT REFERENCES loans(loan_id),
    emi_number INT NOT NULL,
    emi_amount NUMERIC(10, 2) NOT NULL,
    emi_date DATE NOT NULL,
    emi_status VARCHAR(50) NOT NULL
);
