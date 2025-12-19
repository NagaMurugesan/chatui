# Google SQL Interview Practice: Questions & Solutions

This guide covers 15 core topics for Google SQL interviews, ranging from Average to Very Complex.
Tables used: `employees`, `departments`, `user_activity`, `sales_data`.

---

## 1. Filtering Rows (WHERE vs HAVING)

1. **Average**: Find all employees in the 'Engineering' department with a salary > 100k.
   ```sql
   SELECT e.name 
   FROM employees e 
   JOIN departments d ON e.dept_id = d.dept_id 
   WHERE d.dept_name = 'Engineering' AND e.salary > 100000;
   ```

2. **Average**: Find employees who joined in 2021.
   ```sql
   SELECT name, joining_date 
   FROM employees 
   WHERE joining_date >= '2021-01-01' AND joining_date <= '2021-12-31';
   ```

3. **Complex**: Find departments where the *average* salary is greater than $100k. (Requires HAVING)
   ```sql
   SELECT d.dept_name, AVG(e.salary) as avg_sal
   FROM employees e
   JOIN departments d ON e.dept_id = d.dept_id
   GROUP BY d.dept_name
   HAVING AVG(e.salary) > 100000;
   ```

4. **Complex**: Find the department IDs that have more than 2 employees.
   ```sql
   SELECT dept_id
   FROM employees
   GROUP BY dept_id
   HAVING COUNT(*) > 2;
   ```

5. **Very Complex**: Find departments where at least 2 employees earn more than $90k, but checking *before* aggregation to optimize.
   ```sql
   SELECT d.dept_name
   FROM employees e
   JOIN departments d ON e.dept_id = d.dept_id
   WHERE e.salary > 90000
   GROUP BY d.dept_name
   HAVING COUNT(*) >= 2;
   ```

---

## 2. Handling NULLs (COALESCE, IS NULL)

1. **Average**: List employees who do not belong to a department.
   ```sql
   SELECT name FROM employees WHERE dept_id IS NULL;
   ```

2. **Average**: List employees who HAVE a manager.
   ```sql
   SELECT name FROM employees WHERE manager_id IS NOT NULL;
   ```

3. **Complex**: Display employee name and department name. If department is NULL, display 'No Dept'.
   ```sql
   SELECT e.name, COALESCE(d.dept_name, 'No Dept') as dept
   FROM employees e
   LEFT JOIN departments d ON e.dept_id = d.dept_id;
   ```

4. **Complex**: Calculate the total salary of a department, but treat any NULL employee salaries as 50000 (standard entry level).
   ```sql
   SELECT dept_id, SUM(COALESCE(salary, 50000)) 
   FROM employees 
   GROUP BY dept_id;
   ```

5. **Very Complex**: Calculate the average salary of all employees, treating NULL salaries (if any) as 0, AND specific logic: if an employee has no manager (NULL), treat them as their own manager for grouping.
   ```sql
   SELECT COALESCE(e.manager_id, e.emp_id) as reporting_lead, AVG(COALESCE(e.salary, 0))
   FROM employees e
   GROUP BY 1;
   ```

---

## 3. Window Functions (ROW_NUMBER, RANK, DENSE_RANK)

1. **Average**: Rank employees by salary within each department.
   ```sql
   SELECT name, dept_id, salary,
          RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as rnk
   FROM employees;
   ```

2. **Average**: Assign a unique row number to every employee ordered by joining date.
   ```sql
   SELECT name, ROW_NUMBER() OVER (ORDER BY joining_date) as join_rank 
   FROM employees;
   ```

3. **Complex**: Find the top 3 highest-paid employees in *each* department.
   ```sql
   WITH Ranked AS (
       SELECT name, dept_id, salary,
              DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as rnk
       FROM employees
   )
   SELECT * FROM Ranked WHERE rnk <= 3;
   ```

4. **Complex**: Calculate the cumulative salary distribution for the whole company.
   ```sql
   SELECT name, salary, 
          CUME_DIST() OVER (ORDER BY salary) as percentile
   FROM employees;
   ```

5. **Very Complex**: Identify the "Gap" employees. Find employees who earn less than the employee immediately preceding them in salary rank, but by a margin of more than 10k.
   ```sql
   WITH Lagged AS (
       SELECT name, salary,
              LAG(salary) OVER (ORDER BY salary DESC) as prev_salary
       FROM employees
   )
   SELECT name, salary, prev_salary, (prev_salary - salary) as gap
   FROM Lagged
   WHERE (prev_salary - salary) > 10000;
   ```

---

## 4. Aggregations (GROUP BY & HAVING)

1. **Average**: Count employees per department.
   ```sql
   SELECT dept_id, COUNT(*) FROM employees GROUP BY dept_id;
   ```

2. **Average**: Find the minimum and maximum salary for the whole company.
   ```sql
   SELECT MIN(salary), MAX(salary) FROM employees;
   ```

3. **Complex**: Calculate the running total of salary expenses by joining date.
   ```sql
   SELECT joining_date, salary,
          SUM(salary) OVER (ORDER BY joining_date) as running_total
   FROM employees;
   ```

4. **Complex**: Find the average salary per department, but only include departments with more than 3 employees.
   ```sql
   SELECT dept_id, AVG(salary) 
   FROM employees 
   GROUP BY dept_id 
   HAVING COUNT(*) > 3;
   ```

5. **Very Complex**: Find the month-over-month growth rate of total sales.
   ```sql
   WITH MonthlySales AS (
       SELECT DATE_TRUNC('month', sale_date) as mth, SUM(amount) as total
       FROM sales_data GROUP BY 1
   )
   SELECT mth, total,
          LAG(total) OVER (ORDER BY mth) as prev_total,
          ((total - LAG(total) OVER (ORDER BY mth)) / NULLIF(LAG(total) OVER (ORDER BY mth),0)) * 100 as growth_pct
   FROM MonthlySales;
   ```

---

## 5. Joining Large Tables (Broadcast vs Shuffle)

1. **Average**: Join Employees and Departments.
   ```sql
   SELECT * FROM employees e JOIN departments d ON e.dept_id = d.dept_id;
   ```

2. **Average**: Find all employees and their manager's name. (Self Join)
   ```sql
   SELECT e.name as emp, m.name as mgr 
   FROM employees e LEFT JOIN employees m ON e.manager_id = m.emp_id;
   ```

3. **Complex**: Join `user_activity` logs with `sales_data` on `user_id` where timestamps match within 1 hour.
   ```sql
   SELECT u.user_id, u.event_type, s.amount
   FROM user_activity u
   JOIN sales_data s ON u.user_id = s.sale_id
   WHERE s.sale_date BETWEEN u.event_time AND u.event_time + INTERVAL '1 hour';
   ```

4. **Complex**: Simulate a "Broadcast Join" filter. Find user activities only for users who have made a sale > $1000.
   ```sql
   -- The subquery on sales_data is small and can be broadcasted
   SELECT * FROM user_activity 
   WHERE user_id IN (SELECT DISTINCT product_id FROM sales_data WHERE amount > 1000);
   ```

5. **Very Complex**: Skewed Join Handling. (Explain or simulate salting).
   *Scenario*: One department has 99% of employees.
   *Solution logic*: "Salt" the joining key (add random suffix 1-N) to distribute the reducer load, then join on `key_salt`.

---

## 6. UNION vs UNION ALL

1. **Average**: Combine a list of active users from two tables.
   ```sql
   SELECT user_id FROM user_dim UNION SELECT user_id FROM sales_data; 
   -- Removes duplicates
   ```

2. **Average**: Combine user IDs from A and B, keeping duplicates.
   ```sql
   SELECT user_id FROM user_dim UNION ALL SELECT user_id FROM sales_data;
   ```

3. **Complex**: Combine logs for performance, keeping duplicates for auditing.
   ```sql
   SELECT event_id, 'activity' as source FROM user_activity
   UNION ALL
   SELECT sale_id, 'sales' as source FROM sales_data;
   ```

4. **Complex**: Find user IDs that exist in BOTH `user_activity` and `sales_data` (INTERSECT simulation or explicit).
   ```sql
   SELECT user_id FROM user_activity
   INTERSECT
   SELECT product_id FROM sales_data; -- Assuming product_id maps to user for this example
   ```

5. **Very Complex**: Merge three tables with different schemas into a single view with NULLs for missing columns.
   ```sql
   SELECT name, salary, NULL as amount FROM employees
   UNION ALL
   SELECT NULL, NULL, amount FROM sales_data;
   ```

---

## 7. Case When Logic

1. **Average**: Label salaries as 'High', 'Medium', 'Low'.
   ```sql
   SELECT name, salary,
          CASE WHEN salary > 120000 THEN 'High'
               WHEN salary > 90000 THEN 'Medium'
               ELSE 'Low' END as category
   FROM employees;
   ```

2. **Average**: Return 'Yes' if employee has a manager, 'No' otherwise.
   ```sql
   SELECT name, CASE WHEN manager_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_manager
   FROM employees;
   ```

3. **Complex**: Sum distinct types of events in `user_activity` into columns.
   ```sql
   SELECT user_id, 
          SUM(CASE WHEN event_type = 'login' THEN 1 ELSE 0 END) as logins,
          SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views
   FROM user_activity GROUP BY user_id;
   ```

4. **Complex**: Custom sort order: Dept ID 2 first, then 1, then the rest.
   ```sql
   SELECT * FROM departments
   ORDER BY CASE WHEN dept_id = 2 THEN 0 WHEN dept_id = 1 THEN 1 ELSE 2 END;
   ```

5. **Very Complex**: Create a pivot-like report using CASE. Count employees in each salary bucket per department in one row per dept.
   ```sql
   SELECT dept_id,
          COUNT(CASE WHEN salary > 120000 THEN 1 END) as count_high,
          COUNT(CASE WHEN salary BETWEEN 90000 AND 120000 THEN 1 END) as count_med,
          COUNT(CASE WHEN salary < 90000 THEN 1 END) as count_low
   FROM employees
   GROUP BY dept_id;
   ```

---

## 8. Date/Time Manipulations

1. **Average**: Find employees joined in the last 30 days.
   ```sql
   SELECT * FROM employees WHERE joining_date > CURRENT_DATE - INTERVAL '30 days';
   ```

2. **Average**: Extract year and month from joining date.
   ```sql
   SELECT name, EXTRACT(YEAR FROM joining_date), EXTRACT(MONTH FROM joining_date)
   FROM employees;
   ```

3. **Complex**: Find the number of days between an employee's joining date and their manager's joining date.
   ```sql
   SELECT e.name, m.name as manager, 
          (e.joining_date - m.joining_date) as days_diff
   FROM employees e
   JOIN employees m ON e.manager_id = m.emp_id;
   ```

4. **Complex**: Truncate timestamps to the nearest hour for grouping.
   ```sql
   SELECT DATE_TRUNC('hour', event_time) as hour_bucket, COUNT(*)
   FROM user_activity
   GROUP BY 1;
   ```

5. **Very Complex**: Find users who logged in on 3 distinct consecutive days. (Islands problem).
   ```sql
   WITH Dates AS (
       SELECT DISTINCT user_id, DATE(event_time) as dt
       FROM user_activity WHERE event_type = 'login'
   )
   SELECT user_id 
   FROM Dates d1
   JOIN Dates d2 ON d1.user_id = d2.user_id AND d2.dt = d1.dt + 1
   JOIN Dates d3 ON d1.user_id = d3.user_id AND d3.dt = d1.dt + 2;
   ```

---

## 9. Removing Duplicates (Simulate Dedup)

1. **Average**: Distinct users from logs.
   ```sql
   SELECT DISTINCT user_id FROM user_activity;
   ```

2. **Average**: Count unique event types.
   ```sql
   SELECT COUNT(DISTINCT event_type) FROM user_activity;
   ```

3. **Complex**: Find duplicates in a table based on `name` and `dept_id`.
   ```sql
   SELECT name, dept_id, COUNT(*)
   FROM employees
   GROUP BY name, dept_id
   HAVING COUNT(*) > 1;
   ```

4. **Complex**: Select the lowest employee ID for each unique user name (simple dedup).
   ```sql
   SELECT MIN(emp_id), name FROM employees GROUP BY name;
   ```

5. **Very Complex**: De-duplicate `user_activity` keeping only the *latest* event for each user/type.
   ```sql
   WITH Deduped AS (
       SELECT *,
              ROW_NUMBER() OVER (PARTITION BY user_id, event_type ORDER BY event_time DESC) as rn
       FROM user_activity
   )
   SELECT * FROM Deduped WHERE rn = 1;
   ```

---

## 10. Pivot / Unpivot

1. **Average**: Manually display dept_id 1 salary and dept_id 2 salary in one row (hardcoded).
   ```sql
   SELECT 
       MAX(CASE WHEN dept_id = 1 THEN salary END) as dept1,
       MAX(CASE WHEN dept_id = 2 THEN salary END) as dept2
   FROM employees;
   ```

2. **Complex**: Pivot Sales data to show Total Sales per Region (Columns) for each Date (Row).
   ```sql
   SELECT sale_date,
          SUM(CASE WHEN region='North' THEN amount ELSE 0 END) as North,
          SUM(CASE WHEN region='South' THEN amount ELSE 0 END) as South
   FROM sales_data
   GROUP BY sale_date;
   ```

3. **Complex**: Unpivot - Normalize a table where 'North', 'South' are columns into 'Region', 'Amount' rows.
   ```sql
   SELECT sale_date, 'North' as region, north_amount as amount FROM table_pivoted
   UNION ALL
   SELECT sale_date, 'South' as region, south_amount as amount FROM table_pivoted;
   ```

4. **Complex**: Create a cross-tabulation of Event Type vs Platform.
   ```sql
   SELECT event_type,
          SUM(CASE WHEN platform = 'ios' THEN 1 ELSE 0 END) as ios,
          SUM(CASE WHEN platform = 'web' THEN 1 ELSE 0 END) as web
   FROM user_activity
   GROUP BY event_type;
   ```

5. **Very Complex**: Dynamic Pivot (Postgres specific `crosstab`, or explanation).
   *Concept*: SQL requires known columns at compile time. For dynamic columns (unknown number of regions), you need a stored procedure or application-side pivoting.

---

## 11. Array Operations (Explode)

1. **Average**: Check if a tag array contains 'sale'.
   ```sql
   SELECT * FROM user_activity WHERE 'sale' = ANY(metadata);
   ```

2. **Average**: Find the length of the metadata array.
   ```sql
   SELECT event_id, ARRAY_LENGTH(metadata, 1) FROM user_activity;
   ```

3. **Complex**: Explode (Unnest) the metadata array to count frequency of each tag.
   ```sql
   SELECT tag, COUNT(*)
   FROM user_activity,
        UNNEST(metadata) as tag
   GROUP BY tag;
   ```

4. **Complex**: Filter rows where the array contains ALL of certain tags (subset).
   ```sql
   SELECT * FROM user_activity WHERE metadata @> ARRAY['chrome', 'referral'];
   ```

5. **Very Complex**: Re-aggregate unnested rows back into an array using `ARRAY_AGG`.
   ```sql
   SELECT user_id, ARRAY_AGG(DISTINCT tag) 
   FROM (
       SELECT user_id, UNNEST(metadata) as tag FROM user_activity
   ) t
   GROUP BY user_id;
   ```

---

## 12. Partitioning

1. **Average**: Concept - Why partition? (Pruning).
   *Query*: select * from logs where date = '2024-01-01' -> Scans only one folder/file.

2. **Average**: Query a specific partition directly (optional optimization).
   ```sql
   SELECT * FROM user_activity_2024_01; -- If manually managed
   ```

3. **Complex**: Define a partition check constraint query.
   *(Conceptual)*: `CREATE TABLE part_1 CHECK (date >= '2024-01-01' AND date < '2024-02-01')`.

4. **Complex**: Insert data routed to partitions.
   ```sql
   INSERT INTO user_activity (event_time, ...) VALUES ('2024-01-15', ...); 
   -- DB engine routes to Partition Jan_2024
   ```

5. **Very Complex**: How to optimize querying a 10TB logs table by date?
   **Answer**: Partition by Date (Year/Month/Day), use clustered columns within partitions.

---

## 13. Upserts (MERGE)

1. **Average**: Standard Insert.
   ```sql
   INSERT INTO user_dim (user_id) VALUES (1);
   ```

2. **Complex**: Insert or Do Nothing (Idempotent).
   ```sql
   INSERT INTO user_dim VALUES (1, true, NOW()) ON CONFLICT (user_id) DO NOTHING;
   ```

3. **Complex**: Update a user's status if they exist, insert if they don't.
   ```sql
   INSERT INTO user_dim (user_id, is_active, last_updated)
   VALUES (105, true, NOW())
   ON CONFLICT (user_id) 
   DO UPDATE SET 
       is_active = EXCLUDED.is_active,
       last_updated = EXCLUDED.last_updated;
   ```

4. **Complex**: Merge Statement (Standard SQL / BigQuery / Delta).
   ```sql
   MERGE INTO target t USING source s ON t.id = s.id
   WHEN MATCHED THEN UPDATE SET t.val = s.val
   WHEN NOT MATCHED THEN INSERT (id, val) VALUES (s.id, s.val);
   ```

5. **Very Complex**: Soft Delete via Upsert.
   *Logic*: Incoming record has `delete_flag=true`. Upsert it to set `is_active=false` in target.

---

## 14. Incremental Load (Watermarking)

1. **Average**: Select all new records.
   ```sql
   SELECT * FROM source WHERE created_at > '2024-01-01 00:00:00';
   ```

2. **Complex**: Watermark Strategy.
   1. Get `max(event_time)` from Target table.
   2. Select from Source where `event_time > max_event_time`.
   ```sql
   SELECT * FROM user_activity 
   WHERE event_time > (SELECT MAX(last_updated) FROM user_dim);
   ```

3. **Complex**: Handling Late Arriving Data.
   *Logic*: Use updated_at timestamp instead of created_at. Or re-process a sliding window (last 3 days) every time.

4. **Very Complex**: CDC (Change Data Capture) log processing.
   *Query*: Identify latest state from a log of inserts/updates/deletes.
   ```sql
   SELECT * FROM (
       SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY op_time DESC) as rn 
       FROM cdc_log
   ) WHERE rn=1 AND op_type != 'DELETE';
   ```

5. **Very Complex**: Deduplicating across Batch boundaries.
   *Logic*: Store a `processed_ids` bloom filter or table to check against incoming batch.

---

## 15. Debugging Failures (Skew/OOM)

1. **Average**: Count distribution of keys.
   ```sql
   SELECT user_id, COUNT(*) FROM user_activity GROUP BY user_id;
   ```

2. **Complex**: Identify Skew.
   ```sql
   SELECT user_id, COUNT(*) 
   FROM user_activity 
   GROUP BY user_id 
   ORDER BY COUNT(*) DESC 
   LIMIT 10;
   ```

3. **Complex**: Check for Cartesian Product (Explosion).
   *Check*: `COUNT(*)` of Join Result vs `COUNT(*)` of Source tables. If Result >> Sum(Sources), you have a many-to-many explosion.

4. **Very Complex**: Handling NULL in Join Keys (Common skew source).
   *Fix*: `ON a.key = b.key` -> NULL joins to nothing? Or NULL joins to NULL (if `IS NOT DISTINCT FROM`) causing skew? 
   *Query*: Filter out NULLs before joining high-volume tables.

5. **Very Complex**: Salting Technique query.
   ```sql
   SELECT FLOOR(RANDOM()*10) as salt, user_id, ... FROM huge_table;
   -- Group by salt, user_id to pre-aggregate
   ```

---

## 16. Advanced Window Functions (Comprehensive)

1. **NTILE (Bucketing)**: Divide employees into 4 salary quartiles (buckets) within each department.
   ```sql
   SELECT name, dept_id, salary,
          NTILE(4) OVER (PARTITION BY dept_id ORDER BY salary DESC) as quartile
   FROM employees;
   ```

2. **LAG/LEAD (Offset Access)**: Compare today's stock price with yesterday's price.
   ```sql
   SELECT ticker, trade_date, close_price,
          LAG(close_price) OVER (PARTITION BY ticker ORDER BY trade_date) as prev_day_price,
          (close_price - LAG(close_price) OVER (PARTITION BY ticker ORDER BY trade_date)) as daily_change
   FROM stock_prices;
   ```

3. **FIRST_VALUE / LAST_VALUE**: Show every employee along with the highest paid employee in their department.
   ```sql
   SELECT name, dept_id, salary,
          FIRST_VALUE(name) OVER (PARTITION BY dept_id ORDER BY salary DESC) as highest_paid_in_dept
   FROM employees;
   ```

4. **Window Frames (Running Moving Average)**: Calculate a 3-day moving average of stock prices (Current row + 2 preceding).
   ```sql
   SELECT ticker, trade_date, close_price,
          AVG(close_price) OVER (
              PARTITION BY ticker 
              ORDER BY trade_date 
              ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
          ) as moving_avg_3d
   FROM stock_prices;
   ```

5. **PERCENT_RANK / CUME_DIST**: Calculate the relative rank (percentile) of each employee's salary.
   ```sql
   SELECT name, salary,
          PERCENT_RANK() OVER (ORDER BY salary) as pct_rank,
          CUME_DIST() OVER (ORDER BY salary) as cume_dist
   FROM employees;
   ```

6. **NTH_VALUE**: Find the 2nd highest salary in each department.
   ```sql
   SELECT DISTINCT dept_id,
          NTH_VALUE(salary, 2) OVER (
              PARTITION BY dept_id 
              ORDER BY salary DESC 
              RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
          ) as second_highest
   FROM employees;
   ```
