<?php
namespace App\Services;

use App\Repositories\UserRepository;
use Exception;

class AuthService
{
    private UserRepository $userRepository;

    public function __construct()
    {
        $this->userRepository = new UserRepository();
    }

    public function validateCredentials(string $username, string $password): ?array
    {
        $user = $this->userRepository->findByUsername($username);

        if (!$user || !password_verify($password, $user['password'])) {
            return null;
        }

        unset($user['password']);
        return $user;
    }

    public function registerUser(string $username, string $password, string $email, int $roleId = 2): array
    {
        if ($this->userRepository->findByUsername($username)) {
            throw new Exception('El nombre de usuario ya existe.');
        }

        if ($this->userRepository->emailExists($email)) {
            throw new Exception('El email ya está registrado.');
        }

        $userId = $this->userRepository->create([
            'username' => $username,
            'password' => password_hash($password, PASSWORD_BCRYPT),
            'email' => $email,
            'role_id' => $roleId,
        ]);

        return [
            'id' => $userId,
            'username' => $username,
            'email' => $email,
            'role_id' => $roleId,
        ];
    }
}
