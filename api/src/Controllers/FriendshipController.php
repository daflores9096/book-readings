<?php
namespace App\Controllers;

use App\Services\FriendshipService;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

class FriendshipController
{
    private FriendshipService $service;

    public function __construct()
    {
        $this->service = new FriendshipService();
    }

    public function list(): void
    {
        $user = AuthMiddleware::verifyToken();
        Response::json([
            'status' => 'success',
            'data' => $this->service->listOverview((int)$user->sub),
        ]);
    }

    public function search(): void
    {
        $user = AuthMiddleware::verifyToken();
        $query = (string)($_GET['query'] ?? '');

        Response::json([
            'status' => 'success',
            'data' => $this->service->search((int)$user->sub, $query),
        ]);
    }

    public function createRequest(): void
    {
        $user = AuthMiddleware::verifyToken();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $addresseeId = (int)($input['user_id'] ?? 0);

        if ($addresseeId <= 0) {
            Response::error('user_id requerido', 400);
        }

        $friendship = $this->service->sendRequest((int)$user->sub, $addresseeId);
        Response::json([
            'status' => 'success',
            'data' => $friendship,
        ], 201);
    }

    public function respond(int $id): void
    {
        $user = AuthMiddleware::verifyToken();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $action = (string)($input['action'] ?? '');

        $friendship = $this->service->respondToRequest((int)$user->sub, $id, $action);
        Response::json([
            'status' => 'success',
            'data' => $friendship,
        ]);
    }

    public function delete(int $id): void
    {
        $user = AuthMiddleware::verifyToken();
        $this->service->removeFriendship((int)$user->sub, $id);
        Response::noContent(204);
    }
}
