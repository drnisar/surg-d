-- Beds now come from the hospital API (codes like K031539), and tasks follow the patient across bed moves.
-- Separate statements: TiDB can't index a column added in the same ALTER.
ALTER TABLE tasks
  MODIFY bed_code VARCHAR(20) NOT NULL,
  ADD COLUMN patient_mr CHAR(14) NULL AFTER bed_code;

ALTER TABLE tasks ADD KEY idx_tasks_patient (patient_mr, status);
