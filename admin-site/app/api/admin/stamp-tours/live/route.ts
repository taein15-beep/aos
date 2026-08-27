import{liveAdmin,requireAdmin}from"@/lib/stamp-tours/admin";import{ok,routeError}from"@/lib/stamp-tours/http";
export async function GET(request:Request){try{requireAdmin(request);const section=new URL(request.url).searchParams.get("section")??"tours";return ok(await liveAdmin(section));}catch(error){return routeError(error);}}
