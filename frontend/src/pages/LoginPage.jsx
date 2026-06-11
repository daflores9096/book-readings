import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login as apiLogin } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Button, Card, Field, Input } from '../components/ui.jsx';

export default function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) {
    return <Navigate to="/home" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Debes ingresar usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      const res = await apiLogin(username, password);
      if (res?.status !== 'success') {
        setError(res?.message || 'Credenciales inválidas');
        return;
      }
      login(res.data.token, res.data.user);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Credenciales incorrectas' : err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <Card className="p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white shadow-sm">
              B
            </div>
            <p className="text-sm font-semibold text-brand-700">Bienvenido</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Book Readings</h1>
            <p className="mt-2 text-sm text-slate-600">Inicia sesión para continuar con tus lecturas.</p>
          </div>

          {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

          <div className="space-y-4">
            <Field label="Usuario">
              <Input id="user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Contraseña">
              <div className="relative">
                <Input id="pass" type={showPassword ? 'text' : 'password'} className="pr-11" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </Field>
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
