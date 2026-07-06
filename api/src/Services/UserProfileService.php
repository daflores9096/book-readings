<?php
namespace App\Services;

use App\Repositories\FriendshipRepository;
use App\Repositories\UserBookRepository;
use App\Repositories\UserRepository;
use App\Utils\Response;

class UserProfileService
{
    private UserRepository $userRepository;
    private FriendshipRepository $friendshipRepository;
    private UserBookRepository $userBookRepository;
    private ReadingChallengeService $readingChallengeService;

    public function __construct()
    {
        $this->userRepository = new UserRepository();
        $this->friendshipRepository = new FriendshipRepository();
        $this->userBookRepository = new UserBookRepository();
        $this->readingChallengeService = new ReadingChallengeService();
    }

    public function profileForViewer(int $viewerId, int $targetUserId): array
    {
        if ($targetUserId <= 0) {
            Response::error('Usuario no válido', 400);
        }

        $user = $this->userRepository->findById($targetUserId);
        if (!$user) {
            Response::error('Usuario no encontrado', 404);
        }

        $isSelf = $viewerId === $targetUserId;
        if (!$isSelf && !$this->friendshipRepository->areAcceptedFriends($viewerId, $targetUserId)) {
            Response::error('No tienes permiso para ver este perfil', 403);
        }

        $year = (int)date('Y');
        $yearStart = sprintf('%04d-01-01', $year);
        $yearEnd = sprintf('%04d-12-31', $year);

        $readThisYear = $this->userBookRepository->listReadFinishedBetween($targetUserId, $yearStart, $yearEnd);
        [$longest, $shortest] = $this->extremesByPages($readThisYear);

        return [
            'user' => [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'full_name' => $user['full_name'],
            ],
            'is_self' => $isSelf,
            'year' => $year,
            'active_challenge' => $this->readingChallengeService->activeForUser($targetUserId),
            'recent_books' => $this->publicBookList($this->userBookRepository->listRecentReadBooks($targetUserId, 5)),
            'longest_this_year' => $longest ? $this->publicBook($longest) : null,
            'shortest_this_year' => $shortest ? $this->publicBook($shortest) : null,
        ];
    }

    private function extremesByPages(array $books): array
    {
        $longest = null;
        $shortest = null;

        foreach ($books as $book) {
            $pages = (int)($book['page_count'] ?? 0);
            if ($pages <= 0) {
                continue;
            }
            if (!$longest || $pages > (int)$longest['page_count']) {
                $longest = $book;
            }
            if (!$shortest || $pages < (int)$shortest['page_count']) {
                $shortest = $book;
            }
        }

        return [$longest, $shortest];
    }

    private function publicBookList(array $books): array
    {
        return array_map(fn ($book) => $this->publicBook($book), $books);
    }

    private function publicBook(array $book): array
    {
        return [
            'title' => $book['title'],
            'authors' => $book['authors'],
            'page_count' => $book['page_count'] !== null ? (int)$book['page_count'] : null,
            'cover_url' => $book['cover_url'],
            'cover_path' => $book['cover_path'],
            'finished_at' => $book['finished_at'],
            'rating' => (int)($book['rating'] ?? 0),
        ];
    }
}
