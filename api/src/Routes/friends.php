<?php

use App\Controllers\FriendshipController;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (!str_starts_with($path, '/api/friends')) {
    return;
}

$controller = new FriendshipController();

if ($path === '/api/friends' && $method === 'GET') {
    $controller->list();
    exit;
}

if ($path === '/api/friends/search' && $method === 'GET') {
    $controller->search();
    exit;
}

if ($path === '/api/friends/requests' && $method === 'POST') {
    $controller->createRequest();
    exit;
}

if (preg_match('#^/api/friends/requests/(\d+)$#', $path, $matches) && $method === 'PUT') {
    $controller->respond((int)$matches[1]);
    exit;
}

if (preg_match('#^/api/friends/(\d+)$#', $path, $matches) && $method === 'DELETE') {
    $controller->delete((int)$matches[1]);
    exit;
}

Response::error('Ruta no encontrada', 404);
