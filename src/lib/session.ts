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

/** 세션은 supabase-js가 기기에 저장해 둔다. 오프라인이어도 저장된 세션이 있으면 true. */
export async function isSignedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return data.session !== null
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
