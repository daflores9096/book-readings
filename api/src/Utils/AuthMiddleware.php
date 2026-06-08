<?php
namespace App\Utils;

use Exception;

class AuthMiddleware
{
    public const ROLE_MAP = [
        1 => 'admin',
        2 => 'reader',
    ];

    private static function getHeaders(): array
    {
        if (function_exists('apache_request_headers')) {
            return apache_request_headers();
        }

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
                $headers[$name] = $value;
            }
        }
        return $headers;
    }

    public static function verifyToken(): object
    {
        $headers = self::getHeaders();

        if (!isset($headers['Authorization'])) {
            Response::error('Token no proporcionado', 401);
        }

        $authHeader = $headers['Authorization'];

        if (!str_starts_with($authHeader, 'Bearer ')) {
            Response::error('Formato de token inválido', 400);
        }

        $token = trim(str_replace('Bearer', '', $authHeader));

        try {
            return Jwt::verify($token);
        } catch (Exception $e) {
            Response::error('Token inválido o expirado: ' . $e->getMessage(), 401);
        }
    }

    public static function roleNameFromUser(object $user): string
    {
        if (!isset($user->role_id)) {
            Response::error('Token inválido: falta role_id', 401);
        }

        return self::ROLE_MAP[(int)$user->role_id] ?? 'reader';
    }

    public static function requireRole(array|string $allowedRoles): object
    {
        $user = self::verifyToken();

        if (is_string($allowedRoles)) {
            $allowedRoles = [$allowedRoles];
        }

        $roleName = self::roleNameFromUser($user);
        if (!in_array($roleName, $allowedRoles, true)) {
            Response::error('No tienes permiso para acceder a este recurso', 403);
        }

        return $user;
    }
}
