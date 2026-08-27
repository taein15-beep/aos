import{ok,routeError}from"@/lib/stamp-tours/http";import{validateQr}from"@/lib/stamp-tours/service";
export async function GET(_request:Request,{params}:{params:Promise<{qrToken:string}>}){try{return ok(await validateQr(undefined,(await params).qrToken));}catch(error){return routeError(error);}}
