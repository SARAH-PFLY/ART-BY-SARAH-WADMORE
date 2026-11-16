const ORIGIN='https://sarahwadmore.com';
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parseBlog(text=''){
 const m=text.match(/^\/blog(?:@\w+)?(?:\s+([\s\S]+))?$/i);if(!m)return null;
 const [title='',category='Studio notes']=String(m[1]||'').split('|').map(s=>s.trim());
 if(!title||title.length>160||category.length>60)return {error:'Use /blog Article title | Category with a TXT or Markdown document.'};
 return {title,category:category||'Studio notes'};
}
export function slugify(title,id){return (title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75).replace(/-$/,'')||'article')+'-'+id}
export function plainText(text){return text.replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/[#*_~\x60>]/g,'').replace(/\s+/g,' ').trim()}
function inline(text){
 return escapeHTML(text).replace(/\[([^\]]+)\]\((https?:\/\/[^\s<]+)\)/g,(_,label,url)=>'<a href="'+url+'" rel="noopener noreferrer">'+label+'</a>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>');
}
export function markdown(text){
 const lines=text.replace(/\r\n?/g,'\n').split('\n'),out=[];let paragraph=[],list=[],quote=[],code=null;
 const flush=()=>{if(paragraph.length){out.push('<p>'+inline(paragraph.join(' '))+'</p>');paragraph=[]}if(list.length){out.push('<ul>'+list.map(s=>'<li>'+inline(s)+'</li>').join('')+'</ul>');list=[]}if(quote.length){out.push('<blockquote><p>'+inline(quote.join(' '))+'</p></blockquote>');quote=[]}};
 for(const line of lines){
 if(/^\x60{3}/.test(line)){flush();if(code!==null){out.push('<pre><code>'+escapeHTML(code.join('\n'))+'</code></pre>');code=null}else code=[];continue}
 if(code!==null){code.push(line);continue}
 if(!line.trim()){flush();continue}
 const heading=line.match(/^(#{1,6})\s+(.+)$/);
 if(heading){flush();const level=Math.min(4,heading[1].length+1);out.push('<h'+level+'>'+inline(heading[2])+'</h'+level+'>');continue}
 const bullet=line.match(/^\s*[-*+]\s+(.+)$/);if(bullet){if(paragraph.length||quote.length)flush();list.push(bullet[1]);continue}
 const quoted=line.match(/^>\s?(.*)$/);if(quoted){if(paragraph.length||list.length)flush();quote.push(quoted[1]);continue}
 if(list.length||quote.length)flush();paragraph.push(line.trim());
 }
 flush();if(code!==null)out.push('<pre><code>'+escapeHTML(code.join('\n'))+'</code></pre>');return out.join('\n');
}
export function makePost(details,text,id,date,cover=null){
 const plain=plainText(text),slug=slugify(details.title,id);
 return {...details,id:String(id),slug,url:'/blog/'+slug+'/',date,description:plain.length>157?plain.slice(0,157).replace(/\s+\S*$/,'')+'…':plain,minutes:Math.max(1,Math.ceil(plain.split(/\s+/).length/220)),cover};
}
function nav(posts){return '<nav aria-label="Main navigation"><a href="/">Artworks</a><details class="blog-menu"><summary>BLOG</summary><div data-blog-links>'+posts.slice(0,5).map(p=>'<a href="'+escapeHTML(p.url)+'">'+escapeHTML(p.title)+'</a>').join('')+'<a href="/blog/">View all posts →</a></div></details></nav>'}
export function shell({title,description,url,content,posts=[],post=null}){
 const structured=post?{'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,description:post.description,datePublished:post.date,dateModified:post.date,author:{'@type':'Person',name:'Sarah Wadmore',url:ORIGIN},mainEntityOfPage:ORIGIN+url,...(post.cover?{image:ORIGIN+'/'+post.cover}:{})}:null;
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHTML(title)+' | Sarah Wadmore</title><meta name="description" content="'+escapeHTML(description)+'"><link rel="canonical" href="'+ORIGIN+escapeHTML(url)+'"><meta property="og:type" content="'+(post?'article':'website')+'"><meta property="og:title" content="'+escapeHTML(title)+'"><meta property="og:description" content="'+escapeHTML(description)+'"><meta property="og:url" content="'+ORIGIN+escapeHTML(url)+'"><meta name="twitter:card" content="'+(post?.cover?'summary_large_image':'summary')+'">'+(post?.cover?'<meta property="og:image" content="'+ORIGIN+'/'+escapeHTML(post.cover)+'"><meta property="og:image:alt" content="'+escapeHTML(post.coverAlt||post.title)+'">':'')+(post?'<meta property="article:published_time" content="'+escapeHTML(post.date)+'">':'')+(structured?'<script type="application/ld+json">'+JSON.stringify(structured).replace(/</g,'\\u003c')+'</script>':'')+'<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate" type="application/rss+xml" title="Sarah Wadmore — Journal" href="/feed.xml"><link rel="stylesheet" href="/assets/blog.css"><script defer src="/assets/blog-nav.js"></script></head><body><a class="skip-link" href="#content">Skip to content</a><header><a class="brand" href="/"><small>ART BY</small>Sarah Wadmore</a>'+nav(posts)+'</header><main id="content">'+content+'</main><footer><a href="/">Explore the artwork wall ↗</a><a href="/feed.xml">RSS feed ↗</a><span>© Sarah Wadmore</span></footer></body></html>';
}
const dateLabel=date=>new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
export function renderArticle(post,text,posts){
 const content='<article><div class="article-head"><a class="eyebrow" href="/blog/">Journal / '+escapeHTML(post.category)+'</a><h1>'+escapeHTML(post.title)+'</h1><p class="standfirst">'+escapeHTML(post.description)+'</p><div class="byline">Sarah Wadmore <span>·</span> <time datetime="'+escapeHTML(post.date)+'">'+dateLabel(post.date)+'</time> <span>·</span> '+post.minutes+' min read</div></div>'+(post.cover?'<figure class="cover"><img src="/'+escapeHTML(post.cover)+'" alt="'+escapeHTML(post.coverAlt||post.title)+'"></figure>':'')+'<div class="prose">'+markdown(text)+'</div><div class="article-end"><p>Art by Sarah Wadmore</p><a href="/">Discover the artwork collection →</a><a href="/blog/">Back to the journal →</a></div></article>';
 return shell({title:post.title,description:post.description,url:post.url,content,posts,post});
}
export function renderIndex(posts){
 return shell({title:'Journal',description:'Studio notes, stories behind the artworks and updates from Sarah Wadmore.',url:'/blog/',posts,content:'<section class="journal-head"><p class="eyebrow">THE JOURNAL</p><h1>From the studio.</h1><p>Artworks, ideas and the stories behind them.</p></section><section class="post-grid" aria-label="Blog posts">'+(posts.length?posts.map(p=>'<a class="post-card" href="'+escapeHTML(p.url)+'">'+(p.cover?'<img loading="lazy" src="/'+escapeHTML(p.cover)+'" alt="'+escapeHTML(p.coverAlt||p.title)+'">':'<div class="text-cover" aria-hidden="true">SW<span>STUDIO JOURNAL</span></div>')+'<div class="card-copy"><p class="eyebrow">'+escapeHTML(p.category)+' · '+dateLabel(p.date)+'</p><h2>'+escapeHTML(p.title)+'</h2><p>'+escapeHTML(p.description)+'</p><span class="read">Read story ↗</span></div></a>').join(''):'<p class="empty">New stories will appear here soon.</p>')+'</section>'});
}
export function sitemap(posts){
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/blog/',...posts.map(p=>p.url)].map(url=>'<url><loc>'+ORIGIN+escapeHTML(url)+'</loc></url>').join('')+'</urlset>\n';
}

export function rss(posts){
 const items=posts.map(p=>'<item><title>'+escapeHTML(p.title)+'</title><link>'+ORIGIN+escapeHTML(p.url)+'</link><guid isPermaLink="true">'+ORIGIN+escapeHTML(p.url)+'</guid><pubDate>'+new Date(p.date).toUTCString()+'</pubDate><description>'+escapeHTML(p.description)+'</description></item>').join('');
 return '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Sarah Wadmore — Journal</title><link>'+ORIGIN+'/blog/</link><description>Studio notes and stories behind the artworks.</description>'+items+'</channel></rss>';
}
