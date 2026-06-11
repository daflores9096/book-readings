<?php
namespace App\Services;

use App\Repositories\FriendshipRepository;
use App\Repositories\UserRepository;
use App\Utils\Response;

class FriendshipService
{
    private FriendshipRepository $friendshipRepository;
    private UserRepository $userRepository;

    public function __construct()
    {
        $this->friendshipRepository = new FriendshipRepository();
        $this->userRepository = new UserRepository();
    }

    public function listOverview(int $userId): array
    {
        return [
            'friends' => $this->friendshipRepository->listFriends($userId),
            'pending_received' => $this->friendshipRepository->listPendingReceived($userId),
            'pending_sent' => $this->friendshipRepository->listPendingSent($userId),
        ];
    }

    public function search(int $userId, string $query): array
    {
        $query = trim($query);
        if (strlen($query) < 2) {
            Response::error('Escribe al menos 2 caracteres para buscar', 400);
        }

        $results = $this->friendshipRepository->searchUsers($userId, $query);
        return array_map(function (array $row) use ($userId) {
            $status = $row['friendship_status'] ?? null;
            $relation = 'none';
            if ($status === 'accepted') {
                $relation = 'friend';
            } elseif ($status === 'pending') {
                $relation = (int)$row['requester_id'] === $userId ? 'pending_sent' : 'pending_received';
            } elseif ($status === 'rejected') {
                $relation = 'rejected';
            }

            return [
                'id' => (int)$row['id'],
                'username' => $row['username'],
                'full_name' => $row['full_name'],
                'email' => $row['email'],
                'friendship_id' => $row['friendship_id'] ? (int)$row['friendship_id'] : null,
                'relation' => $relation,
            ];
        }, $results);
    }

    public function sendRequest(int $requesterId, int $addresseeId): array
    {
        if ($requesterId === $addresseeId) {
            Response::error('No puedes agregarte a ti mismo', 400);
        }

        $target = $this->userRepository->findById($addresseeId);
        if (!$target) {
            Response::error('Usuario no encontrado', 404);
        }

        $existing = $this->friendshipRepository->findBetween($requesterId, $addresseeId);
        if ($existing) {
            if ($existing['status'] === 'accepted') {
                Response::error('Ya son amigos', 409);
            }
            if ($existing['status'] === 'pending') {
                if ((int)$existing['requester_id'] === $requesterId) {
                    Response::error('Ya enviaste una solicitud a este usuario', 409);
                }
                Response::error('Este usuario ya te envió una solicitud. Acéptala desde Mis amigos.', 409);
            }
            if ($existing['status'] === 'blocked') {
                Response::error('No se puede enviar solicitud a este usuario', 403);
            }

            $this->friendshipRepository->updateStatus((int)$existing['id'], 'pending');
            return $this->friendshipRepository->findById((int)$existing['id']) ?? [];
        }

        $id = $this->friendshipRepository->createRequest($requesterId, $addresseeId);
        return $this->friendshipRepository->findById($id) ?? [];
    }

    public function respondToRequest(int $userId, int $friendshipId, string $action): array
    {
        $friendship = $this->friendshipRepository->findById($friendshipId);
        if (!$friendship) {
            Response::error('Solicitud no encontrada', 404);
        }

        if ((int)$friendship['addressee_id'] !== $userId) {
            Response::error('No puedes responder esta solicitud', 403);
        }

        if ($friendship['status'] !== 'pending') {
            Response::error('La solicitud ya fue procesada', 409);
        }

        if (!in_array($action, ['accept', 'reject'], true)) {
            Response::error('Acción inválida', 400);
        }

        $status = $action === 'accept' ? 'accepted' : 'rejected';
        $this->friendshipRepository->updateStatus($friendshipId, $status);

        return $this->friendshipRepository->findById($friendshipId) ?? [];
    }

    public function removeFriendship(int $userId, int $friendshipId): void
    {
        $friendship = $this->friendshipRepository->findById($friendshipId);
        if (!$friendship) {
            Response::error('Amistad no encontrada', 404);
        }

        $requesterId = (int)$friendship['requester_id'];
        $addresseeId = (int)$friendship['addressee_id'];
        if ($userId !== $requesterId && $userId !== $addresseeId) {
            Response::error('No puedes eliminar esta amistad', 403);
        }

        $this->friendshipRepository->delete($friendshipId);
    }
}
