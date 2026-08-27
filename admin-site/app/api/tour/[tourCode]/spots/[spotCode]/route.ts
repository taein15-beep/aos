import { getPublicSpots } from "@/lib/stamp-tours/service";import{ok,routeError}from"@/lib/stamp-tours/http";
export async function GET(_request:Request,{params}:{params:Promise<{tourCode:string;spotCode:string}>}){try{const p=await params;return ok(await getPublicSpots(p.tourCode,p.spotCode));}catch(error){return routeError(error);}}
