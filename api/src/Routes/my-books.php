<?php

use App\Controllers\UserBookController;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (!str_starts_with($path, '/api/my-books')) {
    return;
}

$controller = new UserBookController();

if ($path === '/api/my-books' && $method === 'GET') {
    $controller->list();
    exit;
}

if ($path === '/api/my-books' && $method === 'POST') {
    $controller->create();
    exit;
}

if (preg_match('#^/api/my-books/(\d+)$#', $path, $matches)) {
    $id = (int)$matches[1];
    if ($method === 'PUT') {
        $controller->update($id);
    } elseif ($method === 'DELETE') {
        $controller->delete($id);
    } else {
        Response::error('Método no permitido', 405);
    }
    exit;
}

Response::error('Ruta no encontrada', 404);
