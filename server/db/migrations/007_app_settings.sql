-- Settings changed by the admin on the Setup page, as one JSON row (id = 1).
-- No row means every setting is at its default (SETTINGS_DEFAULTS in shared/).
CREATE TABLE IF NOT EXISTS app_settings (
  id          TINYINT UNSIGNED PRIMARY KEY,
  settings    JSON         NOT NULL,
  updated_by  INT UNSIGNED NULL,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_settings_updated_by FOREIGN KEY (updated_by) REFERENCES employees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
