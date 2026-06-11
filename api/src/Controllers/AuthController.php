<?php
namespace App\Controllers;

use App\Services\AuthService;
use App\Utils\AuthMiddleware;
use App\Utils\Jwt;
use App\Utils\Response;
use Exception;

class AuthController
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    public function login(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $username = $input['username'] ?? null;
        $password = $input['password'] ?? null;

        if (!$username || !$password) {
            Response::error('Username y password requeridos', 400);
        }

        try {
            $user = $this->authService->validateCredentials($username, $password);
            if (!$user) {
                Response::error('Credenciales inválidas', 401);
            }

            $token = Jwt::encode([
                'sub' => $user['id'],
                'username' => $user['username'],
                'role_id' => $user['role_id'],
                'role' => $user['role'],
            ]);

            Response::json([
                'status' => 'success',
                'data' => [
                    'token' => $token,
                    'user' => $user,
                ],
            ]);
        } catch (Exception $e) {
            Response::error('Error en login: ' . $e->getMessage(), 500);
        }
    }

    public function me(): void
    {
        $user = AuthMiddleware::verifyToken();
        $repo = new \App\Repositories\UserRepository();
        $dbUser = $repo->findById((int)$user->sub);

        Response::json([
            'status' => 'success',
            'data' => [
                'id' => (int)$user->sub,
                'username' => $user->username ?? null,
                'full_name' => $dbUser['full_name'] ?? null,
                'role_id' => (int)$user->role_id,
                'role' => AuthMiddleware::roleNameFromUser($user),
            ],
        ]);
    }
}
