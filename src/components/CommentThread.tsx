import { useState, type FormEvent } from 'react'
import type { Comment, Member } from '../lib/types'
import { theme } from '../theme'

interface Props {
  comments: Comment[]
  member: Member
  disabled: boolean
  onAdd: (body: string) => Promise<void>
}

export function CommentThread({ comments, member, disabled, onAdd }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const body = text.trim()
  const sorted = [...comments].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!body || busy || disabled) return
    setBusy(true)
    try {
      await onAdd(body)
      setText('')
    } catch {
      // 실패하면 쓴 글을 남겨둠 (알림은 부모가 띄움)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="comments">
      {sorted.length > 0 && (
        <ul>
          {sorted.map((c) => (
            <li key={c.id} className={c.member === member ? 'mine' : ''}>
              <span className="who">{theme.emoji[c.member]}</span>
              <span>{c.body}</span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="row">
        <input
          aria-label="댓글"
          placeholder={disabled ? '오프라인이에요' : '한마디 남기기'}
          maxLength={500}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" disabled={!body || busy || disabled}>보내기</button>
      </form>
    </div>
  )
}
