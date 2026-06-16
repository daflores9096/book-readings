<?php
namespace App\Controllers;

use App\Services\DatabaseBackupService;
use App\Utils\AuthMiddleware;
use App\Utils\Response;

class BackupController
{
    private DatabaseBackupService $service;

    public function __construct()
    {
        $this->service = new DatabaseBackupService();
    }

    public function export(): void
    {
        AuthMiddleware::requireRole('admin');

        $filename = 'book-readings-backup-' . date('Y-m-d-His') . '.sql';
        $sql = $this->service->exportSql();

        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Expose-Headers: Content-Disposition');
        header('Content-Type: application/sql; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($sql));
        echo $sql;
        exit;
    }

    public function restore(): void
    {
        AuthMiddleware::requireRole('admin');

        if (empty($_FILES['backup'])) {
            Response::error('Archivo de respaldo requerido', 400);
        }

        if ($_FILES['backup']['error'] !== UPLOAD_ERR_OK) {
            Response::error($this->uploadErrorMessage((int)$_FILES['backup']['error']), 400);
        }

        $originalName = (string)($_FILES['backup']['name'] ?? '');
        if (!str_ends_with(strtolower($originalName), '.sql')) {
            Response::error('El respaldo debe ser un archivo .sql', 400);
        }

        $sql = file_get_contents($_FILES['backup']['tmp_name']);
        if ($sql === false || trim($sql) === '') {
            Response::error('No se pudo leer el archivo de respaldo', 400);
        }

        $this->service->restoreSql($sql);

        Response::json([
            'status' => 'success',
            'message' => 'Respaldo restaurado correctamente',
        ]);
    }

    private function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'El archivo excede el tamaño máximo permitido',
            UPLOAD_ERR_PARTIAL => 'El archivo se subió parcialmente. Intenta nuevamente',
            UPLOAD_ERR_NO_FILE => 'No se recibió ningún archivo de respaldo',
            UPLOAD_ERR_NO_TMP_DIR => 'Falta el directorio temporal para subir archivos',
            UPLOAD_ERR_CANT_WRITE => 'No se pudo escribir el respaldo en el servidor',
            UPLOAD_ERR_EXTENSION => 'Una extensión de PHP detuvo la subida del respaldo',
            default => 'Error desconocido al subir el respaldo',
        };
    }
}
