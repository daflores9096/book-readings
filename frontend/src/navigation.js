export const navItems = [
  { id: 'home', title: 'Inicio', url: '/home' },
  { id: 'library', title: 'Mi biblioteca', url: '/library' },
  { id: 'add', title: 'Agregar libro', url: '/books/add' },
  { id: 'challenges', title: 'Desafíos', url: '/challenges' },
  { id: 'friends', title: 'Mis amigos', url: '/friends' },
  { id: 'users', title: 'Usuarios', url: '/users', roles: ['admin'] },
];

export function getNavForRole(roleName) {
  const role = roleName ?? 'reader';
  return navItems.filter((item) => !item.roles || item.roles.includes(role));
}

export const SHELF_TABS = [
  { id: 'want_to_read', label: 'Quiero leer' },
  { id: 'reading', label: 'Leyendo' },
  { id: 'read', label: 'Leídos' },
];

export function coverSrc(book) {
  if (book?.cover_path) {
    return book.cover_path.startsWith('http') ? book.cover_path : `/${book.cover_path.replace(/^\//, '')}`;
  }
  if (book?.cover_url) return book.cover_url;
  return null;
}

export function authorsLabel(authors) {
  if (!authors?.length) return 'Autor desconocido';
  return authors.join(', ');
}

export function progressPercent(entry) {
  const total = Number(entry?.page_count) || 0;
  const current = Number(entry?.current_page) || 0;
  if (!total) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

export function displayName(user) {
  if (!user) return 'Usuario';
  return user.full_name?.trim() || user.username || 'Usuario';
}

export function activityMessage(type, isOwn = false) {
  const labels = {
    book_added_want_to_read: isOwn ? 'agregaste a Quiero leer' : 'agregó a Quiero leer',
    book_added_reading: isOwn ? 'empezaste a leer' : 'empezó a leer',
    status_reading: isOwn ? 'estás leyendo' : 'está leyendo',
    status_read: isOwn ? 'terminaste de leer' : 'terminó de leer',
    progress_updated: isOwn ? 'avanzaste con' : 'avanzó con',
    rating_updated: isOwn ? 'puntuaste' : 'puntuó',
  };
  return labels[type] || (isOwn ? 'actualizaste tu lectura' : 'actualizó su lectura');
}

export const STATUS_BADGE = {
  want_to_read: 'Quiero leer',
  reading: 'Leyendo',
  read: 'Leído',
};

export function formatActivityDate(value) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
