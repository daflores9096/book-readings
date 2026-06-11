USE book_readings_db;

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
