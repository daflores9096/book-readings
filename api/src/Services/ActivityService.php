<?php
namespace App\Services;

use App\Repositories\ActivityRepository;
use App\Repositories\FriendshipRepository;

class ActivityService
{
    private ActivityRepository $activityRepository;
    private FriendshipRepository $friendshipRepository;

    public function __construct()
    {
        $this->activityRepository = new ActivityRepository();
        $this->friendshipRepository = new FriendshipRepository();
    }

    public function feedForUser(int $userId, int $limit = 50, int $offset = 0): array
    {
        $friendIds = $this->friendshipRepository->listAcceptedFriendIds($userId);
        $userIds = array_values(array_unique(array_merge([$userId], $friendIds)));

        return $this->activityRepository->feedForUsers($userIds, $userId, $limit, $offset);
    }

    public function recordAdded(int $userId, array $entry, string $status): void
    {
        $type = match ($status) {
            'reading' => 'book_added_reading',
            'read' => 'status_read',
            default => 'book_added_want_to_read',
        };

        $this->record($userId, $entry, $type);
    }

    public function recordFromUpdate(int $userId, array $before, array $after): void
    {
        $userBookId = (int)$before['id'];
        $bookId = (int)$before['book_id'];

        if ($before['status'] !== $after['status']) {
            if ($after['status'] === 'reading') {
                $this->record($userId, $after, 'status_reading');
            } elseif ($after['status'] === 'read') {
                $this->record($userId, $after, 'status_read');
            }
        }

        if (
            (int)$before['current_page'] !== (int)$after['current_page']
            && $after['status'] === 'reading'
        ) {
            $this->record($userId, $after, 'progress_updated');
        }

        if (
            (int)($before['rating'] ?? 0) !== (int)($after['rating'] ?? 0)
            && (int)($after['rating'] ?? 0) > 0
            && $after['status'] === 'read'
        ) {
            $this->record($userId, $after, 'rating_updated');
        }
    }

    private function record(int $userId, array $entry, string $type): void
    {
        $metadata = [
            'status' => $entry['status'] ?? null,
            'current_page' => isset($entry['current_page']) ? (int)$entry['current_page'] : null,
            'page_count' => isset($entry['page_count']) ? (int)$entry['page_count'] : null,
            'rating' => isset($entry['rating']) ? (int)$entry['rating'] : null,
        ];

        $this->activityRepository->create(
            $userId,
            (int)$entry['book_id'],
            $type,
            isset($entry['id']) ? (int)$entry['id'] : null,
            $metadata
        );
    }
}
