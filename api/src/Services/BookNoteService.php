<?php
namespace App\Services;

use App\Repositories\BookNoteRepository;
use App\Repositories\UserBookRepository;
use App\Utils\Response;

class BookNoteService
{
    private BookNoteRepository $noteRepository;
    private UserBookRepository $userBookRepository;

    public function __construct()
    {
        $this->noteRepository = new BookNoteRepository();
        $this->userBookRepository = new UserBookRepository();
    }

    public function listForUserBook(int $userId, int $userBookId): array
    {
        $entry = $this->requireOwnedEntry($userId, $userBookId);
        if (!in_array($entry['status'], ['reading', 'read'], true)) {
            Response::error('Las notas solo están disponibles para libros en lectura o leídos', 403);
        }

        return $this->noteRepository->listByUserBook($userBookId, $userId);
    }

    public function create(int $userId, int $userBookId, array $input): array
    {
        $entry = $this->requireOwnedEntry($userId, $userBookId);
        if ($entry['status'] !== 'reading') {
            Response::error('Solo puedes agregar notas mientras lees el libro', 403);
        }

        $content = trim((string)($input['content'] ?? ''));
        if ($content === '') {
            Response::error('El contenido de la nota es requerido', 400);
        }

        if (mb_strlen($content) > 5000) {
            Response::error('La nota no puede superar 5000 caracteres', 400);
        }

        $pageNumber = null;
        if (array_key_exists('page_number', $input) && $input['page_number'] !== null && $input['page_number'] !== '') {
            $pageNumber = max(0, (int)$input['page_number']);
            $pageCount = isset($entry['page_count']) ? (int)$entry['page_count'] : 0;
            if ($pageCount > 0 && $pageNumber > $pageCount) {
                Response::error('La página no puede superar el total del libro', 400);
            }
        }

        $noteId = $this->noteRepository->create($userBookId, $userId, $content, $pageNumber);
        $note = $this->noteRepository->findByIdForUser($noteId, $userId);

        return $note ?? [];
    }

    private function requireOwnedEntry(int $userId, int $userBookId): array
    {
        $entry = $this->userBookRepository->findByIdForUser($userBookId, $userId);
        if (!$entry) {
            Response::error('Registro no encontrado', 404);
        }

        return $entry;
    }
}
