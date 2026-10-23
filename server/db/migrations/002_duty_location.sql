-- Each shift is subdivided by place of duty. The existing unique key
-- (duty_date, shift, employee_id) keeps an employee in one place per shift.
ALTER TABLE duty_assignments
  ADD COLUMN location ENUM('ward', 'sau', 'or', 'opd') NOT NULL DEFAULT 'ward' AFTER shift,
  ADD KEY idx_duty_slot (duty_date, shift, location);

ALTER TABLE duty_assignments ALTER COLUMN location DROP DEFAULT;
