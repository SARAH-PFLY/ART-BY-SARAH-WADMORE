'use strict';
document.querySelectorAll('.blog-menu').forEach(menu=>{
 document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false});
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus()}});
});
fetch('/blog/posts.json').then(response=>{if(!response.ok)throw Error('Blog unavailable');return response.json()}).then(posts=>{
 if(!Array.isArray(posts))return;
 document.querySelectorAll('[data-blog-links]').forEach(container=>{
 container.replaceChildren();posts.slice(0,5).forEach(post=>{
 if(!/^\/blog\/[a-z0-9-]+\/$/.test(post.url)||typeof post.title!=='string')return;
 const a=document.createElement('a');a.href=post.url;a.textContent=post.title;container.append(a)
 });const all=document.createElement('a');all.href='/blog/';all.textContent='View all posts →';container.append(all)
 })
}).catch(()=>{});