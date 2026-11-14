// 올릴 바우처 파일 준비: 사진은 JPEG로 줄이고, PDF는 글자(일정 추천용)와 페이지 그림(오프라인 보기용)을 만든다.

export const MAX_BYTES = 10 * 1024 * 1024
const MAX_PAGES = 10 // 페이지 그림은 앞 10쪽까지 (오프라인 보기용)
const IMAGE_MAX = 2000 // 사진 긴 변 (QR이 선명하게)
const PAGE_WIDTH = 1600 // PDF 페이지 그림 너비

export type VoucherKind = 'image' | 'pdf'

export function kindOf(file: File): VoucherKind | null {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) return 'image'
  return null
}

export function titleOf(name: string): string {
  const t = name.replace(/\.[^.]+$/, '').trim()
  return t || '바우처'
}

/** 올릴 수 없는 파일이면 이유, 괜찮으면 null */
export function checkFile(file: File): string | null {
  if (!kindOf(file)) return '사진(JPG, PNG)이나 PDF만 올릴 수 있어요'
  if (file.size > MAX_BYTES) return '10MB보다 큰 파일은 올릴 수 없어요'
  return null
}

export interface Prepared {
  kind: VoucherKind
  main: Blob // 원본(PDF) 또는 줄인 사진(JPEG)
  pages: Blob[] // PDF 페이지 그림 (사진이면 빈 배열)
  text: string // PDF 글자 (사진이면 '')
}

/** 그림 파일로 만들고 캔버스 메모리는 바로 돌려줌 (오래된 아이폰 메모리 한도) */
function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => {
      canvas.width = 0
      canvas.height = 0
      if (b) resolve(b)
      else reject(new Error('그림 변환 실패'))
    }, 'image/jpeg', quality),
  )
}

/** 사진 → 긴 변 2000px JPEG (<img>로 열어서 아이폰 HEIC·회전도 브라우저가 처리) */
async function prepareImage(file: File): Promise<Prepared> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, IMAGE_MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff' // 투명 PNG(QR 등)는 흰 바탕으로
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { kind: 'image', main: await canvasToJpeg(canvas, 0.9), pages: [], text: '' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** PDF → 글자 + 앞 5쪽 그림. pdf.js는 이때만 불러옴(앱 첫 화면을 무겁게 하지 않게) */
async function preparePdf(file: File): Promise<Prepared> {
  // iOS 17.4 미만 아이폰에도 있는 기능으로 채워 넣기 (pdf.js가 씀)
  const P = Promise as unknown as { withResolvers?: () => unknown }
  if (!P.withResolvers) {
    P.withResolvers = () => {
      let resolve!: (v: unknown) => void
      let reject!: (e: unknown) => void
      const promise = new Promise((res, rej) => { resolve = res; reject = rej })
      return { promise, resolve, reject }
    }
  }
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  try {
    const texts: string[] = []
    const pages: Blob[] = []
    for (let n = 1; n <= Math.min(doc.numPages, 10); n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      texts.push(content.items.map((i) => ('str' in i ? i.str : '')).join(' '))
      if (n <= MAX_PAGES) {
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: PAGE_WIDTH / base.width })
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(viewport.width)
        canvas.height = Math.round(viewport.height)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await page.render({ canvasContext: ctx, viewport }).promise
        pages.push(await canvasToJpeg(canvas, 0.85))
      }
      page.cleanup()
    }
    return { kind: 'pdf', main: file, pages, text: texts.join('\n') }
  } finally {
    void doc.destroy()
  }
}

export async function prepareUpload(file: File): Promise<Prepared> {
  return kindOf(file) === 'pdf' ? preparePdf(file) : prepareImage(file)
}
