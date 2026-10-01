/**
 * Static INSERT ... VALUES arity checker.
 *
 * Postgres only reports a row/column count mismatch at run time:
 *   ERROR: 42601  VALUES lists must all be the same length
 * That is how supabase/seed/demo_data.sql shipped with 7 product rows missing
 * unit_id. This parses the SQL offline so the mistake is caught before it ever
 * reaches the Supabase SQL editor.
 *
 * INSERT ... SELECT is skipped: any VALUES inside it belongs to a derived
 * table, not to the statement's own row list.
 *
 *   node scripts/check-insert-arity.mjs [file]
 *   import { checkInsertArity } from './check-insert-arity.mjs'
 */
import { pathToFileURL } from 'node:url';

/** Split a comma-separated list, ignoring commas inside quotes or parens. */
function splitTopLevel(text) {
  const out = [];
  let cur = '';
  let inQuote = false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") inQuote = !inQuote;
    if (!inQuote) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        out.push(cur);
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Balanced ( ... ) groups from `from`, stopping at top-level `;` or ON CONFLICT. */
function balancedGroups(text, from) {
  const groups = [];
  let depth = 0;
  let start = -1;
  let inQuote = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (!inQuote && ch === '-' && text[i + 1] === '-') {
      while (i < text.length && text[i] !== '\n') i++; // skip line comment
      continue;
    }
    if (ch === "'") inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === ';' && depth === 0) break;
    if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0 && start >= 0) {
        groups.push(text.slice(start, i));
        start = -1;
      }
    }
    if (depth === 0 && start < 0 && /^ON\s+CONFLICT/i.test(text.slice(i, i + 12))) break;
  }
  return groups;
}

/** Index just past the next top-level `;`, or the end of the text. */
function statementEnd(text, from) {
  let inQuote = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") inQuote = !inQuote;
    if (inQuote) continue;
    if (ch === '-' && text[i + 1] === '-') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === ';') return i;
  }
  return text.length;
}

/**
 * @returns {{table:string, columns:number, rows:{row:number, values:number}[]}[]}
 *   one entry per INSERT whose row arity disagrees with its column list.
 */
export function checkInsertArity(sql) {
  const problems = [];
  const stmtRe = /INSERT\s+INTO\s+([A-Za-z_][\w$]*)\s*\(/gi;
  let m;
  while ((m = stmtRe.exec(sql)) !== null) {
    const table = m[1];
    const openIdx = m.index + m[0].length - 1;
    const colList = balancedGroups(sql, openIdx)[0];
    if (colList === undefined) continue;
    const columns = splitTopLevel(colList).length;
    const afterCols = openIdx + colList.length + 2;

    const restAll = sql.slice(afterCols, statementEnd(sql, afterCols));
    const peek = restAll.replace(/^\s*(--[^\n]*\n\s*)*/, '').trimStart();
    if (/^SELECT\b/i.test(peek) || /^WITH\b/i.test(peek)) continue;

    const vIdx = restAll.search(/\bVALUES\b/i);
    if (vIdx < 0) continue;
    const vLen = restAll.slice(vIdx).match(/\bVALUES\b/i)[0].length;
    const rows = balancedGroups(sql, afterCols + vIdx + vLen);
    if (rows.length === 0) continue;

    const bad = rows
      .map((r, i) => ({ row: i + 1, values: splitTopLevel(r).length }))
      .filter((r) => r.values !== columns);
    if (bad.length) problems.push({ table, columns, rows: bad });
  }
  return problems;
}

// ---- CLI -----------------------------------------------------------------
// pathToFileURL is required: on Windows a manual "file://" + path yields
// file://C:/... while import.meta.url is file:///C:/..., so the naive
// comparison never matches and the CLI silently does nothing.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const { readFileSync } = await import('node:fs');
  const file = process.argv[2] ?? 'supabase/seed/demo_data.sql';
  // Strip a UTF-8 BOM, which PowerShell's Set-Content adds and which would
  // stop the first INSERT from matching.
  const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const problems = checkInsertArity(raw);
  for (const p of problems) {
    console.log(`\nFAIL ${p.table}  (column list has ${p.columns})`);
    for (const r of p.rows) {
      const delta = p.columns - r.values;
      console.log(
        `   row ${r.row}: ${r.values} values -> ${delta > 0 ? `short by ${delta}` : `${-delta} too many`}`,
      );
    }
  }
  console.log(
    problems.length === 0
      ? `\nPASS: ${file} - all VALUES rows match their column list`
      : `\nFAIL: ${problems.length} statement(s) with mismatched rows`,
  );
  process.exit(problems.length === 0 ? 0 : 1);
}
