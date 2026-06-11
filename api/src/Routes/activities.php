<?php

use App\Controllers\ActivityController;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (!str_starts_with($path, '/api/activities')) {
    return;
}

$controller = new ActivityController();

if ($path === '/api/activities/feed' && $method === 'GET') {
    $controller->feed();
    exit;
}

Response::error('Ruta no encontrada', 404);
