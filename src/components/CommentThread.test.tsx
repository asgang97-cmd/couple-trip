import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Comment } from '../lib/types'
import { theme } from '../theme'
import { CommentThread } from './CommentThread'

const c = (id: string, member: 'a' | 'b', body: string, created_at: string): Comment => ({ id, item_id: 'i', member, body, created_at })

describe('CommentThread', () => {
  test('오래된 순 + 작성자 이모지', () => {
    render(
      <CommentThread
        comments={[c('2', 'b', '좋아!', '2026-11-14T02:00:00Z'), c('1', 'a', '여기 어때', '2026-11-14T01:00:00Z')]}
        member="a" disabled={false} onAdd={async () => {}}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(`${theme.emoji.a}여기 어때`)
    expect(items[1]).toHaveTextContent(`${theme.emoji.b}좋아!`)
  })

  test('공백만이면 전송 안 됨', async () => {
    const onAdd = vi.fn(async () => {})
    render(<CommentThread comments={[]} member="a" disabled={false} onAdd={onAdd} />)
    await userEvent.type(screen.getByLabelText('댓글'), '   ')
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled()
  })

  test('전송하면 앞뒤 공백 정리해서 보내고 입력창 비움', async () => {
    const onAdd = vi.fn(async () => {})
    render(<CommentThread comments={[]} member="a" disabled={false} onAdd={onAdd} />)
    await userEvent.type(screen.getByLabelText('댓글'), ' 가자 {Enter}')
    expect(onAdd).toHaveBeenCalledWith('가자')
    expect(screen.getByLabelText('댓글')).toHaveValue('')
  })

  test('500자 넘게 못 씀', () => {
    render(<CommentThread comments={[]} member="a" disabled={false} onAdd={async () => {}} />)
    expect(screen.getByLabelText('댓글')).toHaveAttribute('maxLength', '500')
  })

  test('오프라인이면 입력 막힘', () => {
    render(<CommentThread comments={[]} member="a" disabled onAdd={async () => {}} />)
    expect(screen.getByLabelText('댓글')).toBeDisabled()
  })
})
