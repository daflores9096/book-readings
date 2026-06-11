import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Flame, Home, LogOut, Menu, PlusCircle, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { getNavForRole } from '../navigation.js';
import { Button, cx } from '../components/ui.jsx';

export default function AppLayout() {
  const { user, logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = getNavForRole(role);
  const current = nav.find((item) => location.pathname.startsWith(item.url));
  const icons = {
    home: Home,
    library: BookOpen,
    add: PlusCircle,
    challenges: Flame,
    friends: UserPlus,
    users: Users,
  };
  const mobileNav = [
    { id: 'home', title: 'Inicio', url: '/home', icon: Home },
    { id: 'library', title: 'Mi Biblioteca', url: '/library', icon: BookOpen },
    { id: 'challenges', title: 'Desafíos', url: '/challenges', icon: Flame },
  ];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-700">
      {sidebarOpen && (
        <button type="button" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white transition-transform lg:sticky lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex min-w-0 items-center">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-sm">
              B
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lecturas</div>
              <div className="text-lg font-bold text-slate-950">Book Readings</div>
            </div>
          </div>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.url);
            const Icon = icons[item.id] ?? BookOpen;
            return (
              <Link
                key={item.id}
                to={item.url}
                onClick={() => setSidebarOpen(false)}
                className={cx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                )}
              >
                <Icon size={18} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Mi lectura</div>
              <div className="font-semibold text-slate-950">{current?.title ?? 'Book Readings'}</div>
            </div>
          </div>
          <div className="hidden text-right text-sm sm:block">
            <div className="font-semibold text-slate-950">{user?.full_name?.trim() || user?.username}</div>
            <div className="text-xs capitalize text-slate-500">{role}</div>
          </div>
          <Button type="button" onClick={handleLogout} variant="secondary" size="sm">
            <LogOut size={16} />
            Salir
          </Button>
        </header>
        <main className="flex-1 p-4 pb-28 md:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden" aria-label="Navegación principal móvil">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mobileNav.map((item) => {
            const active = location.pathname.startsWith(item.url);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.url}
                className={cx(
                  'flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icon size={21} strokeWidth={active ? 2.5 : 2} />
                <span className="mt-1 leading-none">{item.title}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className={cx(
              'flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-semibold transition',
              sidebarOpen ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            )}
            aria-label="Abrir menú completo"
          >
            <Menu size={21} strokeWidth={sidebarOpen ? 2.5 : 2} />
            <span className="mt-1 leading-none">Menú</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
