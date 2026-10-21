// Rewrites content/*.html in the exact form a browser serializes it (HTML fragment serialization).
// The in-browser editor saves a page by serializing the live DOM; when the files are already in this
// form, untouched parts come out byte-for-byte the same and a commit only contains the real edits.
//   node scripts/canonicalize.mjs          # rewrite
//   node scripts/canonicalize.mjs --check  # exit 1 if some file is not canonical yet
import fs from 'node:fs';
import path from 'node:path';
import { parseFragment, serialize } from 'parse5';
import { CONTENT } from './book.mjs';

export const canon = (raw) => {
  const out = serialize(parseFragment(raw.replace(/\r\n/g, '\n')));
  return out.endsWith('\n') ? out : out + '\n';
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const check = process.argv.includes('--check');
  let changed = 0;
  for (const f of fs.readdirSync(CONTENT).filter((n) => n.endsWith('.html'))) {
    const p = path.join(CONTENT, f);
    const raw = fs.readFileSync(p, 'utf8');
    const out = canon(raw);
    if (out !== raw.replace(/\r\n/g, '\n')) {
      changed++;
      if (!check) fs.writeFileSync(p, out);
    }
  }
  console.log(check ? `${changed} files not canonical` : `${changed} files rewritten`);
  if (check && changed) process.exit(1);
}
