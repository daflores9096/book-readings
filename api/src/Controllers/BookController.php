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

    public function search(): void
    {
        AuthMiddleware::verifyToken();

        $type = $_GET['type'] ?? 'isbn';
        $query = trim((string)($_GET['query'] ?? ''));
        if (!in_array($type, ['isbn', 'title', 'author'], true)) {
            Response::error('Tipo de búsqueda inválido', 400);
        }
        if ($query === '') {
            Response::error('Texto de búsqueda requerido', 400);
        }

        if ($type === 'isbn') {
            $isbn13 = IsbnHelper::normalize($query);
            if (!$isbn13) {
                Response::error('ISBN inválido', 400);
            }

            $existing = $this->bookRepository->findByIsbn13($isbn13);
            if ($existing) {
                Response::json([
                    'status' => 'success',
                    'data' => [
                        'found' => true,
                        'results' => [$existing],
                        'source' => 'local',
                    ],
                ]);
            }
        }

        $results = $this->lookupService->search($type, $query);
        if (empty($results)) {
            Response::json([
                'status' => 'success',
                'data' => [
                    'found' => false,
                    'results' => [],
                    'query' => $query,
                    'type' => $type,
                ],
            ], 404);
        }

        Response::json([
            'status' => 'success',
            'data' => [
                'found' => true,
                'results' => $results,
                'type' => $type,
                'query' => $query,
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

    public function update(int $id): void
    {
        AuthMiddleware::verifyToken();
        $book = $this->bookRepository->findById($id);
        if (!$book) {
            Response::error('Libro no encontrado', 404);
        }

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
            if ($this->bookRepository->isbn13ExistsExcept($id, $isbn13)) {
                Response::error('Ya existe otro libro con ese ISBN', 409);
            }
        }

        $authors = $input['authors'] ?? [];
        if (is_string($authors)) {
            $authors = array_values(array_filter(array_map('trim', explode(',', $authors))));
        }

        $pageCount = null;
        if (array_key_exists('page_count', $input) && $input['page_count'] !== null && $input['page_count'] !== '') {
            $pageCount = (int)$input['page_count'];
            if ($pageCount < 0) {
                Response::error('page_count inválido', 400);
            }
        }

        $this->bookRepository->update($id, [
            'isbn13' => $isbn13,
            'isbn10' => $isbn13 ? IsbnHelper::toIsbn10($isbn13) : null,
            'title' => $title,
            'authors' => $authors,
            'page_count' => $pageCount,
            'publisher' => $input['publisher'] ?? null,
            'published_date' => $input['published_date'] ?? null,
            'description' => $input['description'] ?? null,
            'cover_url' => $input['cover_url'] ?? null,
            'source' => $input['source'] ?? ($book['source'] ?? 'manual'),
        ]);

        Response::json([
            'status' => 'success',
            'data' => $this->bookRepository->findById($id),
        ]);
    }

    public function uploadCover(int $id): void
    {
        AuthMiddleware::verifyToken();
        $book = $this->bookRepository->findById($id);
        if (!$book) {
            Response::error('Libro no encontrado', 404);
        }

        if (empty($_FILES['cover'])) {
            Response::error('Archivo de portada requerido', 400);
        }

        if ($_FILES['cover']['error'] !== UPLOAD_ERR_OK) {
            Response::error($this->uploadErrorMessage((int)$_FILES['cover']['error']), 400);
        }

        $tmpPath = $_FILES['cover']['tmp_name'];
        $filename = 'book_' . $id . '_' . time() . '.jpg';
        $relativePath = 'uploads/covers/' . $filename;
        $absolutePath = __DIR__ . '/../../public/' . $relativePath;
        $uploadDir = dirname($absolutePath);

        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
            Response::error('No se pudo crear el directorio de portadas', 500);
        }

        if (!is_writable($uploadDir)) {
            Response::error('El directorio de portadas no tiene permisos de escritura', 500);
        }

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

    private function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'La imagen excede el tamaño máximo permitido',
            UPLOAD_ERR_PARTIAL => 'La imagen se subió parcialmente. Intenta nuevamente',
            UPLOAD_ERR_NO_FILE => 'No se recibió ningún archivo de portada',
            UPLOAD_ERR_NO_TMP_DIR => 'Falta el directorio temporal para subir archivos',
            UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir la imagen en el servidor',
            UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida de la imagen',
            default => 'Error desconocido al subir la portada',
        };
    }
}
