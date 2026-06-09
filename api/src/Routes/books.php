<?php

use App\Controllers\BookController;
use App\Utils\Response;

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if (!str_starts_with($path, '/api/books')) {
    return;
}

$controller = new BookController();

if ($path === '/api/books/search' && $method === 'GET') {
    $controller->search();
    exit;
}

if (preg_match('#^/api/books/lookup/([^/]+)$#', $path, $matches) && $method === 'GET') {
    $controller->lookup(urldecode($matches[1]));
    exit;
}

if ($path === '/api/books' && $method === 'POST') {
    $controller->create();
    exit;
}

if (preg_match('#^/api/books/(\d+)/cover$#', $path, $matches) && $method === 'POST') {
    $controller->uploadCover((int)$matches[1]);
    exit;
}

if (preg_match('#^/api/books/(\d+)$#', $path, $matches) && $method === 'GET') {
    $controller->show((int)$matches[1]);
    exit;
}

Response::error('Ruta no encontrada', 404);
