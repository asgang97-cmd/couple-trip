import { describe, expect, test } from 'vitest'
import { makeItem, TRIP } from '../test-fixtures'
import { memoryStorage } from '../test-utils'
import { clearVjw, emptyPerson, FIELD_GROUPS, flightCandidates, hotelCandidates, loadVjw, maskPassport, saveVjw } from './vjw'

describe('vjw 저장', () => {
  test('기본값: 국적·방문 목적·체류 기간·도착 날짜를 여행에서 채움', () => {
    const p = emptyPerson(TRIP)
    expect(p.nationality).toBe('대한민국 (KOR)')
    expect(p.purpose).toBe('관광')
    expect(p.stayDays).toBe('5')
    expect(p.arrivalDate).toBe('2027-01-10')
    expect(p.passportNo).toBe('')
  })

  test('저장 → 읽기 동일', () => {
    const s = memoryStorage()
    const data = loadVjw(TRIP, s)
    data.a.passportNo = 'M12345678'
    data.b.surname = 'KIM'
    expect(saveVjw(data, s)).toBe(true)
    const again = loadVjw(TRIP, s)
    expect(again.a.passportNo).toBe('M12345678')
    expect(again.b.surname).toBe('KIM')
  })

  test('없거나 깨진 값이면 기본값', () => {
    expect(loadVjw(TRIP, memoryStorage()).a).toEqual(emptyPerson(TRIP))
    expect(loadVjw(TRIP, memoryStorage({ 'vjw:v1': '{broken' })).b).toEqual(emptyPerson(TRIP))
  })

  test('예전 저장본에 없는 칸은 기본값으로 채움', () => {
    const s = memoryStorage({ 'vjw:v1': JSON.stringify({ a: { surname: 'LEE' } }) })
    const d = loadVjw(TRIP, s)
    expect(d.a.surname).toBe('LEE')
    expect(d.a.purpose).toBe('관광')
  })

  test('저장소가 막히면 false (앱은 안 멈춤)', () => {
    const s = memoryStorage()
    s.setItem = () => { throw new Error('blocked') }
    expect(saveVjw(loadVjw(TRIP, s), s)).toBe(false)
  })

  test('지우기', () => {
    const s = memoryStorage({ 'vjw:v1': '{}', other: 'x' })
    clearVjw(s)
    expect(s.getItem('vjw:v1')).toBeNull()
    expect(s.getItem('other')).toBe('x')
  })

  test('여권·입국·주소 세 묶음, 칸 순서 고정', () => {
    expect(FIELD_GROUPS.map((g) => g.fields.map((f) => f.key))).toEqual([
      ['passportNo', 'surname', 'givenName', 'nationality', 'birthDate', 'sex', 'passportExpiry'],
      ['purpose', 'stayDays', 'flightNo', 'arrivalDate', 'arrivalAirport'],
      ['hotelName', 'postalCode', 'address', 'phone'],
    ])
  })
})

describe('maskPassport', () => {
  test('앞 4자만 보이고 나머지 가림', () => expect(maskPassport('M12345678')).toBe('M123*****'))
  test('짧으면 그대로', () => expect(maskPassport('AB')).toBe('AB'))
})

describe('일정에서 가져오기 후보', () => {
  const items = [
    makeItem({ booking_code: 'KE703', place_name: '나리타 공항 도착' }),
    makeItem({ booking_code: 'KE703', place_name: '나리타 공항 도착' }),
    makeItem({ booking_code: '', place_name: '숙소 체크인' }),
  ]
  test('항공편: 예약번호 있는 것, 중복 없이', () => expect(flightCandidates(items)).toEqual(['KE703']))
  test('숙소: 장소 이름, 중복 없이', () => expect(hotelCandidates(items)).toEqual(['나리타 공항 도착', '숙소 체크인']))
})
