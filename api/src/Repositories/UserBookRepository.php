<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class UserBookRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function listByUser(int $userId, ?string $status = null): array
    {
        $sql = '
            SELECT
                ub.*,
                b.title,
                b.authors,
                b.page_count,
                b.cover_url,
                b.cover_path,
                b.isbn13,
                b.isbn10,
                b.publisher,
                b.published_date,
                b.description
            FROM user_books ub
            JOIN books b ON b.id = ub.book_id
            WHERE ub.user_id = :user_id
        ';
        $params = ['user_id' => $userId];

        if ($status !== null) {
            $sql .= ' AND ub.status = :status';
            $params['status'] = $status;
        }

        $sql .= ' ORDER BY ub.updated_at DESC, ub.id DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(fn ($row) => $this->hydrateRow($row), $rows);
    }

    public function findByIdForUser(int $id, int $userId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT
                ub.*,
                b.title,
                b.authors,
                b.page_count,
                b.cover_url,
                b.cover_path,
                b.isbn13,
                b.isbn10,
                b.publisher,
                b.published_date,
                b.description
            FROM user_books ub
            JOIN books b ON b.id = ub.book_id
            WHERE ub.id = :id AND ub.user_id = :user_id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->hydrateRow($row) : null;
    }

    public function findByUserAndBook(int $userId, int $bookId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT * FROM user_books WHERE user_id = :user_id AND book_id = :book_id LIMIT 1
        ');
        $stmt->execute(['user_id' => $userId, 'book_id' => $bookId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function create(int $userId, int $bookId, string $status = 'want_to_read'): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO user_books (user_id, book_id, status)
            VALUES (:user_id, :book_id, :status)
        ');
        $stmt->execute([
            'user_id' => $userId,
            'book_id' => $bookId,
            'status' => $status,
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $stmt = $this->db->prepare('
            UPDATE user_books
            SET status = :status,
                current_page = :current_page,
                rating = :rating,
                started_at = :started_at,
                finished_at = :finished_at
            WHERE id = :id
        ');
        $stmt->execute([
            'status' => $data['status'],
            'current_page' => $data['current_page'],
            'rating' => $data['rating'],
            'started_at' => $data['started_at'],
            'finished_at' => $data['finished_at'],
            'id' => $id,
        ]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM user_books WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    private function hydrateRow(array $row): array
    {
        $row['authors'] = json_decode($row['authors'] ?? '[]', true) ?: [];
        return $row;
    }
}
