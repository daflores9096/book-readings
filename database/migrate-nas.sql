-- Migracion consolidada para instalaciones existentes en NAS.
-- Se puede ejecutar mas de una vez: agrega solo columnas/tablas faltantes.

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

USE book_readings_db;

-- 04-add-rating.sql: rating en user_books.
SET @column_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user_books'
      AND COLUMN_NAME = 'rating'
);
SET @sql := IF(
    @column_exists = 0,
    'ALTER TABLE user_books ADD COLUMN rating TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER current_page',
    'SELECT ''user_books.rating ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 05-social-feed.sql: nombre completo en users.
SET @column_exists := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'full_name'
);
SET @sql := IF(
    @column_exists = 0,
    'ALTER TABLE users ADD COLUMN full_name VARCHAR(120) NULL AFTER username',
    'SELECT ''users.full_name ya existe'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 05-social-feed.sql: amistades.
CREATE TABLE IF NOT EXISTS friendships (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requester_id INT UNSIGNED NOT NULL,
    addressee_id INT UNSIGNED NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'blocked') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_friendship_pair (requester_id, addressee_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 05-social-feed.sql: actividad de lectura.
CREATE TABLE IF NOT EXISTS reading_activities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    user_book_id INT UNSIGNED NULL,
    book_id INT UNSIGNED NOT NULL,
    type ENUM(
        'book_added_want_to_read',
        'book_added_reading',
        'status_reading',
        'status_read',
        'progress_updated',
        'rating_updated'
    ) NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_book_id) REFERENCES user_books(id) ON DELETE SET NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_activities_user_created (user_id, created_at DESC),
    INDEX idx_activities_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 06-reading-challenges.sql: desafios de lectura.
CREATE TABLE IF NOT EXISTS reading_challenges (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    target_books INT UNSIGNED NOT NULL,
    period_type ENUM('month', 'year') NOT NULL,
    period_year SMALLINT UNSIGNED NOT NULL,
    period_month TINYINT UNSIGNED NULL,
    starts_at DATE NOT NULL,
    ends_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_challenges_user_period (user_id, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verificacion rapida.
SELECT 'Migracion NAS completada' AS status;
SHOW TABLES LIKE 'friendships';
SHOW TABLES LIKE 'reading_activities';
SHOW TABLES LIKE 'reading_challenges';
