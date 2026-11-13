import { describe, expect, test } from 'vitest'
import { fitWithin } from './image'

describe('fitWithin', () => {
  test('가로 사진 축소', () => expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 }))
  test('세로 사진 축소', () => expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 }))
  test('이미 작으면 그대로', () => expect(fitWithin(1000, 800, 1600)).toEqual({ width: 1000, height: 800 }))
  test('정수로 반올림', () => expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 }))
})
