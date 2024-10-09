import*as k from"fs";import{Readable as K}from"stream";import Q from"cors";import*as A from"fs";import J from"formidable";function L(e,t){let n={},o=E(()=>t.requestBody?.parse(e.body)||e.body,i=>n.body=JSON.parse(i.message)),r=E(()=>t.parameters?.query?.parse(e.query)||e.query,i=>n.queries=JSON.parse(i.message)),a=E(()=>t.parameters?.path?.parse(e.params)||e.params,i=>n.params=JSON.parse(i.message)),d=E(()=>t.parameters?.header?.parse(e.headers)||e.headers,i=>n.headers=JSON.parse(i.message)),p=E(()=>t.parameters?.cookie?.parse(e.cookies)||e.cookies,i=>n.cookies=JSON.parse(i.message));if(Object.keys(n).length)throw new O(n);return{body:o??null,queries:r??{},params:a??{},headers:d??{},cookies:p??{}}}function b(e,t,n,o){typeof o=="string"&&console.error(o?`[error:${o}]: ${n}`:`[error]: ${n}`),e.status(t).contentType("application/json").send({statusCode:t,message:n})}function $(e){return typeof e>"u"?null:typeof e=="string"||typeof e=="number"||typeof e=="boolean"?{contentType:"text/plain",body:String(e)}:Array.isArray(e)||typeof e=="object"||e===null?{contentType:"application/json",body:JSON.stringify(e)}:Buffer.isBuffer(e)?{contentType:"application/octet-stream",body:e}:e instanceof URLSearchParams?{contentType:"application/x-www-form-urlencoded",body:Array.from(e).map(t=>t.map(encodeURIComponent).join("=")).join("&")}:{contentType:"text/plain",body:String(e)}}function H(e){let t=/:([^/]+)/g,n=I(e).replace(t,"{$1}"),o=[],r=null;for(;(r=t.exec(e))!==null;)o.push(r[1]);return{path:n,params:o}}function I(e){return e.replace(/\/+/gi,"/")}function E(e,t){try{return e()}catch(n){return t(n),null}}import{mapValues as U}from"lodash";var P="content-type";function M(e,t,n){let o=[];e.on("data",r=>o.push(r)),e.on("end",async()=>{if(e.method==="GET")return n();if(e.headers[P]==="application/json"){let r=Buffer.concat(o);try{r.length&&(e.body=JSON.parse(r.toString("utf-8")))}catch{return b(t,400,"Invalid JSON")}return n()}else if(e.headers[P]?.startsWith("multipart/form-data")){let r=J({}),[a,d]=await r.parse(e),p={};for(let[c,u=[]]of Object.entries(a))p[c]??=[],p[c]?.push(...u);for(let[c,u=[]]of Object.entries(d)){p[c]??=[];let T=u.map(y=>{let s=A.readFileSync(y.filepath),l=new Uint8Array(s),h=new File([l],y.originalFilename||y.newFilename,{type:y.mimetype||""});return A.rmSync(y.filepath),h});p[c]?.push(...T)}let i=[];for(let[c,u=[]]of Object.entries(p))u.length>1&&i.push({field:c,message:"Duplicated key"});return i.length?b(t,400,JSON.stringify({in:"body",result:i.map(({field:c,message:u})=>({path:[c],message:u}))})):(e.body=U(p,c=>c[0]),n())}else if(e.headers[P]==="application/x-www-form-urlencoded"){let r=Buffer.concat(o).toString("utf-8"),a=new URLSearchParams(r),d=[];return Array.from(a.keys()).reduce((p,i)=>(p.has(i)?d.push(i):p.add(i),p),new Set),d.length?b(t,400,JSON.stringify({in:"body",result:d.map(p=>({path:[p],message:"Duplicated key"}))})):(e.body=Object.fromEntries(a),n())}else return e.headers[P]==="application/octet-stream"?(e.body=Buffer.concat(o),n()):b(t,415,`'${e.headers[P]}' content type is not supported`)}),e.on("error",r=>{b(t,500,String(r))})}function Se(e,t,n){n?.cors&&e.use(Q(typeof n.cors=="boolean"?{}:n.cors)),e.use(M),console.log(`[server]: Registering ${Object.keys(t).length} endpoints...`);let o=new Set;for(let[r,a]of Object.entries(t)){let[d="",...p]=r.split(":"),i=p.join(":");if(o.has(a.operationId))throw new Error(`Duplicate operation ID "${a.operationId}" for path ${i}`);if(o.add(a.operationId),!q.some(c=>c===d))throw new Error(`Invalid method "${d}" for path ${i}`);console.log(`[register]: ${a.operationId} -> ${d.toUpperCase()} ${i}`),e[d](i,async(c,u)=>{let T={};try{let y=L(c,a);if(a.security?.length)for(let f of a.security)await f.inner.handler(y,T);let s=await a.handler(y,T),l=d==="post"?201:200,h=s instanceof g&&s.payload.status?a.responses[s.payload.status]||a.responses.default:a.responses[l]||a.responses.default;if(!h||typeof h=="boolean"||typeof h=="string"){let f=s instanceof g?s.payload.status:l;throw console.error(`[error]: There is no corresponding validator defined in schema for status ${f??"default"}`),new Error("Internal server error")}try{h.parse(s instanceof g?s.payload.body:s)}catch(f){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(f)),new Error("Internal server error")}let x=s instanceof g?s.payload.headers:void 0,j=s instanceof g?s.payload.status:void 0,N=s instanceof g?s.payload.body:s;if(s instanceof g&&s.payload.body instanceof K)return u.header(s.payload.headers),s.payload.body.pipe(u);{let f=$(N),Z=j??l;return f?u.contentType(f.contentType).status(Z).header(x).send(f.body):u.header(x).end()}}catch(y){return Y(y,u)}})}n?.docs&&W(e,n.docs.path,n.docs.specUrl),X(e)}function Y(e,t){e instanceof z?t.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof O?t.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([n,o])=>({in:n,result:o}))}):e instanceof Error?(console.error(String(e)),t.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),t.status(500).send({statusCode:500,message:String(e)}))}function W(e,t,n){e.get(t,(o,r)=>{r.contentType("html").send(k.readFileSync("dist/index.html"))}),e.get("/openapi.json",(o,r)=>{r.contentType("json").send(k.readFileSync(n))})}function X(e){e.all("*",(t,n)=>{b(n,404,`Cannot find ${t.method.toUpperCase()} ${t.path}`)})}import{generateSchema as S}from"@anatine/zod-openapi";import D from"http-status";import{isEmpty as B,keyBy as ee,mapValues as C,upperFirst as v}from"lodash";import{z as m}from"zod";var w="GeneralApiError",_="ValidationError",te=m.object({code:m.string(),expected:m.string(),received:m.string(),path:m.string().array(),message:m.string()}),re=m.object({in:m.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:m.array(te).describe("An array of error items")}),F=m.object({statusCode:m.number().int().min(100).max(599).describe("The HTTP response status code"),message:m.string().describe("The message associated with the error")}).describe("A general HTTP error response"),ne=F.extend({message:m.union([m.array(re).describe("An array of error schemas detailing validation issues"),m.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function Ne(e){let t={},n={};for(let[o,r]of Object.entries(e.paths)){let[a,...d]=o.split(/:/),{path:p,params:i}=H(d.join(":")),c=[],u=t[p]??{};if(r.parameters)for(let[s,l]of Object.entries(r.parameters)){let{properties:h={},required:x=[]}=S(l);for(let[j,N]of Object.entries(h)){let{description:f,...Z}=N;c.push({name:j,in:s,description:f,required:x.includes(j)||void 0,schema:Z})}}let T=`${v(r.operationId)}RequestBody`;if(r.requestBody){let s=S(r.requestBody);n[T]=r.requestBodyType==="multipart/form-data"?se(s):s}let y=`${v(r.operationId)}Response`;if(r.responses)for(let[s,l]of Object.entries(r.responses))typeof l=="object"&&(n[y]=S(l));u[a]={tags:r.tags?.length?Object.values(r.tags).map(s=>s.name):void 0,summary:r.summary||r.operationId,description:r.description,operationId:r.operationId,deprecated:r.deprecated,parameters:B(c)?void 0:c,security:r.security?.map(s=>({[s.inner.name]:[]})),requestBody:r.requestBody?{description:"[DUMMY]",content:R(r.requestBodyType||"application/json",T)}:void 0,responses:{...C(r.responses,(s,l)=>({description:(typeof s=="string"?String(s):null)||D[`${l}`].toString()||"No description",content:typeof s=="boolean"||typeof s=="string"?R("application/json",w):R("application/json",y)})),400:r.requestBody||!B(r.parameters)?{description:V(r.responses,400)||"Misformed data in a sending request",content:R("application/json",_)}:void 0,401:r.security?.length?{description:V(r.responses,401)||D[401],content:R("application/json",w)}:void 0,500:{description:V(r.responses,500)||"Server unhandled or runtime error that may occur",content:R("application/json",w)}}},t[p]=u}return{openapi:e.openapi,info:e.info,paths:t,components:{schemas:{...n,[w]:S(F),[_]:S(ne)},securitySchemes:e.security?.length?C(ee(e.security.map(o=>o.inner),"name"),({handler:o,name:r,...a})=>a):void 0},tags:e.tags&&!B(e.tags)?Object.values(e.tags):void 0}}function R(e,t){return{[e]:{schema:{$ref:`#/components/schemas/${t}`}}}}function se(e){return{type:e.type,properties:C(e.properties,t=>t.nullable?{type:"string",format:"binary"}:t)}}function V(e,t){let n=e[t];return typeof n=="string"?String(n):null}import{intersection as oe,mapKeys as ae,mapValues as ie}from"lodash";function Ve(e,t){let n=[],o=[];for(let r of t){let a=Object.keys(r).map(d=>I(`${e}${d}`));o.push(...oe(n,a)),n.push(...a)}if(o.length)throw new Error(`Duplicated keys occured: ${o.join(", ")}`);return ae(Object.assign({},...t),(r,a)=>I(a.replace(/:/,`:${e}`)))}function Ce(e,t){return ie(e,n=>({...t,...n}))}var q=["get","post","put","patch","delete"];function $e(e){return e}var g=class{constructor(t){this.payload=t}},G=class{constructor(t){this.inner=t}use(t,n){return this}},z=class extends Error{constructor(n,o){super(o);this.status=n;this.msg=o}},O=class extends Error{constructor(n){super(JSON.stringify(n));this.msg=n}};export{z as ApiError,g as HttpResponse,q as METHODS,G as Security,O as ValidationError,Ce as applyGroupConfig,Ne as buildJson,$e as endpoint,Se as initExpress,Ve as mergeEndpointGroups};
//# sourceMappingURL=index.mjs.map