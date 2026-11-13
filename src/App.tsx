import { useEffect, useState, type CSSProperties } from 'react'
import { MemberPicker } from './components/MemberPicker'
import { PasswordGate } from './components/PasswordGate'
import { getMember, isSignedIn, setMember } from './lib/session'
import type { Member } from './lib/types'
import { theme } from './theme'

const themeVars = { '--primary': theme.primary, '--bg': theme.background } as CSSProperties

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [member, setMemberState] = useState<Member | null>(() => getMember())

  useEffect(() => {
    isSignedIn().then(setSignedIn, () => setSignedIn(false))
  }, [])

  function pick(m: Member) {
    setMember(m)
    setMemberState(m)
  }

  let screen
  if (signedIn === null) screen = null
  else if (!signedIn) screen = <PasswordGate onSuccess={() => setSignedIn(true)} />
  else if (!member) screen = <MemberPicker onPick={pick} />
  else
    screen = (
      <main className="center-screen">
        <h1>준비 완료 {theme.emoji[member]}</h1>
        <p>{theme.names[member]}(으)로 들어왔어요. 일정 화면은 다음 단계에서 만들어요.</p>
      </main>
    )

  return (
    <div className="app" style={themeVars}>
      {screen}
    </div>
  )
}
