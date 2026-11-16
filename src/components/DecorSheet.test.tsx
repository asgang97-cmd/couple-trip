import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { DecorContext } from './DecorContext'
import { DecorSheet } from './DecorSheet'

function setup(over: Partial<Parameters<typeof DecorSheet>[0]> = {}, urls = {}) {
  const props = { member: 'a' as const, disabled: false, onPick: vi.fn(async () => {}), onRemove: vi.fn(async () => {}), onClose: vi.fn(), ...over }
  render(
    <DecorContext.Provider value={urls}>
      <DecorSheet {...props} />
    </DecorContext.Provider>,
  )
  return props
}

describe('DecorSheet', () => {
  test('안내 문구에는 상대방 이름 (밍석이 열면 밍하, 밍하가 열면 밍석)', () => {
    const { unmount } = render(
      <DecorContext.Provider value={{}}>
        <DecorSheet member="a" disabled={false} onPick={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />
      </DecorContext.Provider>,
    )
    expect(screen.getByText(/밍하 폰에도/)).toBeInTheDocument()
    unmount()
    render(
      <DecorContext.Provider value={{}}>
        <DecorSheet member="b" disabled={false} onPick={vi.fn()} onRemove={vi.fn()} onClose={vi.fn()} />
      </DecorContext.Provider>,
    )
    expect(screen.getByText(/밍석 폰에도/)).toBeInTheDocument()
  })
  test('자리 6곳, 넣은 건 미리보기, 안 넣은 건 "비어 있음"', () => {
    setup({}, { coverA: { url: 'https://s/a.png', round: false } })
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByRole('img', { name: '커버 캐릭터 1' })).toHaveAttribute('src', 'https://s/a.png')
    expect(screen.getAllByText('비어 있음')).toHaveLength(5)
  })

  test('사진 고르면 그 자리에 올림', async () => {
    const { onPick } = setup()
    const file = new File(['x'], 'bg.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('앱 배경 사진 고르기'), file)
    expect(onPick).toHaveBeenCalledWith('background', file)
  })

  test('빼기는 한 번 물어봄, 넣은 자리에만 있음', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    const { onRemove } = setup({}, { gate: { url: 'https://s/g.png', round: false } })
    expect(screen.queryByRole('button', { name: '커버 캐릭터 1 빼기' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: '비밀번호 화면 캐릭터 빼기' }))
    expect(onRemove).toHaveBeenCalledWith('gate')
  })

  test('오프라인이면 고르기·빼기 막힘', () => {
    setup({ disabled: true }, { gate: { url: 'https://s/g.png', round: false } })
    expect(screen.getByLabelText('앱 배경 사진 고르기')).toBeDisabled()
    expect(screen.getByRole('button', { name: '비밀번호 화면 캐릭터 빼기' })).toBeDisabled()
  })
})
