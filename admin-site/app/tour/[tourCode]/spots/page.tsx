import type{Metadata,Viewport}from"next";import SpotsClient from"./SpotsClient";
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f7faf7"};
export const metadata:Metadata={title:"관광지 | 철원 스탬프투어",description:"철원 스탬프투어 관광지를 인증 상태와 거리순으로 살펴보세요."};
export default async function Page({params}:{params:Promise<{tourCode:string}>}){return <SpotsClient tourCode={(await params).tourCode}/>}
