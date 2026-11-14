import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { clampOffset, CROP_ASPECT, cropRect, initialView, MAX_ZOOM, OUTPUT, pinch, zoomAt, type Size, type View } from '../lib/crop'

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
  try {
    await img.decode()
  } catch (e) {
    URL.revokeObjectURL(src)
    throw e
  }
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
  const [renderFailed, setRenderFailed] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null) // 이미 읽은 사진(<img>)을 그대로 붙일 자리 (큰 사진을 두 번 읽지 않게)
  // 손가락 이벤트가 화면 그리기보다 자주 와도 최신 위치에서 이어서 계산하도록
  const live = useRef<{ fw: number; v: View } | null>(null)
  const elementRef = useRef<HTMLImageElement | null>(null) // 읽어 둔 <img> (화면에 그대로 붙임)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  const fw = frameWidth ?? measured
  const frame: Size = { width: fw, height: fw / CROP_ASPECT }

  // 사진 읽기
  useEffect(() => {
    let alive = true
    loadImage(file).then(
      (l) => {
        if (alive) {
          elementRef.current = l.source instanceof HTMLImageElement ? l.source : null
          setImg(l)
        }
        else if (l.src.startsWith('blob:')) URL.revokeObjectURL(l.src)
      },
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
  const latest = () => (live.current && live.current.fw === fw ? live.current.v : current)
  const setView = (v: View) => {
    live.current = { fw, v }
    setSaved({ fw, v })
  }

  function update(next: (v: View) => View) {
    const cur = latest()
    if (!img || !cur) return
    setView(clampOffset(next(cur), img, frame))
  }

  function zoomTo(z: number, focus = { x: frame.width / 2, y: frame.height / 2 }) {
    const cur = latest()
    if (!img || !cur) return
    setView(zoomAt(cur, z, focus, img, frame))
  }

  // 끌기·두 손가락
  function local(e: PointerEvent) {
    const r = frameRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button > 0) return // 마우스 오른쪽 버튼 등은 무시
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
      // 확대와 두 손가락 이동을 함께
      const [other] = [...map.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p)
      const cur = latest()
      if (cur) setView(pinch(cur, prev, other, now, other, img, frame))
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
    } else if (e.key === '+' || e.key === '=') {
      zoomTo((latest()?.zoom ?? 1) + 0.25)
    } else if (e.key === '-') {
      zoomTo((latest()?.zoom ?? 1) - 0.25)
    }
  }

  async function save() {
    if (!img || !current || busy) return
    setBusy(true)
    setRenderFailed(false)
    let photo: Blob
    try {
      photo = await renderCrop(img.source, cropRect(current, img, frame))
    } catch {
      setRenderFailed(true) // 폰 메모리가 모자라는 등
      setBusy(false)
      return
    }
    try {
      await onDone(photo)
    } catch {
      // 올리기 실패는 부르는 쪽에서 알림. 창은 그대로 두고 다시 시도할 수 있게
    } finally {
      setBusy(false)
    }
  }

  const s = img && current && fw > 0 ? Math.max(frame.width / img.width, frame.height / img.height) * current.zoom : 0
  const imgStyle = img && current && s > 0
    ? { width: `${img.width * s}px`, height: `${img.height * s}px`, transform: `translate(${current.x}px, ${current.y}px)` }
    : null
  const hasElement = img?.source instanceof HTMLImageElement

  // 읽어 둔 <img>를 그대로 틀에 붙이고, 위치·크기를 매번 맞춤
  useLayoutEffect(() => {
    const host = hostRef.current
    const element = elementRef.current
    if (!element || !host) return
    element.className = 'crop-img'
    element.alt = ''
    element.draggable = false
    if (element.parentNode !== host) host.appendChild(element)
    if (imgStyle) Object.assign(element.style, imgStyle)
  })

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
                <div ref={hostRef} className="crop-host" />
                {img && !hasElement && imgStyle && (
                  <img className="crop-img" src={img.src} alt="" draggable={false} width={img.width} height={img.height} style={imgStyle} />
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
                  aria-valuetext={`${Math.round(current.zoom * 100)}%`}
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={current.zoom}
                  onChange={(e) => zoomTo(Number(e.target.value))}
                />
              </label>
            )}
            {renderFailed && <p className="error">사진을 만들지 못했어요. 조금 작게 확대하거나 다른 사진으로 해 주세요</p>}
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
