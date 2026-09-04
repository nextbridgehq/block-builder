#!/usr/bin/env node
/**
 * Fails if any tracked source file has drifted back to CRLF, a UTF-8 BOM, or
 * mojibake.
 *
 * All three have regressed in this repo more than once -- there is already a
 * commit titled "fix encoding corruption", and the BOMs returned in a later
 * release. A one-off cleanup does not hold; a check that runs in CI does.
 *
 * The mojibake patterns are the specific sequences produced when a UTF-8 file
 * is read as cp1252 and written back as UTF-8 -- e.g. `─` (U+2500) becomes
 * `â”€` or `â"€`.
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const MOJIBAKE = [
  { pattern: '\u00e2\u201d\u20ac', meant: '─' },
  { pattern: '\u00e2\u0022\u20ac', meant: '─' },
  { pattern: '\u00e2\u20ac\u201d', meant: '—' },
  { pattern: '\u00e2\u20ac\u0022', meant: '—' },
  { pattern: '\u00e2\u20ac\u201c', meant: '–' },
  { pattern: '\u00e2\u20ac\u2122', meant: '’' },
]

const CHECKED = /\.(ts|tsx|css|json|md|yml|yaml)$/

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  } catch {
    console.error('Not a git repository — skipping encoding check.')
    process.exit(0)
  }
}

const problems = []

for (const file of trackedFiles()) {
  if (!CHECKED.test(file)) continue

  let raw
  try {
    raw = readFileSync(file)
  } catch {
    continue // deleted but still indexed
  }

  if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    problems.push(`${file}: starts with a UTF-8 BOM`)
  }

  const text = raw.toString('utf8')

  if (text.includes('\r\n')) {
    problems.push(`${file}: contains CRLF line endings`)
  }

  for (const { pattern, meant } of MOJIBAKE) {
    const count = text.split(pattern).length - 1
    if (count > 0) {
      problems.push(`${file}: ${count} mojibake sequence(s) — should be "${meant}"`)
    }
  }
}

if (problems.length > 0) {
  console.error('Encoding check failed:\n')
  for (const p of problems) console.error(`  ${p}`)
  console.error('\nFiles must be UTF-8 without BOM and use LF line endings.')
  console.error('See .gitattributes and .editorconfig.')
  process.exit(1)
}

console.log('Encoding check passed: no BOM, CRLF, or mojibake in tracked source files.')
