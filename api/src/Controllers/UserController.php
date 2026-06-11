<?php
namespace App\Controllers;

use App\Repositories\UserRepository;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

class UserController
{
    private UserRepository $repo;

    public function __construct()
    {
        $this->repo = new UserRepository();
    }

    public function list(): void
    {
        AuthMiddleware::requireRole(['admin']);
        Response::json([
            'status' => 'success',
            'data' => $this->repo->listAll(),
        ]);
    }

    public function create(): void
    {
        AuthMiddleware::requireRole(['admin']);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];

        if (!isset($input['username'], $input['password'], $input['email'], $input['role_id'])) {
            Response::error('username, password, email, role_id required', 400);
        }

        $username = trim((string)$input['username']);
        $fullName = trim((string)($input['full_name'] ?? ''));
        $email = trim((string)$input['email']);
        $password = (string)$input['password'];
        $roleId = (int)$input['role_id'];

        if ($username === '' || $email === '' || $password === '') {
            Response::error('Campos inválidos', 400);
        }

        if (!in_array($roleId, [1, 2], true)) {
            Response::error('role_id inválido', 400);
        }

        if ($this->repo->findByUsername($username)) {
            Response::error('El nombre de usuario ya existe', 409);
        }

        if ($this->repo->emailExists($email)) {
            Response::error('El email ya está registrado', 409);
        }

        $id = $this->repo->create([
            'username' => $username,
            'full_name' => $fullName !== '' ? $fullName : null,
            'password' => password_hash($password, PASSWORD_BCRYPT),
            'email' => $email,
            'role_id' => $roleId,
        ]);

        Response::json([
            'status' => 'success',
            'data' => ['id' => $id],
        ], 201);
    }

    public function update(int $id): void
    {
        $actor = AuthMiddleware::requireRole(['admin']);
        $target = $this->repo->findById($id);
        if (!$target) {
            Response::error('Usuario no encontrado', 404);
        }

        if ((int)$actor->sub === $id && (int)$target['role_id'] === 1) {
            // allow admin to edit self basic fields
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!isset($input['username'], $input['email'], $input['role_id'])) {
            Response::error('username, email, role_id required', 400);
        }

        $username = trim((string)$input['username']);
        $fullName = trim((string)($input['full_name'] ?? ''));
        $email = trim((string)$input['email']);
        $roleId = (int)$input['role_id'];

        if (!in_array($roleId, [1, 2], true)) {
            Response::error('role_id inválido', 400);
        }

        if ($this->repo->usernameExistsExcept($id, $username)) {
            Response::error('El nombre de usuario ya está en uso', 409);
        }
        if ($this->repo->emailExistsExcept($id, $email)) {
            Response::error('El email ya está en uso', 409);
        }

        $this->repo->update($id, $username, $fullName !== '' ? $fullName : null, $email, $roleId);
        Response::json(['status' => 'success', 'message' => 'Usuario actualizado']);
    }

    public function delete(int $id): void
    {
        $actor = AuthMiddleware::requireRole(['admin']);
        $actorId = (int)$actor->sub;

        if ($id === $actorId) {
            Response::error('No puedes eliminar tu propio usuario', 403);
        }

        $target = $this->repo->findById($id);
        if (!$target) {
            Response::error('Usuario no encontrado', 404);
        }

        if ($this->repo->countUserBooksForUser($id) > 0) {
            Response::error('No se puede eliminar: el usuario tiene libros registrados', 409);
        }

        $this->repo->delete($id);
        Response::noContent(204);
    }

    public function resetPassword(int $id): void
    {
        AuthMiddleware::requireRole(['admin']);
        $target = $this->repo->findById($id);
        if (!$target) {
            Response::error('Usuario no encontrado', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $password = (string)($input['password'] ?? '');
        if (strlen($password) < 6) {
            Response::error('La contraseña debe tener al menos 6 caracteres', 400);
        }

        $this->repo->updatePassword($id, password_hash($password, PASSWORD_BCRYPT));
        Response::json(['status' => 'success', 'message' => 'Contraseña actualizada']);
    }
}
