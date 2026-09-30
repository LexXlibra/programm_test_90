type WindowEntry={resetAt:number;count:number};
const windows=new Map<string,WindowEntry>();
let operations=0;

export function isRateLimited(key:string,limit:number,windowMs:number,now=Date.now()):boolean{
  operations++;
  if(operations%256===0){for(const [entry,value] of windows)if(value.resetAt<=now)windows.delete(entry);if(windows.size>20_000){const oldest=[...windows.entries()].sort((a,b)=>a[1].resetAt-b[1].resetAt).slice(0,windows.size-15_000);for(const [entry] of oldest)windows.delete(entry);}}
  const current=windows.get(key);
  if(!current||current.resetAt<=now){windows.set(key,{resetAt:now+windowMs,count:1});return false;}
  current.count++;
  return current.count>limit;
}
