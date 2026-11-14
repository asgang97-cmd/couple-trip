import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { TRIP } from '../test-fixtures'
import { theme } from '../theme'
import { HomeHeader } from './HomeHeader'

const base = { trip: TRIP, now: new Date(2027, 0, 1), coverUrl: null, uploading: false, disabled: false, onPickPhoto: () => {}, onOpenSettings: () => {} }

describe('HomeHeader', () => {
  test('인사말·D-day·제목', () => {
    render(<HomeHeader {...base} now={new Date(2027, 0, 1)} />)
    expect(screen.getByText(theme.greeting)).toBeInTheDocument()
    expect(screen.getByText('D-9')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: TRIP.title })).toBeInTheDocument()
  })

  test('올린 사진이 있으면 그 사진, 없으면 기본 사진 경로를 배경으로', () => {
    const { rerender } = render(<HomeHeader {...base} coverUrl="https://x/signed.jpg" fallbackPhoto="/us.jpg" />)
    expect(screen.getByTestId('cover').style.backgroundImage).toContain('https://x/signed.jpg')
    rerender(<HomeHeader {...base} coverUrl={null} fallbackPhoto="/us.jpg" />)
    expect(screen.getByTestId('cover').style.backgroundImage).toContain('/us.jpg')
  })

  test('사진이 하나도 없으면 없는 파일을 요청하지 않고 그라데이션만', () => {
    render(<HomeHeader {...base} coverUrl={null} fallbackPhoto={null} />)
    const bg = screen.getByTestId('cover').style.backgroundImage
    expect(bg).not.toContain('url(')
    expect(bg).toContain('linear-gradient')
  })

  test('사진 고르면 onPickPhoto(file)', async () => {
    const onPickPhoto = vi.fn()
    render(<HomeHeader {...base} onPickPhoto={onPickPhoto} />)
    const file = new File(['x'], 'us.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('사진 바꾸기'), file)
    expect(onPickPhoto).toHaveBeenCalledWith(file)
  })

  test('올리는 중·오프라인이면 사진 바꾸기 막힘', () => {
    const { rerender } = render(<HomeHeader {...base} uploading />)
    expect(screen.getByText('올리는 중…')).toBeInTheDocument()
    expect(screen.getByLabelText('사진 바꾸기')).toBeDisabled()
    rerender(<HomeHeader {...base} disabled />)
    expect(screen.getByLabelText('사진 바꾸기')).toBeDisabled()
  })
})

describe('HomeHeader 여행 설정 버튼', () => {
  test('누르면 onOpenSettings', async () => {
    const onOpenSettings = vi.fn()
    render(<HomeHeader {...base} onOpenSettings={onOpenSettings} />)
    await userEvent.click(screen.getByRole('button', { name: '여행 설정' }))
    expect(onOpenSettings).toHaveBeenCalled()
  })

  test('오프라인이면 막힘', () => {
    render(<HomeHeader {...base} disabled />)
    expect(screen.getByRole('button', { name: '여행 설정' })).toBeDisabled()
  })
})
