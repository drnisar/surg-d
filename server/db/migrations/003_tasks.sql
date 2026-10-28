CREATE TABLE IF NOT EXISTS tasks (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bed_code      VARCHAR(10)  NOT NULL,
  description   VARCHAR(500) NOT NULL,
  assigned_to   INT UNSIGNED NOT NULL,
  assigned_by   INT UNSIGNED NULL,
  status        ENUM('open', 'completed') NOT NULL DEFAULT 'open',
  completed_by  INT UNSIGNED NULL,
  completed_at  TIMESTAMP    NULL,
  -- When the assignee first saw the task; NULL drives the notification badge.
  seen_at       TIMESTAMP    NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tasks_assignee (assigned_to, status),
  KEY idx_tasks_bed (bed_code, status),
  KEY idx_tasks_completed (status, completed_at),
  CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES employees (id),
  CONSTRAINT fk_tasks_assigned_by FOREIGN KEY (assigned_by) REFERENCES employees (id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_completed_by FOREIGN KEY (completed_by) REFERENCES employees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
