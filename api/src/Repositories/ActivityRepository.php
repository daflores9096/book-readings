<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class ActivityRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function create(int $userId, int $bookId, string $type, ?int $userBookId = null, ?array $metadata = null): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO reading_activities (user_id, user_book_id, book_id, type, metadata)
            VALUES (:user_id, :user_book_id, :book_id, :type, :metadata)
        ');
        $stmt->execute([
            'user_id' => $userId,
            'user_book_id' => $userBookId,
            'book_id' => $bookId,
            'type' => $type,
            'metadata' => $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null,
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function feedForUsers(array $userIds, int $viewerUserId, int $limit = 50, int $offset = 0): array
    {
        if ($userIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $sql = "
            SELECT
                ra.id,
                ra.user_id,
                ra.user_book_id,
                ra.book_id,
                ra.type,
                ra.metadata,
                ra.created_at,
                u.username,
                u.full_name,
                b.title,
                b.authors,
                b.page_count,
                b.cover_url,
                b.cover_path,
                ub.status,
                ub.current_page,
                ub.rating,
                viewer_ub.id AS viewer_user_book_id,
                CASE WHEN viewer_ub.id IS NULL THEN 0 ELSE 1 END AS viewer_has_book
            FROM reading_activities ra
            JOIN users u ON u.id = ra.user_id
            JOIN books b ON b.id = ra.book_id
            LEFT JOIN user_books ub ON ub.id = ra.user_book_id
            LEFT JOIN user_books viewer_ub ON viewer_ub.book_id = ra.book_id AND viewer_ub.user_id = ?
            WHERE ra.user_id IN ($placeholders)
            ORDER BY ra.created_at DESC, ra.id DESC
            LIMIT ?
            OFFSET ?
        ";

        $params = array_merge([$viewerUserId], $userIds, [$limit, $offset]);
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(fn ($row) => $this->hydrateRow($row), $rows);
    }

    private function hydrateRow(array $row): array
    {
        $row['authors'] = json_decode($row['authors'] ?? '[]', true) ?: [];
        $row['metadata'] = json_decode($row['metadata'] ?? 'null', true) ?: [];
        $row['viewer_has_book'] = (bool)((int)($row['viewer_has_book'] ?? 0));
        return $row;
    }
}
