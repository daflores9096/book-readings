<?php
namespace App\Services;

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

        $info = $payload['items'][0]['volumeInfo'];
        $authors = $info['authors'] ?? [];
        $coverUrl = $info['imageLinks']['thumbnail']
            ?? $info['imageLinks']['smallThumbnail']
            ?? null;

        return [
            'isbn13' => $isbn13,
            'isbn10' => null,
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
