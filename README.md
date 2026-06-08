# Book Readings

Aplicación web para registrar libros por ISBN, gestionar tu biblioteca personal (Quiere leer, Leyendo, Leídos), avance de lectura y portadas desde cámara móvil.

Arquitectura similar a [sales-app](https://github.com/daflores9096/sales-app):

- `web`: Nginx (SPA React + proxy `/api` y `/uploads`)
- `api`: PHP 8.2 + Apache + JWT
- `db`: MySQL 5.7

## Requisitos

- Docker Desktop
- Docker Compose (`docker compose`)
- Node.js 22+ solo si desarrollas frontend con Vite fuera de Docker

## Configuración

```powershell
copy .env.example .env
docker compose up -d --build
```

App disponible en `http://localhost:18081` (o el puerto de `WEB_PORT`).

## Credenciales iniciales

Admin:

- Usuario: `admin`
- Contraseña: `AdminP@ssw0rd`

Reader demo:

- Usuario: `reader`
- Contraseña: `ReaderP@ssw0rd`

## Desarrollo frontend

```powershell
docker compose up -d
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:5173`. El proxy de Vite envía `/api` y `/uploads` hacia `VITE_DEV_API_PROXY`.

## Funcionalidades MVP

- Login JWT con roles `admin` y `reader`
- Gestión de usuarios (admin)
- Búsqueda de libros por ISBN (Open Library + Google Books)
- Creación manual con portada optimizada (cámara/galería)
- Estanterías personales: Quiere leer / Leyendo / Leídos
- Registro de fechas de inicio/fin y avance por página

## Comandos útiles

```powershell
docker compose ps
docker compose logs -f api
docker compose down
docker compose down -v   # borra datos locales
```

## Estructura

```text
api/              Backend PHP
database/         SQL de inicialización
docker/           Dockerfiles y nginx
frontend/         React + Vite + Tailwind
docker-compose.yml
.env.example
```
