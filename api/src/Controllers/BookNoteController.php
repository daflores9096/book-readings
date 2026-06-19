<?php
namespace App\Controllers;

use App\Services\BookNoteService;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

class BookNoteController
{
    private BookNoteService $service;

    public function __construct()
    {
        $this->service = new BookNoteService();
    }

    public function list(int $userBookId): void
    {
        $user = AuthMiddleware::verifyToken();
        Response::json([
            'status' => 'success',
            'data' => $this->service->listForUserBook((int)$user->sub, $userBookId),
        ]);
    }

    public function create(int $userBookId): void
    {
        $user = AuthMiddleware::verifyToken();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $note = $this->service->create((int)$user->sub, $userBookId, $input);

        Response::json([
            'status' => 'success',
            'data' => $note,
        ], 201);
    }
}
