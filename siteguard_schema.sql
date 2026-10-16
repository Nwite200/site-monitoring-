-- ==========================================================
-- SiteGuard AI - Database Schema for MySQL / Namecheap Shared Hosting
-- Import this schema in phpMyAdmin on your cPanel account.
-- ==========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table structure for table `websites`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `websites` (
  `id` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `url` TEXT NOT NULL,
  `clientName` VARCHAR(255) DEFAULT 'Admin',
  `contactEmail` VARCHAR(255) DEFAULT '',
  `monitoringInterval` INT DEFAULT 5,
  `enabled` TINYINT(1) DEFAULT 1,
  `status` VARCHAR(50) DEFAULT 'PENDING',
  `responseTime` INT DEFAULT 0,
  `lastChecked` VARCHAR(100) DEFAULT NULL,
  `sslStatus` VARCHAR(100) DEFAULT NULL,
  `sslExpiry` VARCHAR(100) DEFAULT NULL,
  `createdAt` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `monitoring_logs`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `monitoring_logs` (
  `id` VARCHAR(100) NOT NULL,
  `websiteId` VARCHAR(100) NOT NULL,
  `websiteName` VARCHAR(255) NOT NULL,
  `url` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `responseTime` INT DEFAULT 0,
  `statusCode` INT DEFAULT NULL,
  `errorMessage` TEXT DEFAULT NULL,
  `checkedAt` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ml_website` (`websiteId`),
  KEY `idx_ml_checked` (`checkedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `alerts`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `alerts` (
  `id` VARCHAR(100) NOT NULL,
  `websiteId` VARCHAR(100) NOT NULL,
  `websiteName` VARCHAR(255) NOT NULL,
  `url` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `responseTime` INT DEFAULT 0,
  `statusCode` INT DEFAULT NULL,
  `errorMessage` TEXT DEFAULT NULL,
  `dispatchedTo` VARCHAR(255) DEFAULT NULL,
  `dispatchedAt` VARCHAR(100) DEFAULT NULL,
  `timestamp` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_al_website` (`websiteId`),
  KEY `idx_al_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `daily_reports`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `daily_reports` (
  `id` VARCHAR(100) NOT NULL,
  `coverage` INT DEFAULT 100,
  `totalChecks` INT DEFAULT 0,
  `onlineChecks` INT DEFAULT 0,
  `failedChecks` INT DEFAULT 0,
  `avgResponseTime` INT DEFAULT 0,
  `uptimePercent` DECIMAL(5,2) DEFAULT 100.00,
  `summaryText` LONGTEXT,
  `generatedAt` VARCHAR(100) NOT NULL,
  `reportData` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `weekly_reports`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `weekly_reports` (
  `id` VARCHAR(100) NOT NULL,
  `coverage` INT DEFAULT 100,
  `totalChecks` INT DEFAULT 0,
  `onlineChecks` INT DEFAULT 0,
  `failedChecks` INT DEFAULT 0,
  `avgResponseTime` INT DEFAULT 0,
  `uptimePercent` DECIMAL(5,2) DEFAULT 100.00,
  `summaryText` LONGTEXT,
  `generatedAt` VARCHAR(100) NOT NULL,
  `reportData` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `monthly_reports`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `monthly_reports` (
  `id` VARCHAR(100) NOT NULL,
  `coverage` INT DEFAULT 100,
  `totalChecks` INT DEFAULT 0,
  `onlineChecks` INT DEFAULT 0,
  `failedChecks` INT DEFAULT 0,
  `avgResponseTime` INT DEFAULT 0,
  `uptimePercent` DECIMAL(5,2) DEFAULT 100.00,
  `summaryText` LONGTEXT,
  `generatedAt` VARCHAR(100) NOT NULL,
  `reportData` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `yearly_reports`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `yearly_reports` (
  `id` VARCHAR(100) NOT NULL,
  `coverage` INT DEFAULT 100,
  `totalChecks` INT DEFAULT 0,
  `onlineChecks` INT DEFAULT 0,
  `failedChecks` INT DEFAULT 0,
  `avgResponseTime` INT DEFAULT 0,
  `uptimePercent` DECIMAL(5,2) DEFAULT 100.00,
  `summaryText` LONGTEXT,
  `generatedAt` VARCHAR(100) NOT NULL,
  `reportData` LONGTEXT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `sent_reports`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `sent_reports` (
  `id` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `date` VARCHAR(100) DEFAULT NULL,
  `week` INT DEFAULT NULL,
  `month` INT DEFAULT NULL,
  `year` INT DEFAULT NULL,
  `sentAt` VARCHAR(100) NOT NULL,
  `emailSent` TINYINT(1) DEFAULT 0,
  `recipient` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
