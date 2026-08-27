import type { Metadata,Viewport } from "next";import JoinClient from "./JoinClient";
export const metadata:Metadata={title:"스탬프투어 참여 등록",description:"휴대전화 인증 후 철원 DMZ 평화관광 스탬프투어를 시작하세요."};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f7fbf5"};
export default async function JoinPage({params}:{params:Promise<{tourCode:string}>}){return <JoinClient tourCode={(await params).tourCode}/>;}
