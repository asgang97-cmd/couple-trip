import { useEffect, useState } from 'react'
import type { Voucher } from '../lib/types'

interface Props {
  voucher: Voucher
  /** 파일 읽기 (폰 저장본 먼저) */
  read: (path: string) => Promise<Blob>
  onClose: () => void
}

/** 바우처 크게 보기: 흰 바탕에 화면 가득 (QR을 바로 보여주기 좋게) */
export function VoucherViewer({ voucher, read, onClose }: Props) {
  const [urls, setUrls] = useState<string[] | null>(null)
  const [failed, setFailed] = useState(false)
  const shown = voucher.kind === 'pdf' && voucher.pages.length > 0 ? voucher.pages : voucher.kind === 'image' ? [voucher.path] : []

  useEffect(() => {
    let alive = true
    let made: string[] = []
    Promise.all(shown.map((p) => read(p))).then(
      (blobs) => {
        made = blobs.map((b) => URL.createObjectURL(b))
        if (alive) setUrls(made)
        else made.forEach((u) => URL.revokeObjectURL(u))
      },
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
      made.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [voucher.id]) // eslint-disable-line react-hooks/exhaustive-deps -- 바우처가 바뀔 때만

  async function openOriginal() {
    try {
      const blob = await read(voucher.path)
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setFailed(true)
    }
  }

  return (
    <div className="viewer" role="dialog" aria-label={voucher.title}>
      <div className="viewer-head">
        <h2>{voucher.title}</h2>
        <button type="button" className="ghost" onClick={onClose}>닫기</button>
      </div>
      <div className="viewer-body">
        {failed && <p className="error">이 파일은 아직 폰에 없고, 지금 인터넷도 안 돼요</p>}
        {!failed && !urls && shown.length > 0 && <p className="note">여는 중…</p>}
        {urls?.map((u, i) => (
          <img key={u} src={u} alt={urls.length > 1 ? `${voucher.title} ${i + 1}쪽` : voucher.title} />
        ))}
        {voucher.kind === 'pdf' && (
          <button type="button" className="viewer-original" onClick={() => void openOriginal()}>원본 PDF 열기</button>
        )}
      </div>
    </div>
  )
}
