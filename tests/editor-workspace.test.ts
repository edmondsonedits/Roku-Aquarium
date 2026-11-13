import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const editor=readFileSync(new URL('../app/components/fish/FishEditor.tsx',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/draw/[code]/page.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/components/fish/FishEditor.module.css',import.meta.url),'utf8');
test('session details start collapsed without removing name, recovery or exceptional status',()=>{
 assert.match(page,/<details className="draw-session">/);
 assert.match(page,/aria-label="Fish name"/);
 assert.match(page,/Resume a saved draft/);
 assert.match(page,/className="draw-state-notice" role="status"/);
});
test('focus drawing keeps a reachable tools exit and draft submission',()=>{
 assert.match(editor,/hidden=\{focusMode\} className=\{styles.dock\}/);
 assert.match(editor,/focusMode \? "Show tools" : "Hide tools"/);
 assert.match(editor,/onClick=\{\(\) => void send\(\)\}/);
 assert.match(css,/\.editor \.dock\[hidden\]/);
});
test('secondary ink panel dismisses before drawing and when switching tools',()=>{
 assert.match(editor,/if \(toolSettings \|\| coloursOpen\) \{ setToolSettings\(false\); setColoursOpen\(false\); return; \}/);
 assert.match(editor,/function chooseTool\(value: Tool\) \{ setColoursOpen\(false\)/);
 assert.match(editor,/useDisclosureFocus\(coloursOpen/);
 assert.match(editor,/Drawing tips/);
 assert.match(editor,/Send locks drawing/);
});
