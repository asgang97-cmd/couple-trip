import { useState, type FormEvent } from 'react'
import { signIn } from '../lib/session'
import { theme } from '../theme'
import { Mascot, Seat } from './Mascot'

export function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError(null)
    const result = await signIn(password)
    setBusy(false)
    if (result.ok) onSuccess()
    else setError(result.message)
  }

  return (
    <main className="center-screen">
      <div className="gate-perch" aria-hidden="true">
        <Mascot size={120} />
        <Seat size={180} />
      </div>
      <h1>{theme.appName}</h1>
      <form onSubmit={submit} className="stack">
        <label htmlFor="pw">비밀번호</label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          placeholder={theme.passwordHint}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" disabled={!password || busy}>
          들어가기
        </button>
      </form>
    </main>
  )
}
