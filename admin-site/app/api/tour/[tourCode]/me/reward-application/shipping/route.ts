import{updateShipping}from"@/lib/stamp-tours/service";import{jsonBody,ok,routeError}from"@/lib/stamp-tours/http";import{readParticipantToken}from"@/lib/stamp-tours/security";
type Body={recipientName:string;phone:string;postalCode:string;address:string;addressDetail:string;deliveryRequest?:string};
export async function PATCH(request:Request,{params}:{params:Promise<{tourCode:string}>}){try{const tourCode=(await params).tourCode;return ok(await updateShipping(tourCode,readParticipantToken(request,tourCode),await jsonBody<Body>(request)));}catch(error){return routeError(error);}}
