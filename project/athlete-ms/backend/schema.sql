-- ============================================================
--  IRON FORGE ATHLETE MANAGEMENT SYSTEM — DATABASE SCHEMA
-- ============================================================

CREATE DATABASE IF NOT EXISTS athlete_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE athlete_management;

-- ─────────────────────────────────────────────
--  USERS  (authentication)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120)  NOT NULL,
  email         VARCHAR(191)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('athlete','coach','admin') NOT NULL DEFAULT 'athlete',
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  ATHLETE PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_profiles (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL UNIQUE,

  -- Personal Information
  date_of_birth    DATE,
  gender           ENUM('male','female','non_binary','prefer_not_to_say'),
  nationality      VARCHAR(80),
  city             VARCHAR(100),
  state            VARCHAR(100),
  country          VARCHAR(100) DEFAULT 'India',
  bio              TEXT,
  profile_photo    VARCHAR(500),

  -- Physical Stats
  height_cm        DECIMAL(5,2),
  weight_kg        DECIMAL(5,2),
  blood_group      VARCHAR(10),
  dominant_hand    ENUM('left','right','ambidextrous'),

  -- Sports Info
  sport_category   VARCHAR(100),
  sport_discipline VARCHAR(150),
  playing_level    ENUM('beginner','amateur','semi_pro','professional','elite'),
  team_club        VARCHAR(150),
  coach_name       VARCHAR(120),
  years_experience TINYINT UNSIGNED DEFAULT 0,
  membership_plan  ENUM('iron_starter','iron_forge','iron_elite') DEFAULT 'iron_starter',

  -- Contact
  phone            VARCHAR(20),
  emergency_contact_name  VARCHAR(120),
  emergency_contact_phone VARCHAR(20),
  social_instagram VARCHAR(100),
  social_twitter   VARCHAR(100),
  social_linkedin  VARCHAR(100),
  website          VARCHAR(255),

  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  ACHIEVEMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  event_name  VARCHAR(255),
  position    VARCHAR(50),
  award_date  DATE,
  level       ENUM('local','state','national','international'),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  PERFORMANCE STATISTICS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_stats (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  stat_name       VARCHAR(100) NOT NULL,   -- e.g. "Bench Press 1RM", "100m Sprint Time"
  stat_value      VARCHAR(100) NOT NULL,   -- e.g. "120 kg", "10.8 sec"
  unit            VARCHAR(30),
  recorded_date   DATE,
  notes           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  TRAINING DETAILS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_details (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL UNIQUE,
  training_days       VARCHAR(200),         -- e.g. "Mon,Tue,Thu,Fri"
  session_duration    VARCHAR(50),          -- e.g. "90 minutes"
  preferred_time      ENUM('morning','afternoon','evening','night'),
  current_program     VARCHAR(255),
  training_goals      TEXT,
  diet_type           VARCHAR(100),
  supplements         TEXT,
  injuries_history    TEXT,
  recovery_methods    TEXT,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

