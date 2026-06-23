<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class BookNoteRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function listByUserBook(int $userBookId, int $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT id, user_book_id, content, page_number, created_at
            FROM book_notes
            WHERE user_book_id = :user_book_id AND user_id = :user_id
            ORDER BY created_at DESC, id DESC
        ');
        $stmt->execute([
            'user_book_id' => $userBookId,
            'user_id' => $userId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function create(int $userBookId, int $userId, string $content, ?int $pageNumber): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO book_notes (user_book_id, user_id, content, page_number)
            VALUES (:user_book_id, :user_id, :content, :page_number)
        ');
        $stmt->execute([
            'user_book_id' => $userBookId,
            'user_id' => $userId,
            'content' => $content,
            'page_number' => $pageNumber,
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function findByIdForUser(int $noteId, int $userId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT id, user_book_id, content, page_number, created_at
            FROM book_notes
            WHERE id = :id AND user_id = :user_id
            LIMIT 1
        ');
        $stmt->execute([
            'id' => $noteId,
            'user_id' => $userId,
        ]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function deleteForUser(int $noteId, int $userId, int $userBookId): bool
    {
        $stmt = $this->db->prepare('
            DELETE FROM book_notes
            WHERE id = :id AND user_id = :user_id AND user_book_id = :user_book_id
        ');
        $stmt->execute([
            'id' => $noteId,
            'user_id' => $userId,
            'user_book_id' => $userBookId,
        ]);

        return $stmt->rowCount() > 0;
    }
}
