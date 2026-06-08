-- Usuario admin (role_id=1)
-- Contraseña por defecto: AdminP@ssw0rd

USE book_readings_db;

INSERT INTO users (username, email, password, role_id)
SELECT 'admin', 'admin@local', '$2y$10$GM0/GaFl7N.TmL.RPdDaFu0BPntXl0zrzDxob/8k/cRiyR2mL6Beq', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin' LIMIT 1);
