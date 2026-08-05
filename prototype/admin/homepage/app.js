window.siteShellReady.then(function(){
const A='assets/';
const imageFiles=['travel-01.jpeg','travel-02.jpg','travel-03.png','travel-04.jpg','travel-05.jpg','travel-06.jpg','travel-07.jpg','travel-08.jpg','travel-09.png','travel-10.jpg','travel-11.jpg','travel-12.jpg','travel-13.jpg','travel-14.jpg','travel-15.jpg','travel-16.jpg','travel-17.jpg','travel-18.jpg'];
const regionNames={일본:['도쿄','오사카','홋카이도','오키나와'],베트남:['다낭','나트랑','푸꾸옥','하노이'],태국:['방콕','파타야','푸켓','치앙마이'],유럽:['파리','로마','프라하','스위스']};
const productCodes=['paldo-111','HP0001','boram01','B-11111'];
const adminProducts=[
  {code:'paldo-111',name:'팔도장터열차 공주 색동수국정원',region:'국내',price:79000},
  {code:'HP0001',name:'청도 바캉스 온천·관광·미식투어',region:'중국',price:840000},
  {code:'boram01',name:'당진 장고항과 삼선산 수목원',region:'국내',price:15000},
  {code:'B-11111',name:'과거와 현재의 공존 경주 1박2일',region:'국내',price:10000}
];
const quick=[['AIR','항공권',false],['HTL','호텔',false],['PKG','패키지',true],['TRN','기차여행',true],['BUS','버스여행',true],['GLF','골프여행',false],['CRS','크루즈',false],['GFT','상품권',false]];
const heroSlides=[
  {bg:'travel-02.jpg',preview:'travel-06.jpg',title:'여행의 설렘을 더 감각적',sub:'국내·해외 패키지부터 항공 · 호텔까지',name:'교토의 감성 여행',code:'HP0001'},
  {bg:'travel-14.jpg',preview:'travel-10.jpg',title:'일상 너머의 특별한 순간',sub:'바다와 도시, 미식이 함께하는 여행',name:'오키나와 힐링 여행',code:'boram01'},
  {bg:'travel-17.jpg',preview:'travel-15.jpg',title:'우리만의 여행을 시작해요',sub:'가족부터 친구까지 취향대로 떠나요',name:'홋카이도 자연 여행',code:'paldo-111'}
];
const img=i=>A+imageFiles[i%imageFiles.length];
const detail=code=>'../product_detail.html?code='+encodeURIComponent(code);
const list=params=>'../product_list.html'+(params?'?'+params:'');
const formatPrice=value=>value>0?value.toLocaleString('ko-KR')+'원~':'가격문의';
const wishlist=new Set(JSON.parse(localStorage.getItem('happy2ourWishlist')||'[]'));
function saveWishlist(){localStorage.setItem('happy2ourWishlist',JSON.stringify(Array.from(wishlist)));document.querySelectorAll('.wishlist-count').forEach(el=>el.textContent=wishlist.size)}
function quickMenu(){document.querySelector('#quick').innerHTML=quick.map(([icon,name,enabled],i)=>enabled?`<a href="${list('category='+i)}"><i>${icon}</i><span>${name}</span></a>`:`<button type="button" data-ready="${name}"><i>${icon}</i><span>${name}</span><small>준비중</small></button>`).join('')}
function cards(region='일본',offset=0){return regionNames[region].map((name,i)=>{const base=adminProducts[i];const code=base.code;return `<article class="card"><a href="${detail(code)}"><img src="${img(i+offset)}" alt="${name} 여행"><div class="card-body"><em>${region} · 추천여행</em><h3>${name}</h3><p>${i===1?base.name:`BEST ${name} 핵심 명소와 여유를 담은 ${i+3}박 ${i+4}일`}</p><strong class="price">${formatPrice(i===1?base.price:0)}</strong></div></a><button class="wish ${wishlist.has(code)?'active':''}" type="button" data-wish="${code}" aria-label="${name} 찜하기" aria-pressed="${wishlist.has(code)}">♡</button></article>`}).join('')}
function features(region='일본'){return regionNames[region].map((n,i)=>`<a class="feature" href="${detail(productCodes[i])}"><img src="${img(i+3)}" alt="${n}"><div><small>${region}</small><h3>${n}</h3><span>지금 떠나기 좋은 여행</span></div></a>`).join('')}
function rank(region='일본'){return regionNames[region].map((n,i)=>`<li><a href="${detail(productCodes[i])}"><b>${i+1}</b><img src="${img(i+5)}" alt="${n}"><div><h3>${n}</h3><p>${adminProducts[i].name}</p></div><strong>${formatPrice(adminProducts[i].price)}</strong><span aria-hidden="true">→</span></a></li>`).join('')}
quickMenu();
['wish-grid','popular-grid','recommend-grid','world-grid'].forEach((id,i)=>document.querySelector('#'+id).innerHTML=cards('일본',i*3));
const popularRegions=[['베트남','다낭·하롱베이',8,'sea'],['장가계','대자연의 절경',5,'china'],['일본','가까운 설렘',3,'japan'],['몽골','초원과 별빛',14,'mongolia'],['대만','미식과 야경',12,'taiwan'],['유럽','도시와 예술',17,'europe'],['이집트','시간을 걷는 여행',10,'egypt']];
document.querySelector('#circle-list').innerHTML=popularRegions.map(([name,copy,imageIndex,region])=>`<a class="circle-item" href="${list('region='+region)}"><span class="circle-image"><img src="${img(imageIndex)}" alt="${name} 대표 여행지"></span><b>${name}</b><span class="circle-copy">${copy}</span></a>`).join('');
document.querySelector('#mini-grid').innerHTML=['다낭 여행','나트랑 여행','푸꾸옥 여행','하노이 여행','호치민 여행','사파 여행'].map((n,i)=>`<a class="mini" href="${list('theme='+i)}"><img src="${img(i+8)}" alt="${n}"><div><b>${n}</b><p>가족과 함께하는 특별한 휴양</p></div></a>`).join('');
document.querySelector('#theme-grid').innerHTML=features();
document.querySelector('#poster-grid').innerHTML=['도쿄의 낮과 밤','오사카 미식 산책','홋카이도 자연'].map((n,i)=>`<a class="poster" href="${detail(productCodes[i])}"><img src="${img(i+10)}" alt="${n}"><div><b>${n}</b><p>감각적인 여행의 순간</p></div></a>`).join('');
function journey(active=0){const names=['베트남 여행','태국 여행','필리핀 여행','싱가포르 여행'];document.querySelector('#journey-grid').innerHTML=names.map((n,i)=>`<a class="journey ${i===active?'selected':''}" href="${list('journey='+i)}"><small>DAY 0${i+1}</small><h3>${n}</h3><p>${n}의 대표 도시를 내 취향대로</p><img src="${img(i+12)}" alt="${n}"></a>`).join('')}
journey();
document.querySelector('#rank-list').innerHTML=rank();
document.querySelector('#gallery').innerHTML=['가족여행','힐링여행','액티비티','자유여행','미식여행'].map((n,i)=>`<a href="${list('gallery='+i)}"><img src="${img(i+1)}" alt="${n}"><span>${n}</span></a>`).join('');
document.querySelectorAll('.tabs').forEach(group=>group.addEventListener('click',e=>{if(e.target.tagName!=='BUTTON')return;group.querySelectorAll('button').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false')});e.target.classList.add('active');e.target.setAttribute('aria-selected','true');const target=document.querySelector('#'+group.dataset.target);if(!target)return;const region=e.target.textContent.trim();target.innerHTML=target.classList.contains('feature-grid')?features(region):target.classList.contains('rank-list')?rank(region):cards(region,2)}));
document.querySelector('.journey-tabs').addEventListener('click',e=>{if(e.target.tagName!=='BUTTON')return;const buttons=[...e.currentTarget.querySelectorAll('button')];buttons.forEach(b=>b.classList.remove('active'));e.target.classList.add('active');journey(buttons.indexOf(e.target))});
document.addEventListener('click',e=>{const ready=e.target.closest('[data-ready]');if(ready){alert(ready.dataset.ready+' 서비스는 준비 중입니다.')}const wish=e.target.closest('[data-wish]');if(wish){const code=wish.dataset.wish;wishlist.has(code)?wishlist.delete(code):wishlist.add(code);wish.classList.toggle('active',wishlist.has(code));wish.setAttribute('aria-pressed',wishlist.has(code));saveWishlist()}const scroll=e.target.closest('[data-scroll]');if(scroll){const target=document.querySelector(scroll.dataset.scroll);if(target)target.scrollIntoView({behavior:'smooth'})}});
document.querySelector('.menu-toggle').addEventListener('click',e=>{const nav=document.querySelector('.gnb');nav.classList.toggle('open');const open=nav.classList.contains('open');e.currentTarget.setAttribute('aria-expanded',open);e.currentTarget.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기')});
document.querySelectorAll('[data-mood]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-mood]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.mood-photos a').forEach((card,i)=>card.classList.toggle('focus',i===Number(b.dataset.mood)%3))}));
let heroIndex=0,heroTimer;
const hero=document.querySelector('.hero');const heroBg=hero.querySelector('.hero-bg');const heroPreview=hero.querySelector('.hero-preview');const dots=hero.querySelector('.hero-dots');
dots.innerHTML=heroSlides.map((_,i)=>`<button type="button" aria-label="${i+1}번째 추천 여행" data-hero="${i}"></button>`).join('');
function showHero(index){heroIndex=(index+heroSlides.length)%heroSlides.length;const slide=heroSlides[heroIndex];heroBg.style.backgroundImage=`linear-gradient(90deg,rgba(4,20,29,.65),rgba(8,32,56,.07)),url('${A+slide.bg}')`;hero.querySelector('h1').childNodes[0].nodeValue=slide.title;hero.querySelector('.hero-copy p').textContent=slide.sub;heroPreview.querySelector('img').src=A+slide.preview;heroPreview.querySelector('img').alt=slide.name;heroPreview.querySelector('span').textContent=slide.name;hero.querySelectorAll('.hero-product-link').forEach(a=>a.href=detail(slide.code));dots.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===heroIndex))}
function autoHero(){clearInterval(heroTimer);heroTimer=setInterval(()=>showHero(heroIndex+1),6000)}
hero.querySelector('.prev').addEventListener('click',()=>{showHero(heroIndex-1);autoHero()});hero.querySelector('.next').addEventListener('click',()=>{showHero(heroIndex+1);autoHero()});dots.addEventListener('click',e=>{if(e.target.dataset.hero!==undefined){showHero(Number(e.target.dataset.hero));autoHero()}});showHero(0);autoHero();
saveWishlist();
}).catch(function(error){console.error(error)});
