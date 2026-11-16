import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {rss,renderIndex,makePost} from './blog.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const fn=html.match(/function wallLayout\(count,columns\)\{[\s\S]*?\n\}/)[0],context={};runInNewContext(fn,context);
for(let count=1;count<=60;count++)for(const columns of [2,3]){
 const tiles=context.wallLayout(count,columns);
 tiles.forEach((tile,index)=>{assert.equal(tile.column,index%columns+1);assert.equal(tile.row,Math.floor(index/columns)+1);assert.equal(tile.span,1)});
}
assert.match(html,/grid-auto-rows:auto;align-items:start/);
assert.match(html,/\.tile img,\.tile video\{width:100%;height:auto;/);
assert.match(html,/rel="canonical"/);assert.match(html,/og:title/);assert.match(html,/id="share"/);assert.match(html,/That artwork is no longer/);assert.match(html,/The gallery could not load/);
const posts=[makePost({title:'Paint & paper',category:'Studio'},'Notes & process',1,'2026-11-16T00:00:00Z')];
assert.match(rss(posts),/Paint &amp; paper/);assert.match(rss(posts),/isPermaLink="true"/);assert.match(renderIndex(posts),/application\/rss\+xml/);
console.log('Passed chronological top-aligned rows for 1–60 artworks at two/three columns, sharing/error/SEO hooks and RSS escaping');
