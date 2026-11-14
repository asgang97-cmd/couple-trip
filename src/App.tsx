import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { DecorContext } from './components/DecorContext'
import { loadDecorUrls, saveDecorUrls, type DecorUrls } from './lib/decor'
import { MemberPicker } from './components/MemberPicker'
import { PasswordGate } from './components/PasswordGate'
import { TripPage } from './components/TripPage'
import { getMember, hasStoredSession, isSignedIn, onSignedOut, setMember } from './lib/session'
import type { Member } from './lib/types'
import { theme } from './theme'

// theme.ts에서 고른 색을 디자인 토큰에 연결
const themeVars = { '--color-accent': theme.primary, '--color-paper': theme.background } as CSSProperties

export default function App() {
  // 로그인 기록이 있으면 바로 일정 화면 (오프라인에서도 빈 화면 없이)
  const [signedIn, setSignedIn] = useState<boolean | null>(() => (hasStoredSession() ? true : null))
  const [member, setMemberState] = useState<Member | null>(() => getMember())
  // 꾸미기 사진 주소 (마지막 것을 폰에 기억: 로그인 전 비밀번호 화면·오프라인에서도 보이게)
  const [decor, setDecor] = useState<DecorUrls>(() => loadDecorUrls())
  const updateDecor = useCallback((urls: DecorUrls) => {
    saveDecorUrls(urls)
    setDecor(urls)
  }, [])

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
  else screen = <TripPage member={member} onDecor={updateDecor} />

  return (
    <DecorContext.Provider value={decor}>
      {decor.background && (
        // 앱 배경 사진 (글씨가 잘 읽히게 위에 크림색을 반투명하게 덮음)
        <div className="app-bg" aria-hidden="true" style={{ backgroundImage: `url("${decor.background.url}")` }} />
      )}
      <div className={decor.background ? 'app has-bg' : 'app'} style={themeVars}>
        {screen}
      </div>
    </DecorContext.Provider>
  )
}
