<?php
namespace App\Services;

use App\Repositories\BookRepository;
use App\Repositories\UserBookRepository;
use App\Utils\Response;

class UserBookService
{
    private UserBookRepository $userBookRepository;
    private BookRepository $bookRepository;

    public function __construct()
    {
        $this->userBookRepository = new UserBookRepository();
        $this->bookRepository = new BookRepository();
    }

    public function listForUser(int $userId, ?string $status = null): array
    {
        return $this->userBookRepository->listByUser($userId, $status);
    }

    public function addToShelf(int $userId, int $bookId, string $status = 'want_to_read'): array
    {
        $book = $this->bookRepository->findById($bookId);
        if (!$book) {
            Response::error('Libro no encontrado', 404);
        }

        $existing = $this->userBookRepository->findByUserAndBook($userId, $bookId);
        if ($existing) {
            Response::error('Este libro ya está en tu biblioteca', 409);
        }

        $id = $this->userBookRepository->create($userId, $bookId, $status);
        $row = $this->userBookRepository->findByIdForUser($id, $userId);
        return $row ?? [];
    }

    public function updateEntry(int $userId, int $userBookId, array $input): array
    {
        $entry = $this->userBookRepository->findByIdForUser($userBookId, $userId);
        if (!$entry) {
            Response::error('Registro no encontrado', 404);
        }

        $status = $input['status'] ?? $entry['status'];
        $currentPage = isset($input['current_page']) ? max(0, (int)$input['current_page']) : (int)$entry['current_page'];
        $pageCount = isset($entry['page_count']) ? (int)$entry['page_count'] : null;

        if ($pageCount !== null && $pageCount > 0 && $currentPage > $pageCount) {
            Response::error('La página actual no puede superar el total de páginas', 400);
        }

        $startedAt = $entry['started_at'];
        $finishedAt = $entry['finished_at'];

        if ($status === 'reading') {
            if (!$startedAt) {
                $startedAt = date('Y-m-d');
            }
            $finishedAt = null;
        }

        if ($currentPage > 0 && $status === 'want_to_read') {
            $status = 'reading';
            if (!$startedAt) {
                $startedAt = date('Y-m-d');
            }
        }

        if ($status === 'read') {
            if (!$startedAt) {
                $startedAt = date('Y-m-d');
            }
            $finishedAt = date('Y-m-d');
            if ($pageCount !== null && $pageCount > 0) {
                $currentPage = $pageCount;
            }
        }

        if ($status === 'want_to_read') {
            $currentPage = 0;
            $startedAt = null;
            $finishedAt = null;
        }

        $this->userBookRepository->update($userBookId, [
            'status' => $status,
            'current_page' => $currentPage,
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
        ]);

        return $this->userBookRepository->findByIdForUser($userBookId, $userId) ?? [];
    }

    public function remove(int $userId, int $userBookId): void
    {
        $entry = $this->userBookRepository->findByIdForUser($userBookId, $userId);
        if (!$entry) {
            Response::error('Registro no encontrado', 404);
        }

        $this->userBookRepository->delete($userBookId);
    }
}
