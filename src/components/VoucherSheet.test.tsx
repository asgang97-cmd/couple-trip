import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Voucher } from '../lib/types'
import type { Prepared } from '../lib/voucherFile'
import { makeItem, TRIP } from '../test-fixtures'
import { VoucherSheet } from './VoucherSheet'

const DAYS = ['2027-01-10', '2027-01-11', '2027-01-12']
const flight = makeItem({ id: 'f', day: '2027-01-10', time: '10:30', booking_code: 'KE703', place_name: '나리타 공항 도착' })
const hotel = makeItem({ id: 'h', day: '2027-01-11', place_name: '아사쿠사 호텔' })
const pdfFile = new File(['%PDF'], 'KE703 e-ticket.pdf', { type: 'application/pdf' })
const pngFile = new File(['png'], 'qr.png', { type: 'image/png' })
const prepared = (text: string, kind: 'pdf' | 'image' = 'pdf'): Prepared => ({ kind, main: new Blob(['m']), pages: [], text })

function setupNew(file: File, text = '', over: Record<string, unknown> = {}) {
  const onSave = vi.fn(async () => {})
  const prepare = vi.fn(async () => prepared(text, file.name.endsWith('.pdf') ? 'pdf' : 'image'))
  render(<VoucherSheet mode={{ kind: 'new', file }} trip={TRIP} items={[flight, hotel]} days={DAYS} onClose={() => {}} onSave={onSave} prepare={prepare} {...over} />)
  return { onSave, prepare }
}

describe('VoucherSheet 올리기', () => {
  test('PDF에서 예약번호를 찾으면 그 일정·날짜를 미리 골라 둠', async () => {
    const { onSave } = setupNew(pdfFile, 'Booking KE703 10 Jan 2027')
    expect(await screen.findByText(/예약번호 KE703/)).toBeInTheDocument()
    expect(screen.getByLabelText('일정')).toHaveValue('f')
    expect(screen.getByLabelText('날짜')).toHaveValue('2027-01-10')
    expect(screen.getByLabelText('이름')).toHaveValue('KE703 e-ticket')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'KE703 e-ticket', itemId: 'f', day: '2027-01-10' }))
  })

  test('예약번호가 없고 날짜만 있으면 날짜만', async () => {
    setupNew(pdfFile, 'Stay 2027.1.11')
    expect(await screen.findByText(/1월 11일/)).toBeInTheDocument()
    expect(screen.getByLabelText('일정')).toHaveValue('')
    expect(screen.getByLabelText('날짜')).toHaveValue('2027-01-11')
  })

  test('사진은 직접 고르라고 안내', async () => {
    setupNew(pngFile)
    expect(await screen.findByText('사진은 글자를 못 읽어요. 일정이나 날짜를 골라 주세요')).toBeInTheDocument()
  })

  test('일정을 고르면 날짜도 그 일정 날로', async () => {
    setupNew(pngFile)
    await screen.findByLabelText('일정')
    await userEvent.selectOptions(screen.getByLabelText('일정'), 'h')
    expect(screen.getByLabelText('날짜')).toHaveValue('2027-01-11')
  })

  test('일정 카드에서 올리면 그 일정이 먼저 (PDF 추천보다 우선)', async () => {
    setupNew(pdfFile, 'KE703', { presetItemId: 'h' })
    await screen.findByLabelText('일정')
    expect(screen.getByLabelText('일정')).toHaveValue('h')
    expect(screen.getByLabelText('날짜')).toHaveValue('2027-01-11')
  })

  test('올릴 수 없는 파일은 이유를 알려주고 저장 없음', async () => {
    setupNew(new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(await screen.findByText('사진(JPG, PNG)이나 PDF만 올릴 수 있어요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull()
  })

  test('파일을 못 읽으면 알려줌', async () => {
    setupNew(pdfFile, '', { prepare: vi.fn(async () => { throw new Error('bad pdf') }) })
    expect(await screen.findByText('이 파일을 열 수 없어요. 다른 파일로 해 주세요')).toBeInTheDocument()
  })

  test('저장 실패해도 창과 입력 유지', async () => {
    setupNew(pngFile, '', { onSave: vi.fn(async () => { throw new Error('x') }) })
    const name = await screen.findByLabelText('이름')
    await userEvent.clear(name)
    await userEvent.type(name, '디즈니 QR')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByLabelText('이름')).toHaveValue('디즈니 QR')
  })
})

describe('VoucherSheet 수정', () => {
  const v: Voucher = { id: 'v1', trip_id: TRIP.id, item_id: 'f', day: '2027-01-10', title: '항공권', kind: 'pdf', path: 'p', pages: [], size: 1, created_at: 'x' }

  test('이름·일정·날짜 바꾸기', async () => {
    const onSave = vi.fn(async () => {})
    render(<VoucherSheet mode={{ kind: 'edit', voucher: v }} trip={TRIP} items={[flight, hotel]} days={DAYS} onClose={() => {}} onSave={onSave} onDelete={vi.fn()} />)
    await userEvent.selectOptions(screen.getByLabelText('일정'), '')
    await userEvent.selectOptions(screen.getByLabelText('날짜'), '')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: '항공권', itemId: null, day: null }))
  })

  test('지우기는 한 번 물어봄', async () => {
    const onDelete = vi.fn(async () => {})
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    render(<VoucherSheet mode={{ kind: 'edit', voucher: v }} trip={TRIP} items={[flight]} days={DAYS} onClose={() => {}} onSave={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: '지우기' }))
    expect(onDelete).toHaveBeenCalled()
  })
})
