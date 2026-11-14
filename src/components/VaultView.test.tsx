import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Voucher } from '../lib/types'
import { makeItem } from '../test-fixtures'
import { VaultView } from './VaultView'
import { VoucherViewer } from './VoucherViewer'

const DAYS = ['2027-01-10', '2027-01-11']
const item = makeItem({ id: 'f', day: '2027-01-10', place_name: '나리타 공항 도착' })
const V = (id: string, o: Partial<Voucher> = {}): Voucher => ({
  id, trip_id: 't', item_id: null, day: null, title: id, kind: 'image', path: `t/${id}.jpg`, pages: [], size: 1, created_at: id, ...o,
})

function setup(vouchers: Voucher[], over: Partial<Parameters<typeof VaultView>[0]> = {}) {
  const props = {
    vouchers, items: [item], days: DAYS, disabled: false, loadError: false,
    isSaved: (id: string) => id !== 'notyet',
    onPick: vi.fn(), onOpen: vi.fn(), onEdit: vi.fn(),
    ...over,
  }
  render(<VaultView {...props} />)
  return props
}

describe('VaultView', () => {
  test('날짜별로 모으고, 날짜 없는 건 맨 아래', () => {
    setup([V('호텔', { day: '2027-01-11' }), V('기타'), V('항공권', { day: '2027-01-10', item_id: 'f', kind: 'pdf', pages: ['a', 'b'] })])
    const heads = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(heads[0]).toContain('1일차')
    expect(heads[1]).toContain('2일차')
    expect(heads[2]).toBe('날짜 없음')
    expect(screen.getByText('나리타 공항 도착')).toBeInTheDocument()
    expect(screen.getByText('PDF 2쪽')).toBeInTheDocument()
  })

  test('폰에 저장됐는지 보여줌', () => {
    setup([V('done', { day: '2027-01-10' }), V('notyet', { day: '2027-01-10' })])
    expect(within(screen.getByRole('listitem', { name: 'done' })).getByText('폰에 저장됨')).toBeInTheDocument()
    expect(within(screen.getByRole('listitem', { name: 'notyet' })).getByText('아직 폰에 없음')).toBeInTheDocument()
  })

  test('누르면 열기, 수정 버튼은 수정', async () => {
    const v = V('qr', { day: '2027-01-10' })
    const { onOpen, onEdit } = setup([v])
    await userEvent.click(screen.getByRole('button', { name: 'qr 열기' }))
    expect(onOpen).toHaveBeenCalledWith(v)
    await userEvent.click(screen.getByRole('button', { name: 'qr 수정' }))
    expect(onEdit).toHaveBeenCalledWith(v)
  })

  test('파일 고르면 onPick, 오프라인이면 올리기·수정 막힘 (열기는 됨)', async () => {
    const { onPick } = setup([V('qr')])
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('바우처 올리기'), file)
    expect(onPick).toHaveBeenCalledWith(file)
  })

  test('오프라인', () => {
    setup([V('qr')], { disabled: true })
    expect(screen.getByLabelText('바우처 올리기')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'qr 수정' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'qr 열기' })).toBeEnabled()
  })

  test('비어 있으면 안내', () => {
    setup([])
    expect(screen.getByText('아직 모아 둔 바우처가 없어요')).toBeInTheDocument()
  })
})

describe('VoucherViewer', () => {
  test('사진은 그대로 크게', async () => {
    const read = vi.fn(async () => new Blob(['img'], { type: 'image/jpeg' }))
    render(<VoucherViewer voucher={V('qr')} read={read} onClose={() => {}} />)
    expect(await screen.findByRole('img', { name: 'qr' })).toBeInTheDocument()
    expect(read).toHaveBeenCalledWith('t/qr.jpg')
  })

  test('PDF는 페이지 그림들 + 원본 열기', async () => {
    const read = vi.fn(async () => new Blob(['img']))
    render(<VoucherViewer voucher={V('t', { kind: 'pdf', path: 't/t.pdf', pages: ['t/t-p1.jpg', 't/t-p2.jpg'] })} read={read} onClose={() => {}} />)
    expect(await screen.findAllByRole('img')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '원본 PDF 열기' })).toBeInTheDocument()
  })

  test('폰에 없고 인터넷도 안 되면 안내', async () => {
    render(<VoucherViewer voucher={V('qr')} read={vi.fn(async () => { throw new Error('offline') })} onClose={() => {}} />)
    expect(await screen.findByText('이 파일은 아직 폰에 없고, 지금 인터넷도 안 돼요')).toBeInTheDocument()
  })
})
