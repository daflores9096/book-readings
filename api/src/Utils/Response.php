<?php
namespace App\Utils;

class Response
{
    public static function json(mixed $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        if (!is_array($data)) {
            $data = [
                'status' => $statusCode >= 400 ? 'error' : 'success',
                'message' => $data,
            ];
        }

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public static function noContent(int $statusCode = 204): void
    {
        http_response_code($statusCode);
        exit;
    }

    public static function error(string $message, int $statusCode = 400): void
    {
        self::json([
            'status' => 'error',
            'message' => $message,
        ], $statusCode);
    }
}
