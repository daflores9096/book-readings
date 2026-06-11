USE book_readings_db;

ALTER TABLE user_books
    ADD COLUMN rating TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER current_page;
