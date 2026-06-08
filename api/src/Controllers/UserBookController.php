<?php
namespace App\Controllers;

use App\Services\UserBookService;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

class UserBookController
{
    private UserBookService $service;

    public function __construct()
    {
        $this->service = new UserBookService();
    }

    public function list(): void
    {
        $user = AuthMiddleware::verifyToken();
        $status = $_GET['status'] ?? null;
        if ($status !== null && !in_array($status, ['want_to_read', 'reading', 'read'], true)) {
            Response::error('status inválido', 400);
        }

        Response::json([
            'status' => 'success',
            'data' => $this->service->listForUser((int)$user->sub, $status),
        ]);
    }

    public function create(): void
    {
        $user = AuthMiddleware::verifyToken();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];

        $bookId = (int)($input['book_id'] ?? 0);
        if ($bookId <= 0) {
            Response::error('book_id requerido', 400);
        }

        $status = $input['status'] ?? 'want_to_read';
        if (!in_array($status, ['want_to_read', 'reading', 'read'], true)) {
            Response::error('status inválido', 400);
        }

        $entry = $this->service->addToShelf((int)$user->sub, $bookId, $status);
        Response::json([
            'status' => 'success',
            'data' => $entry,
        ], 201);
    }

    public function update(int $id): void
    {
        $user = AuthMiddleware::verifyToken();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $entry = $this->service->updateEntry((int)$user->sub, $id, $input);

        Response::json([
            'status' => 'success',
            'data' => $entry,
        ]);
    }

    public function delete(int $id): void
    {
        $user = AuthMiddleware::verifyToken();
        $this->service->remove((int)$user->sub, $id);
        Response::noContent(204);
    }
}
