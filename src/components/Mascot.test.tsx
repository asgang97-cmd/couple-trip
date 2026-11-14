import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { DecorContext } from './DecorContext'
import { Mascot } from './Mascot'

describe('Mascot: 밍석이 넣은 캐릭터 사진', () => {
  test('넣은 사진이 있으면 그 사진', () => {
    const { container } = render(
      <DecorContext.Provider value={{ gate: { url: 'https://s/g.png', round: false } }}>
        <Mascot slot="gate" size={120} />
      </DecorContext.Provider>,
    )
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toBe('https://s/g.png')
    expect(img.className).not.toContain('round')
  })
  test('배경 있는 사진이면 동그랗게', () => {
    const { container } = render(
      <DecorContext.Provider value={{ day: { url: 'https://s/d.jpg', round: true } }}>
        <Mascot slot="day" size={40} />
      </DecorContext.Provider>,
    )
    expect(container.querySelector('img')!.className).toContain('round')
  })
  test('안 넣은 자리는 비워 둠 (그린 캐릭터 없음)', () => {
    const { container } = render(
      <DecorContext.Provider value={{}}>
        <Mascot slot="empty" />
      </DecorContext.Provider>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
