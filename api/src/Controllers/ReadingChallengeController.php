<?php
namespace App\Controllers;

use App\Services\ReadingChallengeService;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

class ReadingChallengeController
{
    private ReadingChallengeService $service;

    public function __construct()
    {
        $this->service = new ReadingChallengeService();
    }

    public function list(): void
    {
        $user = AuthMiddleware::verifyToken();
        Response::json([
            'status' => 'success',
            'data' => $this->service->listForUser((int)$user->sub),
        ]);
    }

    public function active(): void
    {
        $user = AuthMiddleware::verifyToken();
        Response::json([
            'status' => 'success',
            'data' => $this->service->activeForUser((int)$user->sub),
        ]);
    }

    public function create(): void
    {
        $user = AuthMiddleware::verifyToken();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        Response::json([
            'status' => 'success',
            'data' => $this->service->create((int)$user->sub, $input),
        ], 201);
    }

    public function delete(int $id): void
    {
        $user = AuthMiddleware::verifyToken();
        $this->service->delete((int)$user->sub, $id);
        Response::noContent(204);
    }
}
