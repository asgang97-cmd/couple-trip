import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { clampOffset, CROP_ASPECT, cropRect, initialView, MAX_ZOOM, OUTPUT, zoomAt, type Size, type View } from '../lib/crop'

interface Loaded extends Size {
  src: string // 화면에 보여줄 주소
  source: CanvasImageSource // 잘라 그릴 원본
}
type Rect = ReturnType<typeof cropRect>

interface Props {
  file: File
  onCancel: () => void
  /** 잘린 사진(1200×900 JPEG). 실패하면 throw (알림은 부르는 쪽에서) */
  onDone: (photo: Blob) => Promise<void>
  /** 테스트용: 틀 너비(px) 고정 (없으면 화면에서 잼) */
  frameWidth?: number
  loadImage?: (file: File) => Promise<Loaded>
  renderCrop?: (source: CanvasImageSource, rect: Rect) => Promise<Blob>
}

/** 사진 읽기: <img>로 열면 아이폰 HEIC·사진 회전도 브라우저가 처리 */
async function loadWithImg(file: File): Promise<Loaded> {
  const src = URL.createObjectURL(file)
  const img = new Image()
  img.src = src
  await img.decode()
  return { width: img.naturalWidth, height: img.naturalHeight, src, source: img }
}

/** 틀 안을 1200×900 JPEG로 */
function renderWithCanvas(source: CanvasImageSource, r: Rect): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT.width
  canvas.height = OUTPUT.height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, r.sx, r.sy, r.sw, r.sh, 0, 0, OUTPUT.width, OUTPUT.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진 변환 실패'))), 'image/jpeg', 0.85),
  )
}

const STEP = 16 // 화살표 한 번에 움직이는 거리(px)

/** 커버 사진 자르기: 4:3 틀에서 끌기·두 손가락·막대로 위치와 크기 맞추기 */
export function CoverCropper({ file, onCancel, onDone, frameWidth, loadImage = loadWithImg, renderCrop = renderWithCanvas }: Props) {
  const [img, setImg] = useState<Loaded | null>(null)
  const [failed, setFailed] = useState(false)
  const [measured, setMeasured] = useState(0)
  // 위치는 그때의 틀 너비와 함께 저장 (화면 크기가 바뀌면 처음 위치로)
  const [saved, setSaved] = useState<{ fw: number; v: View } | null>(null)
  const [busy, setBusy] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  const fw = frameWidth ?? measured
  const frame: Size = { width: fw, height: fw / CROP_ASPECT }

  // 사진 읽기
  useEffect(() => {
    let alive = true
    loadImage(file).then(
      (l) => alive && setImg(l),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [file, loadImage])

  // 보여줄 주소 정리
  useEffect(() => () => {
    if (img?.src.startsWith('blob:')) URL.revokeObjectURL(img.src)
  }, [img])

  // 틀 너비 재기 (화면 크기가 바뀌어도)
  useEffect(() => {
    if (frameWidth || !frameRef.current) return
    const el = frameRef.current
    const ro = new ResizeObserver(() => setMeasured(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [frameWidth, img])

  // 틀 크기가 정해지면(또는 바뀌면) 처음 위치
  const ready = img !== null && fw > 0
  const current = ready ? (saved && saved.fw === fw ? saved.v : initialView(img, frame)) : null
  const setView = (v: View) => setSaved({ fw, v })

  function update(next: (v: View) => View) {
    if (!img || !current) return
    setView(clampOffset(next(current), img, frame))
  }

  function zoomTo(z: number, focus = { x: frame.width / 2, y: frame.height / 2 }) {
    if (!img || !current) return
    setView(zoomAt(current, z, focus, img, frame))
  }

  // 끌기·두 손가락
  function local(e: PointerEvent) {
    const r = frameRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, local(e))
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const map = pointers.current
    const prev = map.get(e.pointerId)
    if (!prev || !img || !current) return
    const now = local(e)
    if (map.size === 1) {
      update((v) => ({ ...v, x: v.x + now.x - prev.x, y: v.y + now.y - prev.y }))
    } else if (map.size === 2) {
      const [other] = [...map.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p)
      const before = Math.hypot(prev.x - other.x, prev.y - other.y)
      const after = Math.hypot(now.x - other.x, now.y - other.y)
      if (before > 0) zoomTo(current.zoom * (after / before), { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 })
    }
    map.set(e.pointerId, now)
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId)
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }
    if (moves[e.key]) {
      e.preventDefault()
      // 화살표 방향으로 "보는 곳"이 움직이도록 사진은 반대로
      const [dx, dy] = moves[e.key]
      update((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
    } else if ((e.key === '+' || e.key === '=') && current) {
      zoomTo(current.zoom + 0.25)
    } else if (e.key === '-' && current) {
      zoomTo(current.zoom - 0.25)
    }
  }

  async function save() {
    if (!img || !current || busy) return
    setBusy(true)
    try {
      await onDone(await renderCrop(img.source, cropRect(current, img, frame)))
    } catch {
      // 부르는 쪽에서 알림. 창은 그대로 두고 다시 시도할 수 있게
    } finally {
      setBusy(false)
    }
  }

  const s = img && current && fw > 0 ? Math.max(frame.width / img.width, frame.height / img.height) * current.zoom : 0

  return (
    <div className="sheet-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="sheet stack cropper" role="dialog" aria-label="사진 자르기" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>사진 자르기</h2>
        </div>

        {failed ? (
          <>
            <p className="error">이 사진은 열 수 없어요. 다른 사진(JPG, PNG)으로 해 주세요</p>
            <button type="button" className="ghost" onClick={onCancel}>닫기</button>
          </>
        ) : (
          <>
            <p className="note">끌어서 위치를, 두 손가락이나 막대로 크기를 맞춰요</p>
            <div className="crop-stage">
              <div
                ref={frameRef}
                className="crop-frame"
                role="group"
                aria-label="자를 영역"
                tabIndex={0}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
              >
                {img && current && s > 0 && (
                  <img
                    className="crop-img"
                    src={img.src}
                    alt=""
                    draggable={false}
                    width={img.width}
                    height={img.height}
                    style={{ width: img.width * s, height: img.height * s, transform: `translate(${current.x}px, ${current.y}px)` }}
                  />
                )}
                <div className="crop-mask" aria-hidden="true" />
                {!img && <p className="crop-loading">사진 여는 중…</p>}
              </div>
            </div>
            {current && (
              <label className="crop-zoom">
                <span>크기</span>
                <input
                  type="range"
                  aria-label="크기"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={current.zoom}
                  onChange={(e) => zoomTo(Number(e.target.value))}
                />
              </label>
            )}
            <div className="row crop-actions">
              <button type="button" className="ghost" onClick={onCancel} disabled={busy}>취소</button>
              <button type="button" onClick={() => void save()} disabled={!current || busy} aria-busy={busy}>
                {busy ? '올리는 중…' : '저장'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
