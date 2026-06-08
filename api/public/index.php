<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Config/config.php';

use App\Utils\Response;

set_exception_handler(function ($e) {
    Response::error($e->getMessage(), 500);
});

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
    header('Access-Control-Allow-Headers: Authorization,Content-Type');
    exit;
}

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../src/Routes/routes.php';

http_response_code(404);
echo json_encode(['status' => 'error', 'message' => 'Endpoint not found']);
