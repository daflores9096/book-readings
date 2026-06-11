<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class FriendshipRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findBetween(int $userA, int $userB): ?array
    {
        $stmt = $this->db->prepare('
            SELECT *
            FROM friendships
            WHERE (requester_id = :a1 AND addressee_id = :b1)
               OR (requester_id = :b2 AND addressee_id = :a2)
            LIMIT 1
        ');
        $stmt->execute([
            'a1' => $userA,
            'b1' => $userB,
            'b2' => $userB,
            'a2' => $userA,
        ]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM friendships WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function createRequest(int $requesterId, int $addresseeId): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO friendships (requester_id, addressee_id, status)
            VALUES (:requester_id, :addressee_id, \'pending\')
        ');
        $stmt->execute([
            'requester_id' => $requesterId,
            'addressee_id' => $addresseeId,
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function updateStatus(int $id, string $status): void
    {
        $stmt = $this->db->prepare('UPDATE friendships SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM friendships WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    public function listAcceptedFriendIds(int $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT
                CASE
                    WHEN requester_id = :uid1 THEN addressee_id
                    ELSE requester_id
                END AS friend_id
            FROM friendships
            WHERE status = \'accepted\'
              AND (requester_id = :uid2 OR addressee_id = :uid3)
        ');
        $stmt->execute([
            'uid1' => $userId,
            'uid2' => $userId,
            'uid3' => $userId,
        ]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    }

    public function listFriends(int $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT
                f.id AS friendship_id,
                f.status,
                f.created_at,
                f.updated_at,
                u.id,
                u.username,
                u.full_name,
                u.email
            FROM friendships f
            JOIN users u ON u.id = CASE
                WHEN f.requester_id = :uid1 THEN f.addressee_id
                ELSE f.requester_id
            END
            WHERE f.status = \'accepted\'
              AND (f.requester_id = :uid2 OR f.addressee_id = :uid3)
            ORDER BY u.full_name IS NULL, u.full_name, u.username
        ');
        $stmt->execute([
            'uid1' => $userId,
            'uid2' => $userId,
            'uid3' => $userId,
        ]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function listPendingReceived(int $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT
                f.id AS friendship_id,
                f.created_at,
                u.id,
                u.username,
                u.full_name,
                u.email
            FROM friendships f
            JOIN users u ON u.id = f.requester_id
            WHERE f.addressee_id = :uid
              AND f.status = \'pending\'
            ORDER BY f.created_at DESC
        ');
        $stmt->execute(['uid' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function listPendingSent(int $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT
                f.id AS friendship_id,
                f.created_at,
                u.id,
                u.username,
                u.full_name,
                u.email
            FROM friendships f
            JOIN users u ON u.id = f.addressee_id
            WHERE f.requester_id = :uid
              AND f.status = \'pending\'
            ORDER BY f.created_at DESC
        ');
        $stmt->execute(['uid' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function searchUsers(int $currentUserId, string $query, int $limit = 20): array
    {
        $like = '%' . $query . '%';
        $stmt = $this->db->prepare('
            SELECT
                u.id,
                u.username,
                u.full_name,
                u.email,
                f.id AS friendship_id,
                f.status AS friendship_status,
                f.requester_id,
                f.addressee_id
            FROM users u
            LEFT JOIN friendships f ON (
                (f.requester_id = :uid1 AND f.addressee_id = u.id)
                OR (f.addressee_id = :uid2 AND f.requester_id = u.id)
            )
            WHERE u.id != :uid3
              AND (
                u.username LIKE :q1
                OR u.email LIKE :q2
                OR u.full_name LIKE :q3
              )
            ORDER BY u.full_name IS NULL, u.full_name, u.username
            LIMIT :limit
        ');
        $stmt->bindValue('uid1', $currentUserId, PDO::PARAM_INT);
        $stmt->bindValue('uid2', $currentUserId, PDO::PARAM_INT);
        $stmt->bindValue('uid3', $currentUserId, PDO::PARAM_INT);
        $stmt->bindValue('q1', $like, PDO::PARAM_STR);
        $stmt->bindValue('q2', $like, PDO::PARAM_STR);
        $stmt->bindValue('q3', $like, PDO::PARAM_STR);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}
