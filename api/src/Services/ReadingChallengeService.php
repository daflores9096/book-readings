<?php
namespace App\Services;

use App\Repositories\ReadingChallengeRepository;
use App\Utils\Response;

class ReadingChallengeService
{
    private ReadingChallengeRepository $repository;

    public function __construct()
    {
        $this->repository = new ReadingChallengeRepository();
    }

    public function listForUser(int $userId): array
    {
        return array_map(fn ($challenge) => $this->withProgress($userId, $challenge), $this->repository->listByUser($userId));
    }

    public function activeForUser(int $userId): ?array
    {
        $challenge = $this->repository->findActiveForUser($userId);
        return $challenge ? $this->withProgress($userId, $challenge) : null;
    }

    public function create(int $userId, array $input): array
    {
        $targetBooks = (int)($input['target_books'] ?? 0);
        $periodType = (string)($input['period_type'] ?? 'year');
        $periodYear = (int)($input['period_year'] ?? date('Y'));
        $periodMonth = array_key_exists('period_month', $input) && $input['period_month'] !== ''
            ? (int)$input['period_month']
            : null;

        if ($targetBooks < 1) {
            Response::error('El objetivo debe ser al menos 1 libro', 400);
        }
        if (!in_array($periodType, ['month', 'year'], true)) {
            Response::error('Tipo de período inválido', 400);
        }
        if ($periodYear < 2000 || $periodYear > 2100) {
            Response::error('Año inválido', 400);
        }
        if ($periodType === 'month' && ($periodMonth === null || $periodMonth < 1 || $periodMonth > 12)) {
            Response::error('Mes inválido', 400);
        }

        [$startsAt, $endsAt] = $this->periodDates($periodType, $periodYear, $periodMonth);
        $name = trim((string)($input['name'] ?? ''));
        if ($name === '') {
            $name = $periodType === 'month'
                ? sprintf('Desafío %02d/%d', $periodMonth, $periodYear)
                : sprintf('Desafío %d', $periodYear);
        }

        $id = $this->repository->create([
            'user_id' => $userId,
            'name' => $name,
            'target_books' => $targetBooks,
            'period_type' => $periodType,
            'period_year' => $periodYear,
            'period_month' => $periodType === 'month' ? $periodMonth : null,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);

        $challenge = $this->repository->findByIdForUser($id, $userId);
        return $this->withProgress($userId, $challenge ?? []);
    }

    public function delete(int $userId, int $id): void
    {
        $this->repository->delete($id, $userId);
    }

    private function withProgress(int $userId, array $challenge): array
    {
        $completed = $this->repository->countFinishedBooks($userId, $challenge['starts_at'], $challenge['ends_at']);
        $target = max(1, (int)$challenge['target_books']);
        $challenge['completed_books'] = $completed;
        $challenge['remaining_books'] = max(0, $target - $completed);
        $challenge['progress_percent'] = min(100, (int)round(($completed / $target) * 100));
        $challenge['is_completed'] = $completed >= $target;
        return $challenge;
    }

    private function periodDates(string $periodType, int $year, ?int $month): array
    {
        if ($periodType === 'month') {
            $start = \DateTime::createFromFormat('!Y-n-j', sprintf('%d-%d-1', $year, $month));
            $end = clone $start;
            $end->modify('last day of this month');
            return [$start->format('Y-m-d'), $end->format('Y-m-d')];
        }

        return [sprintf('%04d-01-01', $year), sprintf('%04d-12-31', $year)];
    }
}
