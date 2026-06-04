import { useState, useCallback, useEffect } from 'react';
import { LogIn, UserPlus, X, Key } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuth: () => void;
}

export default function AuthModal({ open, onClose, onAuth }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername('');
      setPassword('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!username.trim() || !password) {
      setError('Fill in both fields');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Request failed');
      }
      onAuth();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tab, username, password, onAuth, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-gray-300" />
            <span className="text-gray-100 font-semibold text-sm">Workshop Account</span>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === 'login'
                ? 'text-gray-100 bg-gray-800 border-b-2 border-gray-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <LogIn size={13} /> Login
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === 'register'
                ? 'text-gray-100 bg-gray-800 border-b-2 border-gray-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <UserPlus size={13} /> Register
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Username</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your workshop username"
              autoFocus
            />
          </div>
          <div>
            <label className="text-gray-500 text-xs font-medium block mb-1 uppercase tracking-wider">Password</label>
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Min 4 characters"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 transition-colors"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : tab === 'login' ? (
              <LogIn size={14} />
            ) : (
              <UserPlus size={14} />
            )}
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-gray-700 text-[10px] text-center">
            Your API keys are encrypted and stored per-account.
            <br />No email required for workshop accounts.
          </p>
        </div>
      </div>
    </div>
  );
}
