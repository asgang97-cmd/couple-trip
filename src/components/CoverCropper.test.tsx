import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { cropRect, initialView, zoomAt } from '../lib/crop'
import { CoverCropper } from './CoverCropper'

const IMG = { width: 4000, height: 2000 }
const FRAME = { width: 320, height: 240 }
const file = new File(['x'], 'us.jpg', { type: 'image/jpeg' })

function setup(over: Partial<Parameters<typeof CoverCropper>[0]> = {}) {
  const props = {
    file,
    onCancel: vi.fn(),
    onDone: vi.fn(async () => {}),
    frameWidth: FRAME.width,
    loadImage: vi.fn(async () => ({ ...IMG, src: 'blob:x', source: {} as CanvasImageSource })),
    renderCrop: vi.fn(async () => new Blob(['jpg'])),
    ...over,
  }
  render(<CoverCropper {...props} />)
  return props
}

describe('CoverCropper', () => {
  test('사진을 읽으면 틀과 크기 막대가 보임', async () => {
    setup()
    expect(await screen.findByRole('slider', { name: '크기' })).toHaveValue('1')
    expect(screen.getByText('끌어서 위치를, 두 손가락이나 막대로 크기를 맞춰요')).toBeInTheDocument()
  })

  test('그대로 저장하면 가운데를 꽉 차게 잘라서 넘김', async () => {
    const { renderCrop, onDone } = setup()
    await screen.findByRole('slider', { name: '크기' })
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(renderCrop).toHaveBeenCalledWith(expect.anything(), cropRect(initialView(IMG, FRAME), IMG, FRAME))
    expect(onDone).toHaveBeenCalled()
  })

  test('막대로 2배 확대하면 틀 가운데 기준으로 확대해서 자름', async () => {
    const { renderCrop } = setup()
    const slider = await screen.findByRole('slider', { name: '크기' })
    fireEvent.change(slider, { target: { value: '2' } })
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    const expected = zoomAt(initialView(IMG, FRAME), 2, { x: 160, y: 120 }, IMG, FRAME)
    expect(renderCrop).toHaveBeenCalledWith(expect.anything(), cropRect(expected, IMG, FRAME))
  })

  test('키보드 오른쪽 화살표 → 보는 곳이 오른쪽으로', async () => {
    const { renderCrop } = setup()
    await screen.findByRole('slider', { name: '크기' })
    const frame = screen.getByRole('group', { name: '자를 영역' })
    frame.focus()
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    const start = initialView(IMG, FRAME)
    const rect = (renderCrop as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as ReturnType<typeof cropRect>
    expect(rect.sx).toBeGreaterThan(cropRect(start, IMG, FRAME).sx)
  })

  test('저장을 두 번 눌러도 한 번만', async () => {
    let finish: () => void = () => {}
    const onDone = vi.fn(() => new Promise<void>((r) => { finish = r }))
    setup({ onDone })
    await screen.findByRole('slider', { name: '크기' })
    const save = screen.getByRole('button', { name: '저장' })
    await userEvent.click(save)
    await userEvent.click(save)
    expect(onDone).toHaveBeenCalledTimes(1)
    finish()
  })

  test('취소', async () => {
    const { onCancel, onDone } = setup()
    await screen.findByRole('slider', { name: '크기' })
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  test('사진을 못 읽으면 안내하고 저장은 막음', async () => {
    setup({ loadImage: vi.fn(async () => { throw new Error('heic') }) })
    expect(await screen.findByText('이 사진은 열 수 없어요. 다른 사진(JPG, PNG)으로 해 주세요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull()
  })
})
