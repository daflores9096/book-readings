import { useEffect, useState } from 'react';
import { Check, Search, UserMinus, UserPlus, X } from 'lucide-react';
import {
  getFriends,
  removeFriend,
  respondFriendRequest,
  searchFriends,
  sendFriendRequest,
} from '../api.js';
import { displayName } from '../navigation.js';

export default function FriendsPage() {
  const [overview, setOverview] = useState({ friends: [], pending_received: [], pending_sent: [] });
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getFriends();
      setOverview(res.data ?? { friends: [], pending_received: [], pending_sent: [] });
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los amigos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError('Escribe al menos 2 caracteres');
      return;
    }
    setSearching(true);
    setError('');
    setMessage('');
    try {
      const res = await searchFriends(q);
      setSearchResults(res.data ?? []);
    } catch (err) {
      setError(err.message || 'No se pudo buscar usuarios');
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(userId) {
    setError('');
    setMessage('');
    try {
      await sendFriendRequest(userId);
      setMessage('Solicitud enviada');
      await load();
      if (query.trim().length >= 2) {
        const res = await searchFriends(query.trim());
        setSearchResults(res.data ?? []);
      }
    } catch (err) {
      setError(err.message || 'No se pudo enviar la solicitud');
    }
  }

  async function handleRespond(friendshipId, action) {
    setError('');
    setMessage('');
    try {
      await respondFriendRequest(friendshipId, action);
      setMessage(action === 'accept' ? 'Solicitud aceptada' : 'Solicitud rechazada');
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo procesar la solicitud');
    }
  }

  async function handleRemove(friendshipId, name) {
    if (!confirm(`¿Eliminar a ${name} de tus amigos?`)) return;
    setError('');
    setMessage('');
    try {
      await removeFriend(friendshipId);
      setMessage('Amistad eliminada');
      await load();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la amistad');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Mis amigos</h1>
        <p className="text-sm text-white/75">Busca lectores y comparte tu actividad de lectura</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, usuario o email..."
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onSend={() => handleSendRequest(user.id)}
                onAccept={() => handleRespond(user.friendship_id, 'accept')}
                onReject={() => handleRespond(user.friendship_id, 'reject')}
                onRemove={() => handleRemove(user.friendship_id, displayName(user))}
              />
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">Cargando…</p>
      ) : (
        <>
          <Section title="Solicitudes recibidas" empty="No tienes solicitudes pendientes.">
            {overview.pending_received.map((user) => (
              <UserRow
                key={user.friendship_id}
                user={{ ...user, relation: 'pending_received', friendship_id: user.friendship_id }}
                onAccept={() => handleRespond(user.friendship_id, 'accept')}
                onReject={() => handleRespond(user.friendship_id, 'reject')}
              />
            ))}
          </Section>

          <Section title="Solicitudes enviadas" empty="No has enviado solicitudes pendientes.">
            {overview.pending_sent.map((user) => (
              <UserRow
                key={user.friendship_id}
                user={{ ...user, relation: 'pending_sent', friendship_id: user.friendship_id }}
              />
            ))}
          </Section>

          <Section title="Mis amigos" empty="Aún no tienes amigos agregados.">
            {overview.friends.map((user) => (
              <UserRow
                key={user.friendship_id}
                user={{ ...user, relation: 'friend', friendship_id: user.friendship_id }}
                onRemove={() => handleRemove(user.friendship_id, displayName(user))}
              />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean) && items.length > 0 && !(items.length === 1 && !items[0]);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-800">{title}</h2>
      {hasItems ? <div className="space-y-2">{children}</div> : <p className="text-sm text-slate-500">{empty}</p>}
    </div>
  );
}

function UserRow({ user, onSend, onAccept, onReject, onRemove }) {
  const name = displayName(user);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
      <div className="min-w-0">
        <div className="font-medium text-slate-800">{name}</div>
        <div className="text-sm text-slate-500">@{user.username}</div>
      </div>
      <div className="flex shrink-0 gap-1">
        {user.relation === 'none' && (
          <ActionButton label="Enviar solicitud" onClick={onSend} primary>
            <UserPlus size={16} />
          </ActionButton>
        )}
        {user.relation === 'pending_sent' && (
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">Pendiente</span>
        )}
        {user.relation === 'pending_received' && (
          <>
            <ActionButton label="Aceptar" onClick={onAccept} primary>
              <Check size={16} />
            </ActionButton>
            <ActionButton label="Rechazar" onClick={onReject}>
              <X size={16} />
            </ActionButton>
          </>
        )}
        {user.relation === 'friend' && (
          <ActionButton label="Eliminar amigo" onClick={onRemove} danger>
            <UserMinus size={16} />
          </ActionButton>
        )}
      </div>
    </div>
  );
}

function ActionButton({ label, children, onClick, primary, danger }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
        primary
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : danger
            ? 'text-red-600 hover:bg-red-50'
            : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}
