/** 비율을 유지하며 긴 변이 max를 넘지 않게 */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** 폰 사진(수 MB)을 긴 변 1600px JPEG로 줄인다. 사진 회전 정보(EXIF)는 브라우저가 반영. */
export async function resizeImage(file: File, max = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진 변환 실패'))), 'image/jpeg', quality),
  )
}
