import { useState, type FormEvent } from 'react'
import type { Comment, Member } from '../lib/types'
import { theme } from '../theme'

interface Props {
  comments: Comment[]
  member: Member
  disabled: boolean
  onAdd: (body: string) => Promise<void>
  onEdit: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function CommentThread({ comments, member, disabled, onAdd, onEdit, onDelete }: Props) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const body = text.trim()
  const sorted = [...comments].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))

  async function run(task: () => Promise<void>, after: () => void) {
    setBusy(true)
    try {
      await task()
      after()
    } catch {
      // 실패하면 쓴 글을 남겨둠 (알림은 부모가 띄움)
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!body || busy || disabled) return
    void run(() => onAdd(body), () => setText(''))
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    const next = editing?.text.trim()
    if (!editing || !next || busy) return
    void run(() => onEdit(editing.id, next), () => setEditing(null))
  }

  function remove(id: string) {
    if (!confirm('댓글을 지울까요?')) return
    void run(() => onDelete(id), () => {})
  }

  return (
    <div className="comments">
      {sorted.length > 0 && (
        <ul>
          {sorted.map((c) => {
            const mine = c.member === member
            if (editing?.id === c.id) {
              return (
                <li key={c.id} className="mine">
                  <form onSubmit={saveEdit} className="edit-row">
                    <input
                      aria-label="댓글 수정 내용"
                      maxLength={500}
                      value={editing.text}
                      autoFocus
                      onChange={(e) => setEditing({ id: c.id, text: e.target.value })}
                    />
                    <button type="submit" disabled={!editing.text.trim() || busy}>저장</button>
                    <button type="button" className="ghost" onClick={() => setEditing(null)}>취소</button>
                  </form>
                </li>
              )
            }
            return (
              <li key={c.id} className={mine ? 'mine' : ''}>
                <span className="who">{theme.emoji[c.member]}</span>
                <span className="bubble">{c.body}</span>
                {mine && !disabled && (
                  <span className="comment-tools">
                    <button type="button" className="mini" aria-label="댓글 수정" onClick={() => setEditing({ id: c.id, text: c.body })}>✏️</button>
                    <button type="button" className="mini" aria-label="댓글 삭제" disabled={busy} onClick={() => remove(c.id)}>🗑️</button>
                  </span>
                )}
              </li>
            )
          })}
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
