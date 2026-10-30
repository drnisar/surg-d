export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  // Lets the admin act as another user for testing. On by default except in production.
  allowImpersonation: process.env.ALLOW_IMPERSONATION
    ? process.env.ALLOW_IMPERSONATION === 'true'
    : process.env.NODE_ENV !== 'production',
  impersonationExpiresIn: '2h',
  // Hospital system: admitted patients and their beds. It is slow (~10 s), so results are cached.
  bedsApi: {
    url: process.env.BEDS_API_URL ?? 'http://182.188.28.220:8034/api/Patient/GetDoctorAdmittedPatients',
    cacheSeconds: Number(process.env.BEDS_CACHE_SECONDS ?? 300),
    timeoutMs: Number(process.env.BEDS_TIMEOUT_MS ?? 30000),
    // Pseudo-beds that are not ward beds. ORHB is a holding area with long-stale admissions (ORHB-1, ORHB-5, …).
    excludeBeds: (process.env.BEDS_EXCLUDE ?? 'ORHB').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
  },
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'surgd',
    password: process.env.DB_PASSWORD ?? 'surgd',
    database: process.env.DB_NAME ?? 'surg_d',
    // Cloud MySQL (e.g. TiDB Cloud) requires TLS; the local server doesn't.
    ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  },
};
