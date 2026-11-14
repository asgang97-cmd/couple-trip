import { useEffect, useState, type CSSProperties } from 'react'
import { MemberPicker } from './components/MemberPicker'
import { PasswordGate } from './components/PasswordGate'
import { TripPage } from './components/TripPage'
import { getMember, hasStoredSession, isSignedIn, onSignedOut, setMember } from './lib/session'
import type { Member } from './lib/types'
import { theme } from './theme'

const themeVars = { '--primary': theme.primary, '--bg': theme.background } as CSSProperties

export default function App() {
  // 로그인 기록이 있으면 바로 일정 화면 (오프라인에서도 빈 화면 없이)
  const [signedIn, setSignedIn] = useState<boolean | null>(() => (hasStoredSession() ? true : null))
  const [member, setMemberState] = useState<Member | null>(() => getMember())

  useEffect(() => {
    isSignedIn().then(setSignedIn, () => setSignedIn(false))
    return onSignedOut(() => setSignedIn(false))
  }, [])

  function pick(m: Member) {
    setMember(m)
    setMemberState(m)
  }

  let screen
  if (signedIn === null) screen = null
  else if (!signedIn) screen = <PasswordGate onSuccess={() => setSignedIn(true)} />
  else if (!member) screen = <MemberPicker onPick={pick} />
  else screen = <TripPage member={member} />

  return (
    <div className="app" style={themeVars}>
      {screen}
    </div>
  )
}
