import type{Metadata,Viewport}from"next";import StampbookClient from"./StampbookClient";
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f7faf7"};export const metadata:Metadata={title:"스탬프북 | 철원 스탬프투어",description:"모은 스탬프와 단계별 경품 달성 현황을 확인하세요."};
export default async function Page({params}:{params:Promise<{tourCode:string}>}){return <StampbookClient tourCode={(await params).tourCode}/>}
