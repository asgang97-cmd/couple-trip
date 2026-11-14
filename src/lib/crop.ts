// 커버 사진 자르기 계산 (화면 없이 숫자만)
// View: zoom = 꽉 차는 크기 대비 배율(1~MAX_ZOOM), x·y = 사진 왼쪽 위가 틀 왼쪽 위에서 떨어진 위치(px, 0 이하)

export interface Size { width: number; height: number }
export interface View { zoom: number; x: number; y: number }

export const MAX_ZOOM = 4
export const CROP_ASPECT = 4 / 3
export const OUTPUT = { width: 1200, height: 900 }

/** 가장 작게 해도 틀이 사진으로 꽉 차는 배율 */
export function coverScale(img: Size, frame: Size): number {
  return Math.max(frame.width / img.width, frame.height / img.height)
}

const shown = (v: View, img: Size, frame: Size) => {
  const s = coverScale(img, frame) * v.zoom
  return { s, w: img.width * s, h: img.height * s }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** 사진 가장자리가 틀 안으로 들어오지 않게 위치를 묶음 */
export function clampOffset(v: View, img: Size, frame: Size): View {
  const { w, h } = shown(v, img, frame)
  return { zoom: v.zoom, x: clamp(v.x, frame.width - w, 0) || 0, y: clamp(v.y, frame.height - h, 0) || 0 }
}

/** 처음: 꽉 차게, 가운데 */
export function initialView(img: Size, frame: Size): View {
  const { w, h } = shown({ zoom: 1, x: 0, y: 0 }, img, frame)
  return { zoom: 1, x: (frame.width - w) / 2 || 0, y: (frame.height - h) / 2 || 0 }
}

/** focus(틀 기준 px) 아래의 지점을 그대로 두고 zoom 배율로 */
export function zoomAt(v: View, zoom: number, focus: { x: number; y: number }, img: Size, frame: Size): View {
  const z = clamp(zoom, 1, MAX_ZOOM)
  const k = z / v.zoom
  return clampOffset({ zoom: z, x: focus.x - (focus.x - v.x) * k, y: focus.y - (focus.y - v.y) * k }, img, frame)
}

/** 원본 사진에서 잘라낼 영역 (원본 px) */
export function cropRect(v: View, img: Size, frame: Size): { sx: number; sy: number; sw: number; sh: number } {
  const { s } = shown(v, img, frame)
  return { sx: -v.x / s || 0, sy: -v.y / s || 0, sw: frame.width / s, sh: frame.height / s }
}
