-- Setup script for SQL Practice
-- Covers scenarios for: Filtering, NULLs, Window Functions, Joins, Dates, Arrays, Duplicates, Partitioning, Upserts

-- 1. CLEANUP
DROP TABLE IF EXISTS web_events;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

-- 2. TABLES

-- Customers (Standard dimension)
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    segment VARCHAR(20),
    created_at TIMESTAMP
);

-- Products (Contains Array for "Exploding" practice)
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100),
    category VARCHAR(50),
    price DECIMAL(10,2),
    tags TEXT[] -- Array type for UNSNEST/Explode practice
);

-- Orders (Standard fact table with NULLs in 'status' for NULL handling)
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    order_date TIMESTAMP,
    total_amount DECIMAL(10,2),
    status VARCHAR(20) -- Will contain NULLs
);

-- Web Events (Partitioned Table Example)
-- Postgres uses inheritance for partitioning, but declarative partitioning is available in v10+
CREATE TABLE web_events (
    event_id SERIAL, -- distinct from PK for partitioning
    event_time TIMESTAMP NOT NULL,
    user_id INTEGER,
    event_type VARCHAR(50),
    metadata JSONB, -- For generic map/complex type practice
    PRIMARY KEY (event_id, event_time)
) PARTITION BY RANGE (event_time);

-- Create Partitions (Simulating Partitioned Parquet/Delta)
CREATE TABLE web_events_y2024m01 PARTITION OF web_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE web_events_y2024m02 PARTITION OF web_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 3. DATA INSERTION

-- Customers
INSERT INTO customers (name, email, segment, created_at) VALUES
('Alice', 'alice@example.com', 'Premium', '2023-01-15'),
('Bob', 'bob@example.com', 'Basic', '2023-02-20'),
('Charlie', NULL, 'Basic', '2023-03-10'), -- NULL email
('David', 'david@example.com', 'Premium', '2023-01-05'),
('Eve', 'eve@example.com', NULL, '2023-05-01'); -- NULL segment

-- Products
INSERT INTO products (product_name, category, price, tags) VALUES
('Laptop Pro', 'Electronics', 1200.00, ARRAY['work', 'high-performance']),
('Gaming Mouse', 'Electronics', 50.00, ARRAY['gaming', 'rgb']),
('Coffee Mug', 'Home', 15.00, ARRAY['ceramic', 'kitchen']),
('Monitor', 'Electronics', 300.00, ARRAY['work', 'display']),
('Desk Chair', 'Furniture', 150.00, NULL); -- NULL tags

-- Orders
INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES
(1, '2024-01-10 10:00:00', 1250.00, 'COMPLETED'),
(1, '2024-02-15 14:30:00', 300.00, 'COMPLETED'),
(2, '2024-01-20 09:15:00', 50.00, 'PENDING'),
(3, '2024-01-25 11:00:00', 1200.00, NULL), -- NULL status
(2, '2024-02-10 16:45:00', 15.00, 'COMPLETED'),
(4, '2024-01-05 10:00:00', 2000.00, 'CANCELLED');

-- Web Events (With Duplicates for Dedup practice)
INSERT INTO web_events (event_id, event_time, user_id, event_type, metadata) VALUES
(1, '2024-01-01 10:00:00', 101, 'login', '{"device": "mobile"}'),
(2, '2024-01-01 10:05:00', 101, 'view_item', '{"item_id": 5}'),
(3, '2024-01-01 10:05:00', 101, 'view_item', '{"item_id": 5}'), -- EXACT DUPLICATE (logic dup)
(4, '2024-01-02 08:30:00', 102, 'login', '{"device": "desktop"}'),
(5, '2024-02-15 12:00:00', 101, 'purchase', '{"amount": 50}'),  -- Partition 2
(6, '2024-02-16 14:00:00', 103, 'login', '{"device": "mobile"}');

-- 4. SCENARIO PREP

-- Upsert Example Table (Delta Merge simulation)
CREATE TABLE user_dims (
    user_id INTEGER PRIMARY KEY,
    last_login TIMESTAMP,
    login_count INTEGER
);

INSERT INTO user_dims VALUES (1, '2024-01-01 00:00:00', 5);

-- Incremental Load Source
CREATE TABLE raw_events_stream (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    event_ts TIMESTAMP,
    processed_flag BOOLEAN DEFAULT FALSE
);
INSERT INTO raw_events_stream (user_id, event_ts) VALUES 
(1, NOW()), 
(2, NOW());

