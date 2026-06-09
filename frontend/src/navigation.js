export const navItems = [
  { id: 'library', title: 'Mi biblioteca', url: '/library' },
  { id: 'add', title: 'Agregar libro', url: '/books/add' },
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
