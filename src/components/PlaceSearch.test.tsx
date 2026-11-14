import { render } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

// 진짜 구글 대신: 검색창이 몇 번 새로 만들어졌는지 세는 가짜
let created = 0
class FakeAutocomplete extends HTMLElement {
  constructor() {
    super()
    created++
  }
}
customElements.define('fake-autocomplete', FakeAutocomplete)

// 진짜 useMapsLibrary처럼 항상 같은 라이브러리 객체를 돌려줌
const placesLib = { PlaceAutocompleteElement: FakeAutocomplete }
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: unknown }) => children,
  useMapsLibrary: () => placesLib,
}))

const { PlaceSearch } = await import('./PlaceSearch')

describe('PlaceSearch', () => {
  test('화면이 다시 그려져도(상대가 하트를 누르는 등) 같은 위치면 검색창을 새로 만들지 않음 → 입력 중인 글자 유지', () => {
    created = 0
    const onPick = () => {}
    const { rerender } = render(<PlaceSearch apiKey="K" onPick={onPick} near={{ lat: 35.7, lng: 139.8 }} />)
    rerender(<PlaceSearch apiKey="K" onPick={() => {}} near={{ lat: 35.7, lng: 139.8 }} />)
    expect(created).toBe(1)
  })

  test('기준 위치가 실제로 바뀌면 새로 만듦', () => {
    created = 0
    const { rerender } = render(<PlaceSearch apiKey="K" onPick={() => {}} near={{ lat: 35.7, lng: 139.8 }} />)
    rerender(<PlaceSearch apiKey="K" onPick={() => {}} near={{ lat: 34.6, lng: 135.5 }} />)
    expect(created).toBe(2)
  })
})
