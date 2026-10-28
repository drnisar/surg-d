-- Last bed list from the hospital API, shared by every server instance. On Vercel each cold start
-- would otherwise wait for the slow hospital system. A single row (id = 1); fetched_at is epoch ms.
CREATE TABLE IF NOT EXISTS beds_cache (
  id          TINYINT UNSIGNED PRIMARY KEY,
  beds        JSON            NOT NULL,
  fetched_at  BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
