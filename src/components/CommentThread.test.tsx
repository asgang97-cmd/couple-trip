import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import type { Comment } from '../lib/types'
import { theme } from '../theme'
import { CommentThread } from './CommentThread'

const c = (id: string, member: 'a' | 'b', body: string, created_at: string): Comment => ({ id, item_id: 'i', member, body, created_at })

const noop = { onEdit: async () => {}, onDelete: async () => {} }

describe('CommentThread 수정·삭제', () => {
  const comments = [c('mine', 'a', '내 글', '2026-11-14T01:00:00Z'), c('yours', 'b', '네 글', '2026-11-14T02:00:00Z')]

  test('내 댓글에만 수정·삭제 버튼', () => {
    render(<CommentThread comments={comments} member="a" disabled={false} onAdd={async () => {}} {...noop} />)
    expect(screen.getAllByRole('button', { name: '댓글 수정' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: '댓글 삭제' })).toHaveLength(1)
    expect(screen.getAllByRole('listitem')[0]).toContainElement(screen.getByRole('button', { name: '댓글 수정' }))
  })

  test('수정: 원래 글이 채워지고, 바꿔서 저장하면 onEdit(id, 새 글)', async () => {
    const onEdit = vi.fn(async () => {})
    render(<CommentThread comments={comments} member="a" disabled={false} onAdd={async () => {}} {...noop} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: '댓글 수정' }))
    const box = screen.getByLabelText('댓글 수정 내용')
    expect(box).toHaveValue('내 글')
    await userEvent.clear(box)
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
    await userEvent.type(box, ' 고친 글 ')
    await userEvent.click(screen.getByRole('button', { name: '저장' }))
    expect(onEdit).toHaveBeenCalledWith('mine', '고친 글')
    expect(screen.queryByLabelText('댓글 수정 내용')).toBeNull()
  })

  test('수정 취소하면 원래대로', async () => {
    const onEdit = vi.fn(async () => {})
    render(<CommentThread comments={comments} member="a" disabled={false} onAdd={async () => {}} {...noop} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: '댓글 수정' }))
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.getByText('내 글')).toBeInTheDocument()
    expect(onEdit).not.toHaveBeenCalled()
  })

  test('삭제: 확인하면 onDelete, 취소하면 안 함', async () => {
    const onDelete = vi.fn(async () => {})
    render(<CommentThread comments={comments} member="a" disabled={false} onAdd={async () => {}} {...noop} onDelete={onDelete} />)
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    await userEvent.click(screen.getByRole('button', { name: '댓글 삭제' }))
    expect(onDelete).not.toHaveBeenCalled()
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    await userEvent.click(screen.getByRole('button', { name: '댓글 삭제' }))
    expect(onDelete).toHaveBeenCalledWith('mine')
  })

  test('오프라인이면 수정·삭제 버튼 없음', () => {
    render(<CommentThread comments={comments} member="a" disabled onAdd={async () => {}} {...noop} />)
    expect(screen.queryByRole('button', { name: '댓글 수정' })).toBeNull()
    expect(screen.queryByRole('button', { name: '댓글 삭제' })).toBeNull()
  })
})

describe('CommentThread', () => {
  test('오래된 순 + 작성자 이모지', () => {
    render(
      <CommentThread
        comments={[c('2', 'b', '좋아!', '2026-11-14T02:00:00Z'), c('1', 'a', '여기 어때', '2026-11-14T01:00:00Z')]}
        member="a" disabled={false} onAdd={async () => {}} {...noop} />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(`${theme.emoji.a}여기 어때`)
    expect(items[1]).toHaveTextContent(`${theme.emoji.b}좋아!`)
  })

  test('공백만이면 전송 안 됨', async () => {
    const onAdd = vi.fn(async () => {})
    render(<CommentThread comments={[]} member="a" disabled={false} onAdd={onAdd} {...noop} />)
    await userEvent.type(screen.getByLabelText('댓글'), '   ')
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled()
  })

  test('전송하면 앞뒤 공백 정리해서 보내고 입력창 비움', async () => {
    const onAdd = vi.fn(async () => {})
    render(<CommentThread comments={[]} member="a" disabled={false} onAdd={onAdd} {...noop} />)
    await userEvent.type(screen.getByLabelText('댓글'), ' 가자 {Enter}')
    expect(onAdd).toHaveBeenCalledWith('가자')
    expect(screen.getByLabelText('댓글')).toHaveValue('')
  })

  test('500자 넘게 못 씀', () => {
    render(<CommentThread comments={[]} member="a" disabled={false} onAdd={async () => {}} {...noop} />)
    expect(screen.getByLabelText('댓글')).toHaveAttribute('maxLength', '500')
  })

  test('오프라인이면 입력 막힘', () => {
    render(<CommentThread comments={[]} member="a" disabled onAdd={async () => {}} {...noop} />)
    expect(screen.getByLabelText('댓글')).toBeDisabled()
  })
})
