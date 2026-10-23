CREATE TABLE IF NOT EXISTS employees (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mr_number       CHAR(14)     NOT NULL,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(190) NOT NULL,
  official_email  VARCHAR(190) NOT NULL,
  country_code    VARCHAR(5)   NOT NULL,
  phone_number    VARCHAR(12)  NOT NULL,
  designation     ENUM(
                    'professor',
                    'associate_professor',
                    'assistant_professor',
                    'experiential_registrar',
                    'trainee_registrar',
                    'trainee_medical_officer',
                    'house_officer',
                    'nurse'
                  ) NULL,
  role            ENUM('admin', 'consultant', 'manager', 'doctor', 'nurse') NOT NULL,
  password_hash   VARCHAR(255) NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employees_mr (mr_number),
  UNIQUE KEY uq_employees_email (email),
  UNIQUE KEY uq_employees_official_email (official_email),
  KEY idx_employees_designation (designation),
  KEY idx_employees_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS duty_assignments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  duty_date    DATE         NOT NULL,
  shift        ENUM('morning', 'evening') NOT NULL,
  employee_id  INT UNSIGNED NOT NULL,
  assigned_by  INT UNSIGNED NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_duty_slot_employee (duty_date, shift, employee_id),
  KEY idx_duty_employee (employee_id),
  CONSTRAINT fk_duty_employee FOREIGN KEY (employee_id) REFERENCES employees (id),
  CONSTRAINT fk_duty_assigned_by FOREIGN KEY (assigned_by) REFERENCES employees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
