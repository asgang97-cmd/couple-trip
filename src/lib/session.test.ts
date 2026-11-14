import { describe, expect, test, vi } from 'vitest'
import { memoryStorage } from '../test-utils'

const signInWithPassword = vi.fn()
const getSession = vi.fn()
const onAuthStateChange = vi.fn()
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...a: unknown[]) => signInWithPassword(...a),
      getSession: () => getSession(),
      onAuthStateChange: (cb: unknown) => onAuthStateChange(cb),
    },
  },
}))

const { getMember, isSignedIn, onSignedOut, setMember, signIn } = await import('./session')

describe('member', () => {
  test('저장/읽기', () => {
    const storage = memoryStorage()
    setMember('b', storage)
    expect(getMember(storage)).toBe('b')
  })

  test('이상한 값은 null', () => {
    expect(getMember(memoryStorage({ member: 'x' }))).toBeNull()
  })

  test('저장소가 막혀도 null', () => {
    const s = memoryStorage()
    s.getItem = () => { throw new Error('blocked') }
    expect(getMember(s)).toBeNull()
  })
})

describe('signIn', () => {
  test('공유 이메일 + 입력한 비밀번호로 로그인', async () => {
    signInWithPassword.mockResolvedValueOnce({ data: {}, error: null })
    expect(await signIn('pw')).toEqual({ ok: true })
    expect(signInWithPassword).toHaveBeenCalledWith({ email: import.meta.env.VITE_SHARED_EMAIL, password: 'pw' })
  })

  test('틀리면 한국어 메시지', async () => {
    signInWithPassword.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } })
    expect(await signIn('nope')).toEqual({ ok: false, message: '비밀번호가 달라요 🥲' })
  })

  test('네트워크 오류는 다른 메시지', async () => {
    signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await signIn('pw')).toEqual({ ok: false, message: '인터넷 연결을 확인해 주세요' })
  })
})

describe('isSignedIn', () => {
  const TOKEN_KEY = 'sb-abc-auth-token'

  test('살아있는 세션이면 true', async () => {
    getSession.mockResolvedValueOnce({ data: { session: { access_token: 't' } } })
    expect(await isSignedIn(memoryStorage())).toBe(true)
  })

  test('세션이 만료됐는데 오프라인이라 못 갱신해도, 기기에 로그인 기록이 남아 있으면 true', async () => {
    // supabase는 갱신이 네트워크 때문에 실패하면 null을 주지만 저장본은 지우지 않는다
    getSession.mockResolvedValueOnce({ data: { session: null } })
    const storage = memoryStorage({ [TOKEN_KEY]: JSON.stringify({ refresh_token: 'r', expires_at: 1 }) })
    expect(await isSignedIn(storage)).toBe(true)
  })

  test('로그인 기록이 없으면 false', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } })
    expect(await isSignedIn(memoryStorage({ other: 'x' }))).toBe(false)
  })

  test('로그인 기록이 깨져 있으면 false', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } })
    expect(await isSignedIn(memoryStorage({ [TOKEN_KEY]: '{broken' }))).toBe(false)
  })
})

describe('onSignedOut', () => {
  test('진짜 로그아웃(비밀번호 변경 등)일 때만 알림', () => {
    const unsubscribe = vi.fn()
    onAuthStateChange.mockReturnValueOnce({ data: { subscription: { unsubscribe } } })
    const cb = vi.fn()
    const stop = onSignedOut(cb)
    const listener = onAuthStateChange.mock.calls.at(-1)![0] as (e: string) => void
    listener('TOKEN_REFRESHED')
    expect(cb).not.toHaveBeenCalled()
    listener('SIGNED_OUT')
    expect(cb).toHaveBeenCalledTimes(1)
    stop()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
