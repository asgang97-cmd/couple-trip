import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { makeItem, TRIP } from '../test-fixtures'
import { TripSettings } from './TripSettings'

function setup(over: Partial<Parameters<typeof TripSettings>[0]> = {}) {
  const onSave = vi.fn(async () => {})
  render(<TripSettings trip={TRIP} items={[]} onSave={onSave} onClose={() => {}} {...over} />)
  return { onSave, save: () => screen.getByRole('button', { name: '저장' }) }
}
// 날짜 칸은 userEvent.type이 불안정해서 값을 바로 바꿈
const setDate = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('TripSettings', () => {
  test('처음엔 지금 여행 정보로 채워짐', () => {
    setup()
    expect(screen.getByLabelText('여행 이름')).toHaveValue(TRIP.title)
    expect(screen.getByLabelText('여행지')).toHaveValue(TRIP.destination)
    expect(screen.getByLabelText('시작일')).toHaveValue('2027-01-10')
    expect(screen.getByLabelText('마지막 날')).toHaveValue('2027-01-14')
    expect(screen.getByText('5일 여행')).toBeInTheDocument()
  })

  test('바꾸고 저장하면 네 칸을 넘김 (앞뒤 공백 제거)', async () => {
    const { onSave, save } = setup()
    await userEvent.clear(screen.getByLabelText('여행 이름'))
    await userEvent.type(screen.getByLabelText('여행 이름'), ' 오사카 먹방 ')
    await userEvent.clear(screen.getByLabelText('여행지'))
    await userEvent.type(screen.getByLabelText('여행지'), '오사카 ')
    setDate('시작일', '2027-02-01')
    setDate('마지막 날', '2027-02-03')
    await userEvent.click(save())
    expect(onSave).toHaveBeenCalledWith({ title: '오사카 먹방', destination: '오사카', start_date: '2027-02-01', end_date: '2027-02-03' })
  })

  test('마지막 날이 시작일보다 빠르면 안내하고 저장 막음', () => {
    const { save } = setup()
    setDate('마지막 날', '2027-01-09')
    expect(screen.getByText('마지막 날은 시작일과 같거나 뒤여야 해요')).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  test('당일치기(같은 날)도 저장 가능', () => {
    const { save } = setup()
    setDate('마지막 날', '2027-01-10')
    expect(screen.getByText('1일 여행')).toBeInTheDocument()
    expect(save()).toBeEnabled()
  })

  test('날짜가 비었거나 이름이 공백뿐이면 저장 막음', async () => {
    const { save } = setup()
    setDate('시작일', '')
    expect(save()).toBeDisabled()
    setDate('시작일', '2027-01-10')
    expect(save()).toBeEnabled()
    await userEvent.clear(screen.getByLabelText('여행 이름'))
    await userEvent.type(screen.getByLabelText('여행 이름'), '   ')
    expect(save()).toBeDisabled()
  })

  test('기간을 줄이면 숨겨질 일정 개수를 미리 알려줌', () => {
    setup({ items: [makeItem({ day: '2027-01-14' }), makeItem({ day: '2027-01-14' }), makeItem({ day: '2027-01-11' })] })
    expect(screen.queryByText(/숨겨져요/)).toBeNull()
    setDate('마지막 날', '2027-01-13')
    expect(screen.getByText('기간 밖 일정 2개가 숨겨져요 (지워지진 않아요)')).toBeInTheDocument()
  })

  test('저장이 실패해도 입력값 유지, 다시 저장 가능', async () => {
    const onSave = vi.fn(async () => {
      throw new Error('fail')
    })
    const { save } = setup({ onSave })
    await userEvent.clear(screen.getByLabelText('여행 이름'))
    await userEvent.type(screen.getByLabelText('여행 이름'), '새 이름')
    await userEvent.click(save())
    expect(screen.getByLabelText('여행 이름')).toHaveValue('새 이름')
    expect(save()).toBeEnabled()
  })
})
