import { describe, expect, test, vi } from 'vitest'
import { memoryStorage } from '../test-utils'

const signInWithPassword = vi.fn()
vi.mock('./supabase', () => ({ supabase: { auth: { signInWithPassword: (...a: unknown[]) => signInWithPassword(...a) } } }))

const { getMember, setMember, signIn } = await import('./session')

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
