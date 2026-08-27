export type Spot={spotCode:string;name:string;description:string;address:string;latitude:number;longitude:number;allowedRadiusMeters:number;opensAt:string;closesAt:string;sortOrder:number;verified?:number;verifiedAt?:string|null};
export type Reward={id:string;name:string;description:string;requiredSpotCount:number;stockRemaining:number;canApply:number};
export const spotExtras:Record<string,{image:string;closed:string;contact:string;required:boolean;recommend:number;qrGuide:string;caution:string}>= {
 "CHW-SPOT-001":{image:"https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=900&q=80",closed:"연중무휴",contact:"033-450-5559",required:true,recommend:100,qrGuide:"관광안내소 입구 오른쪽 스탬프 안내판",caution:"강변 산책로는 비가 온 뒤 미끄러울 수 있어요."},
 "CHW-SPOT-002":{image:"https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=900&q=80",closed:"매주 화요일",contact:"033-455-7072",required:true,recommend:95,qrGuide:"종합안내센터 내부 투어 안내대",caution:"전시관 종료 30분 전에는 입장이 제한될 수 있어요."},
 "CHW-SPOT-003":{image:"https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",closed:"매주 화요일·기상 악화 시",contact:"070-7374-6401",required:false,recommend:88,qrGuide:"모노레일 매표소 옆 QR 안내판",caution:"탑승권 매진 여부를 방문 전에 확인해 주세요."},
 "CHW-SPOT-004":{image:"https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=80",closed:"연중무휴",contact:"033-450-5365",required:false,recommend:82,qrGuide:"주차장에서 폭포로 내려가는 입구 안내판",caution:"난간 밖으로 이동하지 말고 지정 탐방로를 이용해 주세요."},
 "CHW-SPOT-005":{image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",closed:"연중무휴·강풍 시 통제",contact:"033-450-5365",required:false,recommend:90,qrGuide:"은하수교 매표소 앞 스탬프존",caution:"강풍이나 결빙 시 다리 출입이 제한될 수 있어요."},
};
export const fixtureSpots:Spot[]=[
 {spotCode:"CHW-SPOT-001",name:"고석정",description:"한탄강 협곡과 고석바위를 만나는 철원 대표 관광지",address:"강원특별자치도 철원군 동송읍 태봉로 1825",latitude:38.186355,longitude:127.287711,allowedRadiusMeters:120,opensAt:"09:00",closesAt:"18:00",sortOrder:1},
 {spotCode:"CHW-SPOT-002",name:"철원역사문화공원",description:"근대 철원의 역사와 문화를 체험하는 공간",address:"강원특별자치도 철원군 철원읍 금강산로 262",latitude:38.25717,longitude:127.201424,allowedRadiusMeters:100,opensAt:"09:00",closesAt:"18:00",sortOrder:2},
 {spotCode:"CHW-SPOT-003",name:"소이산 모노레일",description:"철원평야와 DMZ를 조망하는 평화관광 명소",address:"강원특별자치도 철원군 철원읍 금강산로 262",latitude:38.260456,longitude:127.20276,allowedRadiusMeters:150,opensAt:"09:00",closesAt:"18:00",sortOrder:3},
 {spotCode:"CHW-SPOT-004",name:"직탕폭포",description:"한탄강의 주상절리를 따라 펼쳐진 폭포",address:"강원특별자치도 철원군 동송읍 직탕길 94",latitude:38.210414,longitude:127.285799,allowedRadiusMeters:120,opensAt:"09:00",closesAt:"18:00",sortOrder:4},
 {spotCode:"CHW-SPOT-005",name:"은하수교",description:"한탄강 주상절리길을 잇는 보행교",address:"강원특별자치도 철원군 동송읍 장흥리 725-12",latitude:38.20166,longitude:127.305039,allowedRadiusMeters:100,opensAt:"09:00",closesAt:"18:00",sortOrder:5},
];
export const fixtureRewards:Reward[]=[{id:"reward_cheorwon_03",name:"관광 기념 스티커",description:"여행의 순간을 간직하는 스티커",requiredSpotCount:3,stockRemaining:500,canApply:0},{id:"reward_cheorwon_04",name:"평화관광 에코백",description:"철원 여행에 어울리는 에코백",requiredSpotCount:4,stockRemaining:300,canApply:0},{id:"reward_cheorwon_05",name:"철원 오대쌀 기념 세트",description:"철원의 맛을 담은 완주 선물",requiredSpotCount:5,stockRemaining:100,canApply:0}];
export function dateTime(value?:string|null){return value?new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value)):""}
export function distance(a:number,b:number,c:number,d:number){const r=6371e3,p=(x:number)=>x*Math.PI/180;const f1=p(a),f2=p(c),df=p(c-a),dl=p(d-b);const h=Math.sin(df/2)**2+Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;return 2*r*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
