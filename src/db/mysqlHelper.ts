import mysql from 'mysql2/promise';

// Check if MySQL connection environment variables are available
export const isMysqlConfigured = (): boolean => {
  return !!(
    process.env.DB_HOST ||
    process.env.DB_USER ||
    process.env.DB_PASSWORD ||
    process.env.DB_NAME
  );
};

let pool: mysql.Pool | null = null;

export const getMysqlPool = (): mysql.Pool => {
  if (!pool) {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || '';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || '';

    console.log(`[SiteGuard] Connecting to MySQL on ${host}:${port}, database: ${database}`);

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    });
  }
  return pool;
};

// Auto-run schema migrations to set up the MySQL tables if they do not exist
export const initMysqlSchema = async (): Promise<void> => {
  if (!isMysqlConfigured()) return;

  const dbPool = getMysqlPool();
  const connection = await dbPool.getConnection();
  try {
    console.log('[SiteGuard] Verifying MySQL database schema tables...');

    // 1. websites table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`websites\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`url\` TEXT NOT NULL,
        \`clientName\` VARCHAR(255) DEFAULT 'Admin',
        \`contactEmail\` VARCHAR(255) DEFAULT '',
        \`monitoringInterval\` INT DEFAULT 5,
        \`enabled\` TINYINT(1) DEFAULT 1,
        \`status\` VARCHAR(50) DEFAULT 'PENDING',
        \`responseTime\` INT DEFAULT 0,
        \`lastChecked\` VARCHAR(100) DEFAULT NULL,
        \`sslStatus\` VARCHAR(100) DEFAULT NULL,
        \`sslExpiry\` VARCHAR(100) DEFAULT NULL,
        \`createdAt\` VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. monitoring_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`monitoring_logs\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`websiteId\` VARCHAR(100) NOT NULL,
        \`websiteName\` VARCHAR(255) NOT NULL,
        \`url\` TEXT NOT NULL,
        \`status\` VARCHAR(50) NOT NULL,
        \`responseTime\` INT DEFAULT 0,
        \`statusCode\` INT DEFAULT NULL,
        \`errorMessage\` TEXT DEFAULT NULL,
        \`checkedAt\` VARCHAR(100) NOT NULL,
        KEY \`idx_ml_website\` (\`websiteId\`),
        KEY \`idx_ml_checked\` (\`checkedAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. alerts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`alerts\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`websiteId\` VARCHAR(100) NOT NULL,
        \`websiteName\` VARCHAR(255) NOT NULL,
        \`url\` TEXT NOT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`responseTime\` INT DEFAULT 0,
        \`statusCode\` INT DEFAULT NULL,
        \`errorMessage\` TEXT DEFAULT NULL,
        \`dispatchedTo\` VARCHAR(255) DEFAULT NULL,
        \`dispatchedAt\` VARCHAR(100) DEFAULT NULL,
        \`timestamp\` VARCHAR(100) NOT NULL,
        KEY \`idx_al_website\` (\`websiteId\`),
        KEY \`idx_al_timestamp\` (\`timestamp\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. daily_reports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`daily_reports\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`coverage\` INT DEFAULT 100,
        \`totalChecks\` INT DEFAULT 0,
        \`onlineChecks\` INT DEFAULT 0,
        \`failedChecks\` INT DEFAULT 0,
        \`avgResponseTime\` INT DEFAULT 0,
        \`uptimePercent\` DECIMAL(5,2) DEFAULT 100.00,
        \`summaryText\` LONGTEXT,
        \`generatedAt\` VARCHAR(100) NOT NULL,
        \`reportData\` LONGTEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. weekly_reports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`weekly_reports\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`coverage\` INT DEFAULT 100,
        \`totalChecks\` INT DEFAULT 0,
        \`onlineChecks\` INT DEFAULT 0,
        \`failedChecks\` INT DEFAULT 0,
        \`avgResponseTime\` INT DEFAULT 0,
        \`uptimePercent\` DECIMAL(5,2) DEFAULT 100.00,
        \`summaryText\` LONGTEXT,
        \`generatedAt\` VARCHAR(100) NOT NULL,
        \`reportData\` LONGTEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. monthly_reports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`monthly_reports\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`coverage\` INT DEFAULT 100,
        \`totalChecks\` INT DEFAULT 0,
        \`onlineChecks\` INT DEFAULT 0,
        \`failedChecks\` INT DEFAULT 0,
        \`avgResponseTime\` INT DEFAULT 0,
        \`uptimePercent\` DECIMAL(5,2) DEFAULT 100.00,
        \`summaryText\` LONGTEXT,
        \`generatedAt\` VARCHAR(100) NOT NULL,
        \`reportData\` LONGTEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. yearly_reports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`yearly_reports\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`coverage\` INT DEFAULT 100,
        \`totalChecks\` INT DEFAULT 0,
        \`onlineChecks\` INT DEFAULT 0,
        \`failedChecks\` INT DEFAULT 0,
        \`avgResponseTime\` INT DEFAULT 0,
        \`uptimePercent\` DECIMAL(5,2) DEFAULT 100.00,
        \`summaryText\` LONGTEXT,
        \`generatedAt\` VARCHAR(100) NOT NULL,
        \`reportData\` LONGTEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. sent_reports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`sent_reports\` (
        \`id\` VARCHAR(100) PRIMARY KEY,
        \`type\` VARCHAR(50) NOT NULL,
        \`date\` VARCHAR(100) DEFAULT NULL,
        \`week\` INT DEFAULT NULL,
        \`month\` INT DEFAULT NULL,
        \`year\` INT DEFAULT NULL,
        \`sentAt\` VARCHAR(100) NOT NULL,
        \`emailSent\` TINYINT(1) DEFAULT 0,
        \`recipient\` VARCHAR(255) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[SiteGuard] MySQL database tables checked and verified successfully.');
  } catch (err) {
    console.error('[SiteGuard] Error initializing MySQL database schema:', err);
  } finally {
    connection.release();
  }
};
