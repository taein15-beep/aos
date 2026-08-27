import{validateQr}from"@/lib/stamp-tours/service";import{jsonBody,ok,required,routeError}from"@/lib/stamp-tours/http";
export async function POST(request:Request,{params}:{params:Promise<{tourCode:string}>}){try{const body=await jsonBody<{token:string}>(request);return ok(await validateQr((await params).tourCode,required(body.token,"token")));}catch(error){return routeError(error);}}
