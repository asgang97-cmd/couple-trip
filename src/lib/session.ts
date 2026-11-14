import { supabase } from './supabase'
import type { Member } from './types'

const MEMBER_KEY = 'member'

export async function signIn(password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: import.meta.env.VITE_SHARED_EMAIL,
      password,
    })
    return error ? { ok: false, message: '비밀번호가 달라요 🥲' } : { ok: true }
  } catch {
    return { ok: false, message: '인터넷 연결을 확인해 주세요' }
  }
}

/**
 * 로그인돼 있나? 세션은 supabase-js가 기기에 저장해 둔다.
 * 로그인 정보는 1시간마다 인터넷으로 새로 받아야 하는데, 오프라인이면 못 받아서
 * getSession이 null을 준다. 이때 supabase는 저장본을 지우지 않는다(진짜 로그아웃일 때만 지움).
 * 그래서 저장본이 남아 있으면 로그인된 걸로 보고, 저장해 둔 일정을 보여준다.
 */
export async function isSignedIn(storage: Storage = globalThis.localStorage): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return data.session !== null || hasStoredSession(storage)
}

function hasStoredSession(storage: Storage): boolean {
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue
      const v = JSON.parse(storage.getItem(key) ?? 'null')
      if (typeof v?.refresh_token === 'string') return true
    }
  } catch {
    // 깨졌거나 저장소가 막혔으면 로그인 안 된 걸로
  }
  return false
}

/** 진짜 로그아웃(비밀번호 변경 등으로 로그인이 끊김)되면 cb. 반환값을 부르면 그만 듣기. */
export function onSignedOut(cb: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') cb()
  })
  return () => data.subscription.unsubscribe()
}

export function getMember(storage: Storage = globalThis.localStorage): Member | null {
  try {
    const v = storage.getItem(MEMBER_KEY)
    return v === 'a' || v === 'b' ? v : null
  } catch {
    return null
  }
}

export function setMember(m: Member, storage: Storage = globalThis.localStorage): void {
  try {
    storage.setItem(MEMBER_KEY, m)
  } catch {
    // 저장이 막힌 브라우저면 다음에 다시 물어봄
  }
}
