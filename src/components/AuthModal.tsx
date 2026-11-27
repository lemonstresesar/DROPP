import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { DroppDictionary } from '../i18n/translations';
import { getFirebaseServices } from '../lib/firebase';
import { DroppLogo } from './DroppLogo';

interface AuthModalProps {
  t: DroppDictionary;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ t, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('Douala');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const [
        { auth, db },
        {
          signInWithEmailAndPassword,
          createUserWithEmailAndPassword,
          updateProfile,
          sendEmailVerification,
        },
        { doc, setDoc, serverTimestamp },
      ] = await Promise.all([
        getFirebaseServices(),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);

      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        const suffix =
          cred.user.uid.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X') || 'USER01';
        // Safe client profile creation (role locked to 'client' by Firestore rules)
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          displayName: displayName.trim() || 'Client DROPP',
          role: 'client',
          vendorStatus: 'none',
          isCertified: false,
          city,
          neighborhood: 'Akwa',
          referralCode: `DROPP-${suffix}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'users', cred.user.uid, 'private', 'info'), {
          uid: cred.user.uid,
          email: email.trim().toLowerCase(),
          updatedAt: serverTimestamp(),
        });

        await sendEmailVerification(cred.user).catch(() => undefined);
      }
      onClose();
    } catch (err) {
      const code = (err as { code?: string; message?: string })?.code || '';
      const msg = (err as { message?: string })?.message || '';
      if (
        code.includes('operation-not-allowed') ||
        msg.includes('PASSWORD_LOGIN_DISABLED') ||
        msg.includes('OPERATION_NOT_ALLOWED')
      ) {
        setErrorMsg(t.auth.emailPasswordDisabledNotice);
      } else if (
        code.includes('invalid-credential') ||
        code.includes('wrong-password') ||
        code.includes('user-not-found')
      ) {
        setErrorMsg(t.auth.invalidCredentials);
      } else {
        setErrorMsg(t.auth.genericAuthError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const [{ auth }, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
        getFirebaseServices(),
        import('firebase/auth'),
      ]);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch {
      setErrorMsg(t.auth.genericAuthError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? t.auth.loginTitle : t.auth.signupTitle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--dropp-elevated)] border-t sm:border border-[var(--dropp-border)] rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <DroppLogo />
          <button
            type="button"
            onClick={onClose}
            aria-label={t.actions.close}
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-full text-[var(--dropp-muted)] hover:text-[var(--dropp-text)] hover:bg-[var(--dropp-surface-alt)]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-[var(--dropp-text)]">
          {mode === 'login' ? t.auth.loginTitle : t.auth.signupTitle}
        </h2>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-[#E5484D]/12 border border-[#E5484D]/40 text-xs text-[#B42328] dark:text-[#FCA5A5] leading-relaxed"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-[var(--dropp-muted)] mb-1">
                  {t.auth.nameLabel}
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] focus:outline-none focus:border-[var(--dropp-accent)]"
                />
              </div>
              <div>
                <label htmlFor="auth-city" className="block text-xs font-medium text-[var(--dropp-muted)] mb-1">
                  {t.auth.cityLabel}
                </label>
                <select
                  id="auth-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] focus:outline-none focus:border-[var(--dropp-accent)]"
                >
                  <option value="Douala">Douala</option>
                  <option value="Yaoundé">Yaoundé</option>
                  <option value="Bafoussam">Bafoussam</option>
                  <option value="Garoua">Garoua</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[var(--dropp-muted)] mb-1">
              {t.auth.emailLabel}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] focus:outline-none focus:border-[var(--dropp-accent)]"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-[var(--dropp-muted)] mb-1">
              {t.auth.passwordLabel}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[var(--dropp-input)] border border-[var(--dropp-border)] text-sm text-[var(--dropp-text)] focus:outline-none focus:border-[var(--dropp-accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-[#FF5A1F] hover:bg-[#E54E19] text-white font-bold text-sm transition-colors disabled:opacity-50"
          >
            {mode === 'login' ? t.auth.loginSubmit : t.auth.signupSubmit}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-[var(--dropp-muted)]">
          <span className="flex-1 h-px bg-[var(--dropp-border)]" />
          <span>{t.auth.orDivider}</span>
          <span className="flex-1 h-px bg-[var(--dropp-border)]" />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full min-h-[44px] rounded-xl bg-[var(--dropp-surface)] border border-[var(--dropp-border-strong)] text-[var(--dropp-text)] text-sm font-semibold hover:bg-[var(--dropp-surface-alt)] transition-colors"
        >
          {t.auth.googleSignIn}
        </button>

        <button
          type="button"
          onClick={() => {
            setErrorMsg('');
            setMode((m) => (m === 'login' ? 'signup' : 'login'));
          }}
          className="mt-4 w-full min-h-[44px] text-xs font-medium text-[var(--dropp-muted)] hover:text-[var(--dropp-text)]"
        >
          {mode === 'login' ? t.auth.switchToSignup : t.auth.switchToLogin}
        </button>
      </div>
    </div>
  );
};
