<?php
namespace App\Utils;

class IsbnHelper
{
    public static function normalize(string $raw): ?string
    {
        $digits = preg_replace('/\D+/', '', $raw) ?? '';
        if ($digits === '') {
            return null;
        }

        if (strlen($digits) === 10) {
            return self::toIsbn13($digits);
        }

        if (strlen($digits) === 13) {
            return self::isValidIsbn13($digits) ? $digits : null;
        }

        return null;
    }

    public static function toIsbn10(string $isbn13): ?string
    {
        if (strlen($isbn13) !== 13 || !str_starts_with($isbn13, '978')) {
            return null;
        }

        $core = substr($isbn13, 3, 9);
        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += (int)$core[$i] * (10 - $i);
        }
        $check = (11 - ($sum % 11)) % 11;
        $checkChar = $check === 10 ? 'X' : (string)$check;

        return $core . $checkChar;
    }

    public static function normalizeIsbn10(string $raw): ?string
    {
        $value = strtoupper(trim(str_replace('-', '', $raw)));
        if ($value === '') {
            return null;
        }

        if (preg_match('/^\d{9}[\dX]$/', $value)) {
            return $value;
        }

        $isbn13 = self::normalize($raw);
        return $isbn13 ? self::toIsbn10($isbn13) : null;
    }

    private static function toIsbn13(string $isbn10): ?string
    {
        if (strlen($isbn10) !== 10) {
            return null;
        }

        $core = substr($isbn10, 0, 9);
        $prefix = '978' . $core;
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $digit = (int)$prefix[$i];
            $sum += ($i % 2 === 0) ? $digit : $digit * 3;
        }
        $check = (10 - ($sum % 10)) % 10;

        return $prefix . $check;
    }

    private static function isValidIsbn13(string $isbn13): bool
    {
        if (strlen($isbn13) !== 13) {
            return false;
        }

        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $digit = (int)$isbn13[$i];
            $sum += ($i % 2 === 0) ? $digit : $digit * 3;
        }
        $check = (10 - ($sum % 10)) % 10;

        return $check === (int)$isbn13[12];
    }
}
