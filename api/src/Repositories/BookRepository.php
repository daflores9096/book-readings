<?php
namespace App\Repositories;

use App\Utils\Database;
use PDO;

class BookRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM books WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->hydrateBook($row) : null;
    }

    public function findByIsbn13(string $isbn13): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM books WHERE isbn13 = :isbn13 LIMIT 1');
        $stmt->execute(['isbn13' => $isbn13]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->hydrateBook($row) : null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare('
            INSERT INTO books (
                isbn13, isbn10, title, authors, page_count, publisher,
                published_date, description, cover_url, cover_path, source, created_by
            ) VALUES (
                :isbn13, :isbn10, :title, :authors, :page_count, :publisher,
                :published_date, :description, :cover_url, :cover_path, :source, :created_by
            )
        ');
        $stmt->execute([
            'isbn13' => $data['isbn13'] ?? null,
            'isbn10' => $data['isbn10'] ?? null,
            'title' => $data['title'],
            'authors' => json_encode($data['authors'] ?? [], JSON_UNESCAPED_UNICODE),
            'page_count' => $data['page_count'] ?? null,
            'publisher' => $data['publisher'] ?? null,
            'published_date' => $data['published_date'] ?? null,
            'description' => $data['description'] ?? null,
            'cover_url' => $data['cover_url'] ?? null,
            'cover_path' => $data['cover_path'] ?? null,
            'source' => $data['source'] ?? 'manual',
            'created_by' => $data['created_by'] ?? null,
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function updateCoverPath(int $id, string $coverPath): void
    {
        $stmt = $this->db->prepare('UPDATE books SET cover_path = :cover_path WHERE id = :id');
        $stmt->execute(['cover_path' => $coverPath, 'id' => $id]);
    }

    private function hydrateBook(array $row): array
    {
        $row['authors'] = json_decode($row['authors'] ?? '[]', true) ?: [];
        return $row;
    }
}
