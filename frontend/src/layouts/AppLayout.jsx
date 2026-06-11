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
        <div className="flex h-20 items-center border-b border-slate-200 px-5">
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-sm">
            B
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Lecturas</div>
            <div className="text-lg font-bold text-slate-950">Book Readings</div>
          </div>
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
            <button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen((o) => !o)} aria-label="Menú">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
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
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
