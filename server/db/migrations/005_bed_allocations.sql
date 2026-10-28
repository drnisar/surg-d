-- Standing allocation of beds to the doctors responsible for them. Keyed by bed, not patient,
-- so whoever is admitted to a bed falls under its doctors; several doctors may share a bed.
CREATE TABLE IF NOT EXISTS bed_allocations (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bed_code     VARCHAR(20)  NOT NULL,
  employee_id  INT UNSIGNED NOT NULL,
  assigned_by  INT UNSIGNED NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bed_alloc (bed_code, employee_id),
  KEY idx_bed_alloc_employee (employee_id),
  CONSTRAINT fk_bed_alloc_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
  CONSTRAINT fk_bed_alloc_assigned_by FOREIGN KEY (assigned_by) REFERENCES employees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
