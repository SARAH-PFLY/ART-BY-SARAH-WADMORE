import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {rss,renderIndex,makePost} from './blog.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const fn=html.match(/function wallLayout\(count,columns\)\{[\s\S]*?\n\}/)[0],context={};runInNewContext(fn,context);
for(let count=1;count<=60;count++)for(const target of [2,3]){
 const columns=Math.min(count,target),tiles=context.wallLayout(count,columns);
 const occupied=new Set(),heights=Array(columns).fill(0);
 tiles.forEach(tile=>{for(let y=tile.row;y<tile.row+tile.span;y++){const key=tile.column+':'+y;assert.ok(!occupied.has(key));occupied.add(key)}heights[tile.column-1]=tile.row+tile.span-1});
 assert.equal(new Set(heights).size,1);assert.equal(occupied.size,columns*heights[0]);
}
assert.match(html,/rel="canonical"/);assert.match(html,/og:title/);assert.match(html,/id="share"/);assert.match(html,/That artwork is no longer/);assert.match(html,/The gallery could not load/);
const posts=[makePost({title:'Paint & paper',category:'Studio'},'Notes & process',1,'2026-11-16T00:00:00Z')];
assert.match(rss(posts),/Paint &amp; paper/);assert.match(rss(posts),/isPermaLink="true"/);assert.match(renderIndex(posts),/application\/rss\+xml/);
console.log('Passed gap-free layouts for 1–60 artworks at two/three columns, sharing/error/SEO hooks and RSS escaping');
