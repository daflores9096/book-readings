<?php
namespace App\Controllers;

use App\Services\ActivityService;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

class ActivityController
{
    private ActivityService $service;

    public function __construct()
    {
        $this->service = new ActivityService();
    }

    public function feed(): void
    {
        $user = AuthMiddleware::verifyToken();
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
        $offset = max(0, (int)($_GET['offset'] ?? 0));

        Response::json([
            'status' => 'success',
            'data' => $this->service->feedForUser((int)$user->sub, $limit, $offset),
        ]);
    }
}
