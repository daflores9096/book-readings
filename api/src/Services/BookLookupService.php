<?php
namespace App\Services;

use App\Utils\IsbnHelper;

class BookLookupService
{
    public function lookup(string $isbn13): ?array
    {
        $openLibrary = $this->lookupOpenLibrary($isbn13);
        if ($openLibrary) {
            return $openLibrary;
        }

        return $this->lookupGoogleBooks($isbn13);
    }

    public function search(string $type, string $query, int $limit = 10): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        if ($type === 'isbn') {
            $isbn13 = IsbnHelper::normalize($query);
            if (!$isbn13) {
                return [];
            }

            $book = $this->lookup($isbn13);
            return $book ? [$book] : [];
        }

        $googleResults = $this->searchGoogleBooks($type, $query, $limit);
        if (count($googleResults) >= $limit) {
            return array_slice($googleResults, 0, $limit);
        }

        $openLibraryResults = $this->searchOpenLibrary($type, $query, $limit - count($googleResults));
        return array_slice($this->dedupeResults([...$googleResults, ...$openLibraryResults]), 0, $limit);
    }

    private function lookupOpenLibrary(string $isbn13): ?array
    {
        $url = 'https://openlibrary.org/api/books?bibkeys=ISBN:' . urlencode($isbn13) . '&jscmd=data&format=json';
        $payload = $this->fetchJson($url);
        if (!$payload) {
            return null;
        }

        $key = 'ISBN:' . $isbn13;
        if (empty($payload[$key])) {
            return null;
        }

        $book = $payload[$key];
        $authors = [];
        foreach ($book['authors'] ?? [] as $author) {
            if (!empty($author['name'])) {
                $authors[] = $author['name'];
            }
        }

        $coverUrl = $book['cover']['large']
            ?? $book['cover']['medium']
            ?? ('https://covers.openlibrary.org/b/isbn/' . $isbn13 . '-L.jpg');

        return [
            'isbn13' => $isbn13,
            'isbn10' => $book['identifiers']['isbn_10'][0] ?? null,
            'title' => $book['title'] ?? 'Sin título',
            'authors' => $authors,
            'page_count' => isset($book['number_of_pages']) ? (int)$book['number_of_pages'] : null,
            'publisher' => $book['publishers'][0]['name'] ?? null,
            'published_date' => $book['publish_date'] ?? null,
            'description' => null,
            'cover_url' => $coverUrl,
            'source' => 'open_library',
        ];
    }

    private function lookupGoogleBooks(string $isbn13): ?array
    {
        $url = 'https://www.googleapis.com/books/v1/volumes?q=isbn:' . urlencode($isbn13);
        $payload = $this->fetchJson($url);
        if (!$payload || empty($payload['items'][0]['volumeInfo'])) {
            return null;
        }

        return $this->normalizeGoogleVolume($payload['items'][0], $isbn13);
    }

    private function searchGoogleBooks(string $type, string $query, int $limit): array
    {
        $operator = $type === 'author' ? 'inauthor' : 'intitle';
        $url = 'https://www.googleapis.com/books/v1/volumes?q=' . urlencode($operator . ':' . $query)
            . '&maxResults=' . min(40, max(1, $limit));
        $payload = $this->fetchJson($url);
        if (!$payload || empty($payload['items'])) {
            return [];
        }

        $results = [];
        foreach ($payload['items'] as $item) {
            if (empty($item['volumeInfo'])) {
                continue;
            }
            $results[] = $this->enrichGoogleVolume($item);
        }

        return $results;
    }

    private function enrichGoogleVolume(array $item): array
    {
        $book = $this->normalizeGoogleVolume($item);
        if (!empty($book['isbn13']) && !empty($book['page_count'])) {
            return $book;
        }

        $volumeId = $item['id'] ?? null;
        if (!$volumeId) {
            return $book;
        }

        $url = 'https://www.googleapis.com/books/v1/volumes/' . urlencode($volumeId);
        $payload = $this->fetchJson($url);
        if (!$payload || empty($payload['volumeInfo'])) {
            return $book;
        }

        return $this->mergeBookMetadata($book, $this->normalizeGoogleVolume($payload, $book['isbn13']));
    }

    private function mergeBookMetadata(array $base, array $extra): array
    {
        foreach (['isbn13', 'isbn10', 'page_count', 'publisher', 'published_date', 'description', 'cover_url'] as $field) {
            if (($base[$field] ?? null) === null || $base[$field] === '' || $base[$field] === 0) {
                if (($extra[$field] ?? null) !== null && $extra[$field] !== '' && $extra[$field] !== 0) {
                    $base[$field] = $extra[$field];
                }
            }
        }

        if (empty($base['authors']) && !empty($extra['authors'])) {
            $base['authors'] = $extra['authors'];
        }

        return $base;
    }

    private function searchOpenLibrary(string $type, string $query, int $limit): array
    {
        if ($limit <= 0) {
            return [];
        }

        $param = $type === 'author' ? 'author' : 'title';
        $url = 'https://openlibrary.org/search.json?' . $param . '=' . urlencode($query)
            . '&limit=' . min(100, max(1, $limit));
        $payload = $this->fetchJson($url);
        if (!$payload || empty($payload['docs'])) {
            return [];
        }

        $results = [];
        foreach ($payload['docs'] as $doc) {
            $results[] = $this->normalizeOpenLibraryDoc($doc);
        }

        return $results;
    }

    private function normalizeOpenLibraryDoc(array $doc): array
    {
        $isbn13 = $this->extractIsbn13($doc['isbn'] ?? []);
        $isbn10 = null;
        $pageCount = isset($doc['number_of_pages_median']) ? (int)$doc['number_of_pages_median'] : null;
        $publisher = $doc['publisher'][0] ?? null;

        $editionKeys = [];
        if (!empty($doc['cover_edition_key'])) {
            $editionKeys[] = (string)$doc['cover_edition_key'];
        }
        foreach ($doc['edition_key'] ?? [] as $editionKey) {
            $editionKeys[] = (string)$editionKey;
        }
        $editionKeys = array_values(array_unique(array_filter($editionKeys)));

        foreach ($editionKeys as $editionKey) {
            if ($isbn13 && $pageCount) {
                break;
            }

            $edition = $this->fetchOpenLibraryEdition($editionKey);
            if (!$edition) {
                continue;
            }

            $editionIsbn = $this->extractIsbnPairFromEdition($edition);
            $isbn13 = $isbn13 ?: $editionIsbn['isbn13'];
            $isbn10 = $isbn10 ?: $editionIsbn['isbn10'];
            $pageCount = $pageCount ?: (isset($edition['number_of_pages']) ? (int)$edition['number_of_pages'] : null);
            $publisher = $publisher ?: ($edition['publishers'][0] ?? null);
        }

        if ((!$isbn13 || !$pageCount) && !empty($doc['key'])) {
            $fromWork = $this->fetchBestEditionFromWork((string)$doc['key']);
            if ($fromWork) {
                $isbn13 = $isbn13 ?: $fromWork['isbn13'];
                $isbn10 = $isbn10 ?: $fromWork['isbn10'];
                $pageCount = $pageCount ?: $fromWork['page_count'];
                $publisher = $publisher ?: $fromWork['publisher'];
            }
        }

        if (!$isbn13 || !$pageCount) {
            $googleMatch = $this->lookupGoogleByTitleAuthors($doc['title'] ?? '', $doc['author_name'] ?? []);
            if ($googleMatch) {
                $isbn13 = $isbn13 ?: $googleMatch['isbn13'];
                $isbn10 = $isbn10 ?: $googleMatch['isbn10'];
                $pageCount = $pageCount ?: $googleMatch['page_count'];
                $publisher = $publisher ?: $googleMatch['publisher'];
            }
        }

        $coverUrl = null;
        if (!empty($doc['cover_i'])) {
            $coverUrl = 'https://covers.openlibrary.org/b/id/' . $doc['cover_i'] . '-L.jpg';
        } elseif ($isbn13) {
            $coverUrl = 'https://covers.openlibrary.org/b/isbn/' . $isbn13 . '-L.jpg';
        }

        return [
            'isbn13' => $isbn13,
            'isbn10' => $isbn10,
            'title' => $doc['title'] ?? 'Sin título',
            'authors' => $doc['author_name'] ?? [],
            'page_count' => $pageCount,
            'publisher' => $publisher,
            'published_date' => isset($doc['first_publish_year']) ? (string)$doc['first_publish_year'] : null,
            'description' => null,
            'cover_url' => $coverUrl,
            'source' => 'open_library',
        ];
    }

    private function fetchBestEditionFromWork(string $workKey): ?array
    {
        $workKey = trim($workKey, '/');
        if ($workKey === '') {
            return null;
        }

        $url = 'https://openlibrary.org/' . $workKey . '/editions.json?limit=5';
        $payload = $this->fetchJson($url);
        if (!$payload || empty($payload['entries'])) {
            return null;
        }

        $best = null;
        foreach ($payload['entries'] as $entry) {
            $editionKey = basename((string)($entry['key'] ?? ''));
            if ($editionKey === '') {
                continue;
            }

            $edition = $this->fetchOpenLibraryEdition($editionKey);
            if (!$edition) {
                continue;
            }

            $isbnPair = $this->extractIsbnPairFromEdition($edition);
            $candidate = [
                'isbn13' => $isbnPair['isbn13'],
                'isbn10' => $isbnPair['isbn10'],
                'page_count' => isset($edition['number_of_pages']) ? (int)$edition['number_of_pages'] : null,
                'publisher' => $edition['publishers'][0] ?? null,
            ];

            if (!$candidate['isbn13'] && !$candidate['page_count']) {
                continue;
            }

            if (
                !$best
                || (!$best['isbn13'] && $candidate['isbn13'])
                || (!$best['page_count'] && $candidate['page_count'])
            ) {
                $best = $candidate;
            }

            if (!empty($best['isbn13']) && !empty($best['page_count'])) {
                break;
            }
        }

        return $best;
    }

    private function lookupGoogleByTitleAuthors(string $title, array $authors): ?array
    {
        $title = trim($title);
        if ($title === '') {
            return null;
        }

        $query = 'intitle:' . $title;
        if (!empty($authors[0])) {
            $query .= '+inauthor:' . $authors[0];
        }

        $url = 'https://www.googleapis.com/books/v1/volumes?q=' . urlencode($query) . '&maxResults=1';
        $payload = $this->fetchJson($url);
        if (!$payload || empty($payload['items'][0]['volumeInfo'])) {
            return null;
        }

        return $this->enrichGoogleVolume($payload['items'][0]);
    }

    private function fetchOpenLibraryEdition(string $editionKey): ?array
    {
        $url = 'https://openlibrary.org/books/' . urlencode($editionKey) . '.json';
        return $this->fetchJson($url);
    }

    private function extractIsbn13(array $identifiers): ?string
    {
        $fallback = null;
        foreach ($identifiers as $identifier) {
            $normalized = IsbnHelper::normalize((string)$identifier);
            if (!$normalized) {
                continue;
            }

            $digits = preg_replace('/\D+/', '', (string)$identifier) ?? '';
            if (strlen($digits) === 13) {
                return $normalized;
            }

            $fallback = $fallback ?? $normalized;
        }

        return $fallback;
    }

    private function extractIsbn13FromEdition(array $edition): ?string
    {
        return $this->extractIsbnPairFromEdition($edition)['isbn13'];
    }

    private function extractIsbnPairFromEdition(array $edition): array
    {
        $isbn13 = null;
        $isbn10 = null;

        foreach ($edition['isbn_13'] ?? [] as $identifier) {
            $normalized = IsbnHelper::normalize((string)$identifier);
            if ($normalized) {
                $isbn13 = $normalized;
                break;
            }
        }

        foreach ($edition['isbn_10'] ?? [] as $identifier) {
            $normalized = IsbnHelper::normalizeIsbn10((string)$identifier);
            if (!$normalized) {
                continue;
            }

            $isbn10 = $isbn10 ?? $normalized;
            $isbn13 = $isbn13 ?? IsbnHelper::normalize($normalized);
            if ($isbn13) {
                break;
            }
        }

        return [
            'isbn13' => $isbn13,
            'isbn10' => $isbn10,
        ];
    }

    private function normalizeGoogleVolume(array $item, ?string $fallbackIsbn13 = null): array
    {
        $info = $item['volumeInfo'];
        $authors = $info['authors'] ?? [];
        $isbn13 = $fallbackIsbn13;
        $isbn10 = null;
        foreach ($info['industryIdentifiers'] ?? [] as $identifier) {
            $type = $identifier['type'] ?? '';
            $value = $identifier['identifier'] ?? '';
            if ($type === 'ISBN_13') {
                $isbn13 = IsbnHelper::normalize($value) ?? $isbn13;
            }
            if ($type === 'ISBN_10') {
                $isbn10 = IsbnHelper::normalizeIsbn10($value) ?? $isbn10;
                $isbn13 = $isbn13 ?? IsbnHelper::normalize($value);
            }
        }

        $coverUrl = $info['imageLinks']['thumbnail']
            ?? $info['imageLinks']['smallThumbnail']
            ?? null;

        return [
            'isbn13' => $isbn13,
            'isbn10' => $isbn10,
            'title' => $info['title'] ?? 'Sin título',
            'authors' => $authors,
            'page_count' => isset($info['pageCount']) ? (int)$info['pageCount'] : null,
            'publisher' => $info['publisher'] ?? null,
            'published_date' => $info['publishedDate'] ?? null,
            'description' => $info['description'] ?? null,
            'cover_url' => $coverUrl,
            'source' => 'google_books',
        ];
    }

    private function dedupeResults(array $results): array
    {
        $deduped = [];
        foreach ($results as $result) {
            $key = $result['isbn13'] ?: strtolower(trim(($result['title'] ?? '') . '|' . implode(',', $result['authors'] ?? [])));
            if ($key === '') {
                continue;
            }

            if (!isset($deduped[$key])) {
                $deduped[$key] = $result;
                continue;
            }

            $deduped[$key] = $this->mergeBookMetadata($deduped[$key], $result);
        }

        return array_values($deduped);
    }

    private function fetchJson(string $url): ?array
    {
        $context = stream_context_create([
            'http' => [
                'timeout' => 8,
                'header' => "User-Agent: BookReadingsApp/1.0\r\n",
            ],
        ]);

        $raw = @file_get_contents($url, false, $context);
        if ($raw === false) {
            return null;
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }
}
