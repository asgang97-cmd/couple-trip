import { describe, expect, test } from 'vitest'
import { makeItem } from '../test-fixtures'
import { dayLocations, pastDate, roundLoc, weatherIcon, weatherSpeech, weatherText, weatherWord } from './weather'

describe('아이콘·읽는 글', () => {
  test('날씨 코드 → 아이콘', () => {
    const icons = [0, 1, 2, 3, 45, 48, 53, 81, 63, 73, 86, 95, 999].map(weatherIcon)
    expect(icons).toEqual(['☀️', '🌤', '⛅', '☁️', '🌫', '🌫', '🌦', '🌦', '🌧', '🌨', '🌨', '⛈', '☁️'])
  })
  test('날씨 코드 → 읽는 글', () => {
    const words = [0, 1, 2, 3, 45, 53, 63, 73, 95].map(weatherWord)
    expect(words).toEqual(['맑음', '구름 조금', '구름 조금', '흐림', '안개', '소나기', '비', '눈', '뇌우'])
  })
})

describe('roundLoc', () => {
  test('소수점 1자리 (약 10km)', () => {
    expect(roundLoc({ lat: 34.6937, lng: 135.5023 })).toEqual({ lat: 34.7, lng: 135.5 })
  })
})

describe('pastDate (예보 밖 날짜에 쓸 과거 날짜)', () => {
  test('1년 전 같은 날', () => {
    expect(pastDate('2027-01-12', '2026-11-17')).toEqual({ date: '2026-01-12', past: '작년' })
  })
  test('1년 전이 아직 기록 없을 만큼 최근이면 2년 전 (재작년)', () => {
    expect(pastDate('2027-11-20', '2026-11-17')).toEqual({ date: '2025-11-20', past: '재작년' })
    expect(pastDate('2027-11-09', '2026-11-17')).toEqual({ date: '2026-11-09', past: '작년' }) // 오늘−8일 = 11-09
    expect(pastDate('2027-11-12', '2026-11-17')).toEqual({ date: '2025-11-12', past: '재작년' }) // 최근 기록은 아직 빈칸일 수 있음
  })
  test('2년 전도 아직 안 지난 아주 먼 날짜면 null (미래 날짜를 묻지 않음)', () => {
    expect(pastDate('2029-01-01', '2026-11-17')).toBeNull()
  })
  test('이미 지난 날(기록이 채워진 날)은 그날 실제 날씨 (작년 아님)', () => {
    expect(pastDate('2026-11-05', '2026-11-17')).toEqual({ date: '2026-11-05', past: null })
    expect(pastDate('2026-11-09', '2026-11-17')).toEqual({ date: '2026-11-09', past: null }) // 오늘−8일
  })
  test('2/29는 2/28', () => {
    expect(pastDate('2028-02-29', '2027-06-01')).toEqual({ date: '2027-02-28', past: '작년' })
  })
})

describe('dayLocations (그날 날씨 위치)', () => {
  const days = ['2027-01-12', '2027-01-13', '2027-01-14']
  test('그날 처음 나오는 장소 있는 일정, 없으면 여행지 위치, 둘 다 없으면 빠짐', () => {
    const byDay = {
      '2027-01-12': [makeItem({ place_name: '메모만' }), makeItem({ lat: 34.6937, lng: 135.5023 }), makeItem({ lat: 35.0, lng: 135.7 })],
      '2027-01-13': [makeItem({ place_name: '장소 없음' })],
      '2027-01-14': [],
    }
    expect(dayLocations(days, byDay, { lat: 34.98, lng: 135.76 })).toEqual({
      '2027-01-12': { lat: 34.7, lng: 135.5 },
      '2027-01-13': { lat: 35.0, lng: 135.8 },
      '2027-01-14': { lat: 35.0, lng: 135.8 },
    })
    expect(dayLocations(days, byDay, null)).toEqual({ '2027-01-12': { lat: 34.7, lng: 135.5 } })
  })
})

describe('탭 글', () => {
  const sunny = { code: 0, max: 12.4, min: 3.6, rain: 20, past: null }
  test('예보: 아이콘 최저°/최고°, 비 40% 이상이면 ☔', () => {
    expect(weatherText(sunny)).toBe('☀️ 4°/12°')
    expect(weatherText({ ...sunny, code: 63, rain: 70 })).toBe('🌧 4°/12° ☔70%')
    expect(weatherText({ ...sunny, rain: 40 })).toBe('☀️ 4°/12° ☔40%')
    expect(weatherText({ ...sunny, rain: null })).toBe('☀️ 4°/12°')
  })
  test('과거: 작년/재작년 표시, 비 확률 없음', () => {
    expect(weatherText({ code: 2, max: 11, min: 3, rain: null, past: '작년' })).toBe('작년 ⛅ 3°/11°')
    expect(weatherText({ code: 2, max: 11, min: 3, rain: 90, past: '재작년' })).toBe('재작년 ⛅ 3°/11°')
  })
  test('읽는 글', () => {
    expect(weatherSpeech(sunny)).toBe('맑음 4도/12도')
    expect(weatherSpeech({ code: 1, max: 11, min: 3, rain: null, past: '작년' })).toBe('작년 이맘때 구름 조금 3도/11도')
    expect(weatherSpeech({ ...sunny, rain: 70 })).toBe('맑음 4도/12도, 비 올 확률 70%')
  })
})
