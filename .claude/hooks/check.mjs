// Claude Code 자동 검사 (.claude/settings.json 의 hooks 에서 부름)
//   node check.mjs pre  → 파일 고치기 전: 비밀 키 파일(.env.local 등)이면 막기
//   node check.mjs post → 파일 고친 뒤: .ts/.tsx 면 oxlint + 타입 검사, 문제 있으면 Claude에게 알려 고치게 함
import { spawnSync } from 'node:child_process'
import { basename, relative, resolve } from 'node:path'

const mode = process.argv[2]
const root = resolve(import.meta.dirname, '..', '..')

let input = ''
for await (const chunk of process.stdin) input += chunk
const file = JSON.parse(input || '{}')?.tool_input?.file_path ?? ''

if (mode === 'pre') {
  if (/^\.env(\..+)?$/.test(basename(file)) && basename(file) !== '.env.example') {
    console.error(`${basename(file)} 은 비밀 키 파일이라 Claude가 고치지 않아요. 바꿀 게 있으면 사용자에게 직접 고쳐 달라고 하세요.`)
    process.exit(2) // 2 = 막기
  }
  process.exit(0)
}

if (mode === 'post') {
  const rel = relative(root, resolve(file))
  if (!/\.(ts|tsx)$/.test(rel) || rel.startsWith('..') || rel.startsWith('node_modules')) process.exit(0)

  const run = (cmd) => spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8' })
  const problems = []
  const lint = run(`npx oxlint --deny-warnings "${rel}"`)
  if (lint.status !== 0) problems.push(`[oxlint ${rel}]\n${lint.stdout}${lint.stderr}`)
  const tsc = run('npx tsc -b')
  if (tsc.status !== 0) problems.push(`[타입 검사]\n${tsc.stdout}${tsc.stderr}`)

  if (problems.length) {
    console.error(problems.join('\n').slice(0, 4000))
    process.exit(2) // 2 = Claude에게 문제를 보여 줌 (파일은 이미 저장됨)
  }
  process.exit(0)
}
