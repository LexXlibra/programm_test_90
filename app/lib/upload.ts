export class UploadError extends Error {}

export function uploadMultipart(url:string,form:FormData,onProgress:(percent:number)=>void):Promise<Record<string,unknown>>{
  return new Promise((resolve,reject)=>{
    const request=new XMLHttpRequest();
    request.open("POST",url);
    request.upload.onprogress=(event)=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100));};
    request.onerror=()=>reject(new UploadError("Upload connection failed."));
    request.onload=()=>{
      let result:Record<string,unknown>;
      try{const parsed:unknown=JSON.parse(request.responseText);if(typeof parsed!=="object"||parsed===null||Array.isArray(parsed))throw new Error("Invalid response");result=parsed as Record<string,unknown>;}catch{reject(new UploadError("The server returned an invalid response."));return;}
      if(request.status<200||request.status>=300){reject(new UploadError(typeof result.error==="string"?result.error:"Upload failed."));return;}
      resolve(result);
    };
    request.send(form);
  });
}
