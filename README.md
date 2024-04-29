# PocketPal
Credit Approval System

## Overview

The Credit Approval System project involves creating a system for assessing credit approval based on past data and future transactions. This system will analyze past loan data, customer credit history, and current financial transactions to determine the eligibility of customers for credit approval. It will involve tasks such as fetching and processing loan data, calculating credit scores, managing EMIs (Equated Monthly Installments), and updating customer and loan records in a database.

## Features

- View and manage loans
- Calculate and process EMI payments
- Update customer records and track loan repayments

## Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js installed on your machine
- PostgreSQL installed and running
- Necessary environment variables set up (e.g., database connection strings)

## Installation

Clone the repository to your local machine:
```bash
git clone https://github.com/gracygupta/PocketPal.git
cd PocketPal
```

Install the required dependencies:
```bash
npm install
```

Make .env file in the root directory with parameter:
```bash
PORT = <PROJECT PORT>
USER = <DB USER>
HOST = <DB HOST>
DATABASE = <DATABASE NAME>
PASSWORD = <DB USER PASSWORD>
DB_PORT = <DB PORT>
```

Set up the database by running the migration scripts provided in the migrations folder:
```bash
psql -U username -d dbname -a -f migrations/setup.sql
```

Start the server:
```bash
npm start
```

## API Documentation
For detailed information on the API endpoints and how to use them, please refer to our API documentation:
[API DOCUMENTATION](https://documenter.getpostman.com/view/24067724/2sA3BuWUZb)
