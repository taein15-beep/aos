import { getPublicSpots } from "@/lib/stamp-tours/service";import{ok,routeError}from"@/lib/stamp-tours/http";
export async function GET(_request:Request,{params}:{params:Promise<{tourCode:string}>}){try{return ok(await getPublicSpots((await params).tourCode));}catch(error){return routeError(error);}}
