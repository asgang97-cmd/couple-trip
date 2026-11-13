import type { Member } from '../lib/types'
import { theme } from '../theme'

export function MemberPicker({ onPick }: { onPick: (m: Member) => void }) {
  return (
    <main className="center-screen">
      <h1>누구세요?</h1>
      <div className="row">
        {(['a', 'b'] as const).map((m) => (
          <button key={m} className="big-choice" onClick={() => onPick(m)}>
            <span className="emoji">{theme.emoji[m]}</span>
            {theme.names[m]}
          </button>
        ))}
      </div>
    </main>
  )
}
