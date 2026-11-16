import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {rss,renderIndex,makePost} from './blog.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const fn=html.match(/function wallLayout\(heights,columns\)\{[\s\S]*?\n\}/)[0],context={};runInNewContext(fn,context);
for(let count=1;count<=60;count++)for(const columns of [2,3]){
 const heights=Array.from({length:count},(_,i)=>100+(i*37)%300),tiles=context.wallLayout(heights,columns),bottoms=Array(columns).fill(0);
 tiles.forEach((tile,index)=>{assert.equal(tile.top,bottoms[tile.column]);assert.equal(tile.top,Math.min(...bottoms));assert.equal(tile.height,heights[index]);bottoms[tile.column]+=tile.height});
}
const four=context.wallLayout([200,300,400,150],3);
assert.equal(four[3].column,0);assert.equal(four[3].top,200);
assert.match(html,/loadedmetadata',layoutWall/);
assert.match(html,/\.tile img,\.tile video\{width:100%;height:auto;/);
assert.match(html,/rel="canonical"/);assert.match(html,/og:title/);assert.match(html,/id="share"/);assert.match(html,/That artwork is no longer/);assert.match(html,/The gallery could not load/);
const posts=[makePost({title:'Paint & paper',category:'Studio'},'Notes & process',1,'2026-11-16T00:00:00Z')];
assert.match(rss(posts),/Paint &amp; paper/);assert.match(rss(posts),/isPermaLink="true"/);assert.match(renderIndex(posts),/application\/rss\+xml/);
console.log('Passed shortest-column natural masonry for 1–60 artworks at two/three columns, sharing/error/SEO hooks and RSS escaping');
