-- Notas de lectura (frases dictadas o escritas por el usuario).
CREATE TABLE IF NOT EXISTS book_notes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_book_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    page_number INT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_book_id) REFERENCES user_books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_book_notes_user_book (user_book_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
