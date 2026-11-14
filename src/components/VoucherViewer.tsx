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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null) // 원본 PDF (미리 읽어서 진짜 링크로: 아이폰에서도 열리게)
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

  useEffect(() => {
    if (voucher.kind !== 'pdf') return
    let alive = true
    let url: string | null = null
    read(voucher.path).then(
      (blob) => {
        url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        if (alive) setPdfUrl(url)
        else URL.revokeObjectURL(url)
      },
      () => {},
    )
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [voucher.id]) // eslint-disable-line react-hooks/exhaustive-deps -- 바우처가 바뀔 때만

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={voucher.title}>
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
        {voucher.kind === 'pdf' && pdfUrl && (
          <a className="viewer-original" href={pdfUrl} target="_blank" rel="noopener" download={`${voucher.title}.pdf`}>원본 PDF 열기</a>
        )}
      </div>
    </div>
  )
}
