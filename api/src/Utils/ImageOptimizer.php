<?php
namespace App\Utils;

class ImageOptimizer
{
    public static function saveCover(string $tmpPath, string $destinationPath, int $maxWidth = 720, int $maxHeight = 960): bool
    {
        $info = @getimagesize($tmpPath);
        if ($info === false) {
            return false;
        }

        [$width, $height, $type] = $info;
        $source = match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($tmpPath),
            IMAGETYPE_PNG => @imagecreatefrompng($tmpPath),
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($tmpPath) : false,
            default => false,
        };

        if (!$source) {
            return false;
        }

        if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $exif = @exif_read_data($tmpPath);
            if (!empty($exif['Orientation'])) {
                $source = self::applyOrientation($source, (int)$exif['Orientation']) ?: $source;
            }
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min(1, $maxWidth / $width, $maxHeight / $height);
        $targetWidth = (int)round($width * $scale);
        $targetHeight = (int)round($height * $scale);
        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        $dir = dirname($destinationPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $saved = imagejpeg($canvas, $destinationPath, 72);
        imagedestroy($source);
        imagedestroy($canvas);

        return $saved;
    }

    private static function applyOrientation($image, int $orientation)
    {
        return match ($orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => $image,
        };
    }
}
