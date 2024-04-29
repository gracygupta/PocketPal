# Project Title

A brief description of what this project does and who it's for.

## Overview

This project is designed to provide an API for managing loans, EMIs, and payments in a financial system. It allows users to view loan statements, make payments towards EMIs, and manage customer and loan records.

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
