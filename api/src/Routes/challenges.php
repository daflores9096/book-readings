<?php

use App\Controllers\ReadingChallengeController;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (!str_starts_with($path, '/api/challenges')) {
    return;
}

$controller = new ReadingChallengeController();

if ($path === '/api/challenges' && $method === 'GET') {
    $controller->list();
    exit;
}

if ($path === '/api/challenges/active' && $method === 'GET') {
    $controller->active();
    exit;
}

if ($path === '/api/challenges' && $method === 'POST') {
    $controller->create();
    exit;
}

if (preg_match('#^/api/challenges/(\d+)$#', $path, $matches) && $method === 'DELETE') {
    $controller->delete((int)$matches[1]);
    exit;
}

Response::error('Ruta no encontrada', 404);
