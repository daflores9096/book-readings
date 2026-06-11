USE book_readings_db;

ALTER TABLE users
    ADD COLUMN full_name VARCHAR(120) NULL AFTER username;

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
