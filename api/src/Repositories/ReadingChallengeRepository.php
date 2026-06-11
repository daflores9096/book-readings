<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class ReadingChallengeRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO reading_challenges
                (user_id, name, target_books, period_type, period_year, period_month, starts_at, ends_at)
            VALUES
                (:user_id, :name, :target_books, :period_type, :period_year, :period_month, :starts_at, :ends_at)
        ');
        $stmt->execute([
            'user_id' => $data['user_id'],
            'name' => $data['name'],
            'target_books' => $data['target_books'],
            'period_type' => $data['period_type'],
            'period_year' => $data['period_year'],
            'period_month' => $data['period_month'],
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'],
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function listByUser(int $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT *
            FROM reading_challenges
            WHERE user_id = :user_id
            ORDER BY starts_at DESC, id DESC
        ');
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function findByIdForUser(int $id, int $userId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT *
            FROM reading_challenges
            WHERE id = :id AND user_id = :user_id
            LIMIT 1
        ');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function findActiveForUser(int $userId, ?string $date = null): ?array
    {
        $date = $date ?: date('Y-m-d');
        $stmt = $this->db->prepare('
            SELECT *
            FROM reading_challenges
            WHERE user_id = :user_id
              AND starts_at <= :today_start
              AND ends_at >= :today_end
            ORDER BY starts_at DESC, id DESC
            LIMIT 1
        ');
        $stmt->execute([
            'user_id' => $userId,
            'today_start' => $date,
            'today_end' => $date,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function countFinishedBooks(int $userId, string $startsAt, string $endsAt): int
    {
        $stmt = $this->db->prepare('
            SELECT COUNT(*)
            FROM user_books
            WHERE user_id = :user_id
              AND status = :status
              AND finished_at BETWEEN :starts_at AND :ends_at
        ');
        $stmt->execute([
            'user_id' => $userId,
            'status' => 'read',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);
        return (int)$stmt->fetchColumn();
    }

    public function delete(int $id, int $userId): void
    {
        $stmt = $this->db->prepare('DELETE FROM reading_challenges WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
    }
}
