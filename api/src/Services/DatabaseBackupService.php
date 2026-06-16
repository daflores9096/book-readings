<?php
namespace App\Services;

use App\Utils\Database;
use App\Utils\Response;
use PDO;
use PDOException;

class DatabaseBackupService
{
    public function exportSql(): string
    {
        $pdo = Database::getInstance();
        $lines = [
            '-- Book Readings database backup',
            '-- Generated: ' . date('Y-m-d H:i:s'),
            'SET NAMES utf8mb4;',
            'SET FOREIGN_KEY_CHECKS=0;',
            'SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";',
        ];

        foreach ($this->listTables($pdo) as $table) {
            $create = $pdo->query('SHOW CREATE TABLE `' . $this->escapeIdentifier($table) . '`')->fetch(PDO::FETCH_ASSOC);
            if (!$create || empty($create['Create Table'])) {
                continue;
            }

            $lines[] = '';
            $lines[] = 'DROP TABLE IF EXISTS `' . $this->escapeIdentifier($table) . '`;';
            $lines[] = $create['Create Table'] . ';';

            $statement = $pdo->query('SELECT * FROM `' . $this->escapeIdentifier($table) . '`');
            while ($row = $statement->fetch(PDO::FETCH_ASSOC)) {
                $columns = array_map(fn ($column) => '`' . $this->escapeIdentifier($column) . '`', array_keys($row));
                $values = array_map(fn ($value) => $this->quoteValue($pdo, $value), array_values($row));
                $lines[] = 'INSERT INTO `' . $this->escapeIdentifier($table) . '` (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $values) . ');';
            }
        }

        $lines[] = 'SET FOREIGN_KEY_CHECKS=1;';
        $lines[] = '';

        return implode("\n", $lines);
    }

    public function restoreSql(string $sql): void
    {
        $sql = trim($sql);
        if ($sql === '') {
            Response::error('El archivo de respaldo está vacío', 400);
        }

        $pdo = Database::getInstance();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

        try {
            $this->dropAllTables($pdo);

            foreach ($this->splitSqlStatements($sql) as $statement) {
                if ($this->shouldSkipStatement($statement)) {
                    continue;
                }
                $pdo->exec($statement);
            }

            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        } catch (PDOException $e) {
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
            Response::error('No se pudo restaurar el respaldo: ' . $e->getMessage(), 500);
        }
    }

    private function dropAllTables(PDO $pdo): void
    {
        foreach ($this->listTables($pdo) as $table) {
            $pdo->exec('DROP TABLE IF EXISTS `' . $this->escapeIdentifier($table) . '`');
        }
    }

    private function listTables(PDO $pdo): array
    {
        $tables = [];
        $statement = $pdo->query('SHOW TABLES');
        while ($row = $statement->fetch(PDO::FETCH_NUM)) {
            $tables[] = (string)$row[0];
        }

        return $tables;
    }

    private function quoteValue(PDO $pdo, mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }

        return $pdo->quote((string)$value);
    }

    private function escapeIdentifier(string $identifier): string
    {
        return str_replace('`', '``', $identifier);
    }

    private function shouldSkipStatement(string $statement): bool
    {
        $trimmed = trim($statement);
        if ($trimmed === '') {
            return true;
        }

        $upper = strtoupper(ltrim($trimmed));
        return str_starts_with($upper, '--') || str_starts_with($upper, '/*');
    }

    private function splitSqlStatements(string $sql): array
    {
        $statements = [];
        $buffer = '';
        $length = strlen($sql);
        $inSingleQuote = false;
        $inDoubleQuote = false;
        $inBacktick = false;

        for ($index = 0; $index < $length; $index++) {
            $char = $sql[$index];
            $previous = $index > 0 ? $sql[$index - 1] : '';

            if ($char === "'" && !$inDoubleQuote && !$inBacktick && $previous !== '\\') {
                if ($inSingleQuote && $index + 1 < $length && $sql[$index + 1] === "'") {
                    $buffer .= "''";
                    $index++;
                    continue;
                }
                $inSingleQuote = !$inSingleQuote;
            } elseif ($char === '"' && !$inSingleQuote && !$inBacktick && $previous !== '\\') {
                $inDoubleQuote = !$inDoubleQuote;
            } elseif ($char === '`' && !$inSingleQuote && !$inDoubleQuote && $previous !== '\\') {
                $inBacktick = !$inBacktick;
            }

            if ($char === ';' && !$inSingleQuote && !$inDoubleQuote && !$inBacktick) {
                $statements[] = trim($buffer);
                $buffer = '';
                continue;
            }

            $buffer .= $char;
        }

        if (trim($buffer) !== '') {
            $statements[] = trim($buffer);
        }

        return $statements;
    }
}
