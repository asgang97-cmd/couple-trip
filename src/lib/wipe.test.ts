import { describe, expect, test } from 'vitest'
import { memoryStorage } from '../test-utils'
import { wipeOnSignOut } from './wipe'

function fakeCaches(names: string[]) {
  const left = new Set(names)
  return {
    left,
    delete: async (n: string) => left.delete(n),
  }
}

describe('wipeOnSignOut', () => {
  test('일정 저장본·사진 주소·바우처 파일·커버 사진을 지운다', async () => {
    const storage = memoryStorage({
      'snapshot:v1': '{}',
      'signed-urls:v1': '{}',
      'decor-urls:v1': '{}',
    })
    const caches = fakeCaches(['vouchers-v1', 'cover-photo'])
    await wipeOnSignOut({ storage, caches })
    expect(storage.getItem('snapshot:v1')).toBeNull()
    expect(storage.getItem('signed-urls:v1')).toBeNull()
    expect(storage.getItem('decor-urls:v1')).toBeNull()
    expect(caches.left.size).toBe(0)
  })

  test('비짓재팬 정보·누구인지·아직 안 올린 가계부는 남긴다', async () => {
    const storage = memoryStorage({
      'vjw:v1': '{"passport":"x"}',
      member: 'a',
      'expense-queue:v1': '[]',
      'snapshot:v1': '{}',
    })
    await wipeOnSignOut({ storage, caches: fakeCaches([]) })
    expect(storage.getItem('vjw:v1')).toBe('{"passport":"x"}')
    expect(storage.getItem('member')).toBe('a')
    expect(storage.getItem('expense-queue:v1')).toBe('[]')
  })

  test('저장소가 막혀도 멈추지 않는다', async () => {
    const storage = memoryStorage()
    storage.removeItem = () => { throw new Error('blocked') }
    const caches = { delete: async () => { throw new Error('blocked') } }
    await expect(wipeOnSignOut({ storage, caches })).resolves.toBeUndefined()
  })

  test('Cache Storage가 없는 브라우저에서도 동작', async () => {
    const storage = memoryStorage({ 'snapshot:v1': '{}' })
    await wipeOnSignOut({ storage, caches: null })
    expect(storage.getItem('snapshot:v1')).toBeNull()
  })
})
