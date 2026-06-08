<?php
namespace App\Controllers;

use App\Repositories\BookRepository;
use App\Services\BookLookupService;
use App\Utils\AuthMiddleware;
use App\Utils\ImageOptimizer;
use App\Utils\IsbnHelper;
use App\Utils\Response;

class BookController
{
    private BookRepository $bookRepository;
    private BookLookupService $lookupService;

    public function __construct()
    {
        $this->bookRepository = new BookRepository();
        $this->lookupService = new BookLookupService();
    }

    public function lookup(string $rawIsbn): void
    {
        AuthMiddleware::verifyToken();
        $isbn13 = IsbnHelper::normalize($rawIsbn);
        if (!$isbn13) {
            Response::error('ISBN inválido', 400);
        }

        $existing = $this->bookRepository->findByIsbn13($isbn13);
        if ($existing) {
            Response::json([
                'status' => 'success',
                'data' => [
                    'found' => true,
                    'source' => 'local',
                    'book' => $existing,
                ],
            ]);
        }

        $external = $this->lookupService->lookup($isbn13);
        if (!$external) {
            Response::json([
                'status' => 'success',
                'data' => [
                    'found' => false,
                    'isbn13' => $isbn13,
                ],
            ], 404);
        }

        Response::json([
            'status' => 'success',
            'data' => [
                'found' => true,
                'source' => $external['source'],
                'book' => $external,
            ],
        ]);
    }

    public function show(int $id): void
    {
        AuthMiddleware::verifyToken();
        $book = $this->bookRepository->findById($id);
        if (!$book) {
            Response::error('Libro no encontrado', 404);
        }

        Response::json([
            'status' => 'success',
            'data' => $book,
        ]);
    }

    public function create(): void
    {
        $user = AuthMiddleware::verifyToken();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];

        $title = trim((string)($input['title'] ?? ''));
        if ($title === '') {
            Response::error('El título es obligatorio', 400);
        }

        $isbn13 = null;
        if (!empty($input['isbn13']) || !empty($input['isbn'])) {
            $isbn13 = IsbnHelper::normalize((string)($input['isbn13'] ?? $input['isbn']));
            if (!$isbn13) {
                Response::error('ISBN inválido', 400);
            }

            $existing = $this->bookRepository->findByIsbn13($isbn13);
            if ($existing) {
                Response::json([
                    'status' => 'success',
                    'data' => $existing,
                ], 200);
            }
        }

        $authors = $input['authors'] ?? [];
        if (is_string($authors)) {
            $authors = array_values(array_filter(array_map('trim', explode(',', $authors))));
        }

        $pageCount = isset($input['page_count']) ? (int)$input['page_count'] : null;
        if ($pageCount !== null && $pageCount < 0) {
            Response::error('page_count inválido', 400);
        }

        $id = $this->bookRepository->create([
            'isbn13' => $isbn13,
            'isbn10' => $isbn13 ? IsbnHelper::toIsbn10($isbn13) : null,
            'title' => $title,
            'authors' => $authors,
            'page_count' => $pageCount,
            'publisher' => $input['publisher'] ?? null,
            'published_date' => $input['published_date'] ?? null,
            'description' => $input['description'] ?? null,
            'cover_url' => $input['cover_url'] ?? null,
            'cover_path' => null,
            'source' => $input['source'] ?? 'manual',
            'created_by' => (int)$user->sub,
        ]);

        Response::json([
            'status' => 'success',
            'data' => $this->bookRepository->findById($id),
        ], 201);
    }

    public function uploadCover(int $id): void
    {
        AuthMiddleware::verifyToken();
        $book = $this->bookRepository->findById($id);
        if (!$book) {
            Response::error('Libro no encontrado', 404);
        }

        if (empty($_FILES['cover']) || $_FILES['cover']['error'] !== UPLOAD_ERR_OK) {
            Response::error('Archivo de portada requerido', 400);
        }

        $tmpPath = $_FILES['cover']['tmp_name'];
        $filename = 'book_' . $id . '_' . time() . '.jpg';
        $relativePath = 'uploads/covers/' . $filename;
        $absolutePath = __DIR__ . '/../../public/' . $relativePath;

        if (!ImageOptimizer::saveCover($tmpPath, $absolutePath)) {
            Response::error('No se pudo procesar la imagen', 400);
        }

        $this->bookRepository->updateCoverPath($id, $relativePath);

        Response::json([
            'status' => 'success',
            'data' => [
                'cover_path' => $relativePath,
                'cover_url' => '/' . $relativePath,
            ],
        ]);
    }
}
