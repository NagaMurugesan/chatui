-- setup.sql
-- Comprehensive Database Setup for Google SQL Interview Practice (75 Questions)

-- CLEANUP
DROP TABLE IF EXISTS employee_salary CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS sales_data CASCADE;
DROP TABLE IF EXISTS user_dim CASCADE;
DROP TABLE IF EXISTS cdc_log CASCADE;

-- ==========================================
-- 1. SCHEMA DEFINITION
-- ==========================================

-- HR Schema
CREATE TABLE departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(50)
);

CREATE TABLE employees (
    emp_id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    dept_id INTEGER, -- Nullable for "No Dept" cases
    manager_id INTEGER, -- Nullable for Hierarchy/Self-Join
    salary DECIMAL(10,2),
    joining_date DATE
);

-- Big Data / Events
CREATE TABLE user_activity (
    event_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    event_type VARCHAR(20),
    event_time TIMESTAMP,
    platform VARCHAR(20),
    metadata TEXT[] -- Array for UNNEST/Explode
);

-- Sales / Transactional
CREATE TABLE sales_data (
    sale_id SERIAL PRIMARY KEY,
    product_id INTEGER, -- Acts as UserID in some questions
    sale_date DATE,
    amount DECIMAL(10,2),
    region VARCHAR(20)
);

-- Dimensions / Upsert Targets
CREATE TABLE user_dim (
    user_id INTEGER PRIMARY KEY,
    is_active BOOLEAN,
    last_updated TIMESTAMP
);

-- CDC Log (For Topic 14/15)
CREATE TABLE cdc_log (
    log_id SERIAL PRIMARY KEY,
    entity_id INTEGER,
    op_type VARCHAR(10), -- INSERT, UPDATE, DELETE
    op_time TIMESTAMP,
    data JSONB
);

-- ==========================================
-- 2. DATA POPULATION
-- ==========================================

-- 2.1 DEPARTMENTS
INSERT INTO departments (dept_id, dept_name) VALUES
(1, 'Engineering'),
(2, 'Sales'),
(3, 'Marketing'),
(4, 'Human Resources'),
(5, 'Product');

-- 2.2 EMPLOYEES
-- Designed to cover: Hierarchy, NULLs, Salary ranges, Joining Dates
INSERT INTO employees (emp_id, name, dept_id, manager_id, salary, joining_date) VALUES
-- Engineering (Hierarchy: Alice -> Bob -> Charlie/David)
(1, 'Alice', 1, NULL, 150000, '2019-01-15'),      -- VP (No Manager)
(2, 'Bob', 1, 1, 120000, '2020-02-01'),           -- Manager
(3, 'Charlie', 1, 2, 95000, '2021-03-10'),        -- SWE (Joined 2021)
(4, 'David', 1, 2, 92000, '2021-04-15'),          -- SWE (Joined 2021)
(5, 'Eve', 1, 2, 88000, '2023-11-20'),            -- Recent join (Last 30 days check dynamic)

-- Sales (Gap Analysis & Duplicates)
(6, 'Frank', 2, 1, 130000, '2020-01-10'),
(7, 'Grace', 2, 6, 80000, '2021-05-20'),
(8, 'Heidi', 2, 6, 60000, '2021-06-01'),          -- Big gap from Grace (80k -> 60k)

-- Marketing (NULL Salaries, Low Salaries)
(9, 'Ivan', 3, NULL, NULL, '2022-01-05'),         -- NULL Salary
(10, 'Judy', 3, 9, 45000, '2022-02-15'),
(11, 'Mallory', 3, 9, 46000, '2022-03-01'),

-- No Department / No Manager
(12, 'Oscar', NULL, NULL, 75000, '2023-01-01'),   -- NULL Dept, NULL Manager

-- Duplicates for De-dup practice (Same name/dept distinct check)
(13, 'DuplicateDave', 4, NULL, 50000, '2023-01-01'),
(14, 'DuplicateDave', 4, NULL, 50000, '2023-01-01');

-- Dynamic date update for "Last 30 Days" question
UPDATE employees SET joining_date = CURRENT_DATE - INTERVAL '10 days' WHERE name = 'Eve';


-- 2.3 USER ACTIVITY
-- Designed to cover: Arrays, Duplicates, Time Windows, Skew
INSERT INTO user_activity (user_id, event_type, event_time, platform, metadata) VALUES
-- User 101: Normal behavior
(101, 'login', '2024-01-01 10:00:00', 'ios', ARRAY['v1.2', 'marketing']),
(101, 'view', '2024-01-01 10:05:00', 'ios', ARRAY['item_123', 'sale']),
(101, 'view', '2024-01-01 10:05:00', 'ios', ARRAY['item_123']), -- Duplicate event (Exact)
(101, 'logout', '2024-01-01 10:30:00', 'ios', NULL),

-- User 102: Skew Simulation (Many events)
(102, 'login', '2024-01-02 08:30:00', 'web', ARRAY['chrome']),
(102, 'view', '2024-01-02 08:31:00', 'web', ARRAY['item_A']),
(102, 'view', '2024-01-02 08:32:00', 'web', ARRAY['item_B']),
(102, 'view', '2024-01-02 08:33:00', 'web', ARRAY['item_C']),
(102, 'purchase', '2024-01-02 09:00:00', 'web', ARRAY['coupon_50']),

-- User 103: Specific Tags for Array Search
(103, 'login', '2024-01-03 12:00:00', 'android', ARRAY['referral', 'sale']), 
(103, 'view', '2024-01-03 12:05:00', 'android', ARRAY['item_999']),

-- Islands Problem (Consecutive Days)
(104, 'login', '2024-02-01 10:00:00', 'web', NULL),
(104, 'login', '2024-02-02 10:00:00', 'web', NULL),
(104, 'login', '2024-02-03 10:00:00', 'web', NULL); -- 3 consecutive days


-- 2.4 SALES DATA
-- Designed to cover: Pivots, MoM Growth, Joins
INSERT INTO sales_data (sale_id, product_id, sale_date, amount, region) VALUES
-- ProductID 101/102 matches UserIDs for joins
(1, 101, '2024-01-01', 100.00, 'North'),
(2, 102, '2024-01-01', 150.00, 'South'),
(3, 101, '2024-01-02', 120.00, 'North'),
(4, 103, '2024-01-02', 200.00, 'East'),
(5, 102, '2024-01-03', 130.00, 'South'),

-- Month 2 (Feb) for Growth Calc
(6, 101, '2024-02-01', 110.00, 'North'), -- 10% growth if base was 100
(7, 102, '2024-02-15', 300.00, 'South'), -- Big jump

-- Distinct from users
(8, 999, '2024-03-01', 50.00, 'West');


-- 2.5 USER DIM (Upserts)
INSERT INTO user_dim (user_id, is_active, last_updated) VALUES 
(101, true, '2024-01-01 00:00:00'),
(102, true, '2024-01-02 00:00:00'),
(105, false, '2023-12-31 00:00:00'); -- Inactive


-- 2.6 CDC LOG (Watermarking/CDC)
INSERT INTO cdc_log (entity_id, op_type, op_time, data) VALUES
(1, 'INSERT', '2024-01-01 10:00:00', '{"val": 10}'),
(1, 'UPDATE', '2024-01-01 10:05:00', '{"val": 20}'),
(2, 'INSERT', '2024-01-02 11:00:00', '{"val": 50}');

-- 2.7 STOCK PRICES
DROP TABLE IF EXISTS stock_prices;
CREATE TABLE stock_prices (
    ticker VARCHAR(10),
    trade_date DATE,
    close_price DECIMAL(10,2)
);

INSERT INTO stock_prices (ticker, trade_date, close_price) VALUES
('AAPL', '2024-01-01', 150.00),
('AAPL', '2024-01-02', 152.00),
('AAPL', '2024-01-03', 155.00), -- Up
('AAPL', '2024-01-04', 153.00), -- Down
('AAPL', '2024-01-05', 158.00),
('AAPL', '2024-01-06', 160.00),
('AAPL', '2024-01-07', 159.00),
('GOOGL', '2024-01-01', 2800.00),
('GOOGL', '2024-01-02', 2810.00),
('GOOGL', '2024-01-03', 2825.00);

-- Additional Employees (Let SERIAL handle IDs)
INSERT INTO employees (name, dept_id, salary, joining_date) VALUES 
('Quinn', 1, 95000, '2022-06-01'), -- Tie with Charlie
('Rachel', 1, 105000, '2022-07-01'),
('Sam', 1, 110000, '2022-08-01'),
('Tom', 1, 115000, '2022-09-01');
```
