import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { TRIP, makeItem } from '../test-fixtures'
import { ItemForm } from './ItemForm'

const DAY = '2027-01-11'
const DAYS = ['2027-01-10', '2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14']

function setup(over: Partial<Parameters<typeof ItemForm>[0]> = {}) {
  const onSave = vi.fn(async () => {})
  render(<ItemForm trip={TRIP} days={DAYS} day={DAY} member="b" nextSortOrder={3} onSave={onSave} onClose={() => {}} {...over} />)
  return { onSave, save: () => screen.getByRole('button', { name: '저장' }) }
}

describe('ItemForm', () => {
  test('장소명 비면 저장 버튼 비활성', async () => {
    const { save } = setup()
    expect(save()).toBeDisabled()
    await userEvent.type(screen.getByLabelText('장소'), '   ')
    expect(save()).toBeDisabled()
  })

  test('비용에 숫자 아닌 값이면 안내하고 저장 막음', async () => {
    const { save } = setup()
    await userEvent.type(screen.getByLabelText('장소'), '센소지')
    await userEvent.type(screen.getByLabelText('예상 비용'), '천엔')
    expect(screen.getByText('숫자만 입력해 주세요')).toBeInTheDocument()
    expect(save()).toBeDisabled()
  })

  test('새 항목 저장 시 ItemInput', async () => {
    const { onSave, save } = setup()
    await userEvent.type(screen.getByLabelText('장소'), ' 센소지 ')
    await userEvent.type(screen.getByLabelText('예상 비용'), '1,200')
    await userEvent.click(save())
    expect(onSave).toHaveBeenCalledWith({
      trip_id: TRIP.id,
      day: DAY,
      time: null,
      place_name: '센소지',
      memo: '',
      booking_code: '',
      booking_url: '',
      cost_amount: 1200,
      cost_currency: 'JPY',
      lat: null,
      lng: null,
      google_place_id: null,
      created_by: 'b',
      sort_order: 3,
    })
  })

  test('비용 빈칸은 null, 시간 입력은 HH:MM', async () => {
    const { onSave, save } = setup()
    await userEvent.type(screen.getByLabelText('장소'), '라멘')
    await userEvent.type(screen.getByLabelText('시간'), '12:30')
    await userEvent.click(save())
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ time: '12:30', cost_amount: null }))
  })

  test('수정 시 id·작성자·순서·위치 유지', async () => {
    const initial = makeItem({ id: 'keep', created_by: 'a', sort_order: 7, lat: 35.7, lng: 139.8, google_place_id: 'g1', place_name: '전' })
    const { onSave, save } = setup({ initial })
    const place = screen.getByLabelText('장소')
    await userEvent.clear(place)
    await userEvent.type(place, '후')
    await userEvent.click(save())
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'keep', created_by: 'a', sort_order: 7, lat: 35.7, lng: 139.8, google_place_id: 'g1', place_name: '후', day: initial.day }),
    )
  })

  describe('장소 검색', () => {
    // 진짜 구글 검색 대신, 누르면 정해진 장소를 고르는 가짜 버튼
    const fakeSearch = (pick: { name: string; lat: number; lng: number; placeId: string }) =>
      (onPick: (p: typeof pick) => void) => <button type="button" onClick={() => onPick(pick)}>가짜검색</button>
    const SENSOJI = { name: '센소지', lat: 35.71, lng: 139.79, placeId: 'abc' }

    test('장소명이 비어 있으면 검색한 이름으로 채우고 위치 저장', async () => {
      const { onSave, save } = setup({ renderPlaceSearch: fakeSearch(SENSOJI) })
      await userEvent.click(screen.getByRole('button', { name: '가짜검색' }))
      expect(screen.getByLabelText('장소')).toHaveValue('센소지')
      expect(screen.getByText('📍 지도에 표시돼요')).toBeInTheDocument()
      await userEvent.click(save())
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ place_name: '센소지', lat: 35.71, lng: 139.79, google_place_id: 'abc' }))
    })

    test('장소명을 이미 썼으면 그대로 두고 위치만', async () => {
      const { onSave, save } = setup({ renderPlaceSearch: fakeSearch(SENSOJI) })
      await userEvent.type(screen.getByLabelText('장소'), '아침 산책')
      await userEvent.click(screen.getByRole('button', { name: '가짜검색' }))
      await userEvent.click(save())
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ place_name: '아침 산책', lat: 35.71, google_place_id: 'abc' }))
    })

    test('위치 지우기 → 세 값 null', async () => {
      const initial = makeItem({ lat: 1, lng: 2, google_place_id: 'g' })
      const { onSave, save } = setup({ initial, renderPlaceSearch: fakeSearch(SENSOJI) })
      await userEvent.click(screen.getByRole('button', { name: '위치 지우기' }))
      expect(screen.queryByText('📍 지도에 표시돼요')).toBeNull()
      await userEvent.click(save())
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ lat: null, lng: null, google_place_id: null }))
    })
  })

  describe('날짜', () => {
    test('새 일정은 지금 보고 있는 날이 기본', () => {
      setup()
      expect(screen.getByLabelText('날짜')).toHaveValue(DAY)
    })

    test('여행 날짜들 중에서 고를 수 있음', () => {
      setup()
      const options = Array.from((screen.getByLabelText('날짜') as HTMLSelectElement).options).map((o) => o.value)
      expect(options).toEqual(DAYS)
    })

    test('수정할 때 다른 날로 옮기면 그 날짜로 저장 (하트·댓글은 그대로 유지됨)', async () => {
      const initial = makeItem({ id: 'keep', day: '2027-01-10' })
      const { onSave, save } = setup({ initial })
      expect(screen.getByLabelText('날짜')).toHaveValue('2027-01-10')
      await userEvent.selectOptions(screen.getByLabelText('날짜'), '2027-01-13')
      await userEvent.click(save())
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'keep', day: '2027-01-13' }))
    })
  })

  test('통화는 여행 통화와 KRW 두 가지', () => {
    setup()
    const options = Array.from((screen.getByLabelText('통화') as HTMLSelectElement).options).map((o) => o.value)
    expect(options).toEqual(['JPY', 'KRW'])
  })
})
