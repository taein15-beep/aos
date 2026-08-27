import{requestPhoneAuth}from"@/lib/stamp-tours/service";import{jsonBody,ok,required,routeError}from"@/lib/stamp-tours/http";
export async function POST(request:Request){try{const body=await jsonBody<{phone:string}>(request);return ok(await requestPhoneAuth(required(body.phone,"phone")),201);}catch(error){return routeError(error);}}
