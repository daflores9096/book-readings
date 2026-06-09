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
            $results[] = $this->normalizeGoogleVolume($item);
        }

        return $results;
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
            $isbn13 = null;
            foreach ($doc['isbn'] ?? [] as $identifier) {
                $normalized = IsbnHelper::normalize((string)$identifier);
                if ($normalized) {
                    $isbn13 = $normalized;
                    break;
                }
            }

            $coverUrl = null;
            if (!empty($doc['cover_i'])) {
                $coverUrl = 'https://covers.openlibrary.org/b/id/' . $doc['cover_i'] . '-L.jpg';
            } elseif ($isbn13) {
                $coverUrl = 'https://covers.openlibrary.org/b/isbn/' . $isbn13 . '-L.jpg';
            }

            $results[] = [
                'isbn13' => $isbn13,
                'isbn10' => null,
                'title' => $doc['title'] ?? 'Sin título',
                'authors' => $doc['author_name'] ?? [],
                'page_count' => isset($doc['number_of_pages_median']) ? (int)$doc['number_of_pages_median'] : null,
                'publisher' => $doc['publisher'][0] ?? null,
                'published_date' => isset($doc['first_publish_year']) ? (string)$doc['first_publish_year'] : null,
                'description' => null,
                'cover_url' => $coverUrl,
                'source' => 'open_library',
            ];
        }

        return $results;
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
                $isbn10 = $value;
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
        $seen = [];
        $deduped = [];
        foreach ($results as $result) {
            $key = $result['isbn13'] ?: strtolower(trim(($result['title'] ?? '') . '|' . implode(',', $result['authors'] ?? [])));
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $deduped[] = $result;
        }

        return $deduped;
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
