-- Usuario reader demo (role_id=2)
-- Contraseña por defecto: ReaderP@ssw0rd

USE book_readings_db;

INSERT INTO users (username, email, password, role_id)
SELECT 'reader', 'reader@local', '$2y$10$JOh6UNiLY6N/9JL7cRILLunvBqXnvuYlYaColuAd1fo6IXzoP/aea', 2
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'reader' LIMIT 1);
