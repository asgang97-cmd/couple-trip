import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'

const signIn = vi.fn()
vi.mock('../lib/session', () => ({ signIn: (pw: string) => signIn(pw) }))

const { PasswordGate } = await import('./PasswordGate')

describe('PasswordGate', () => {
  test('빈 값이면 제출 버튼 비활성', () => {
    render(<PasswordGate onSuccess={() => {}} />)
    expect(screen.getByRole('button', { name: '들어가기' })).toBeDisabled()
  })

  test('틀린 비밀번호면 에러 표시하고 onSuccess 안 부름', async () => {
    signIn.mockResolvedValueOnce({ ok: false, message: '비밀번호가 달라요 🥲' })
    const onSuccess = vi.fn()
    render(<PasswordGate onSuccess={onSuccess} />)
    await userEvent.type(screen.getByLabelText('비밀번호'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: '들어가기' }))
    expect(await screen.findByText('비밀번호가 달라요 🥲')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  test('맞으면 onSuccess 호출', async () => {
    signIn.mockResolvedValueOnce({ ok: true })
    const onSuccess = vi.fn()
    render(<PasswordGate onSuccess={onSuccess} />)
    await userEvent.type(screen.getByLabelText('비밀번호'), 'right{Enter}')
    expect(signIn).toHaveBeenCalledWith('right')
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
