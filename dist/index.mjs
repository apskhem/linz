import*as B from"fs";import{Readable as G}from"stream";import J from"cors";import*as I from"fs";import v from"formidable";function C(e,t){let r={},o=E(()=>t.requestBody?.parse(e.body)||e.body,i=>r.body=JSON.parse(i.message)),n=E(()=>t.parameters?.query?.parse(e.query)||e.query,i=>r.queries=JSON.parse(i.message)),a=E(()=>t.parameters?.path?.parse(e.params)||e.params,i=>r.params=JSON.parse(i.message)),p=E(()=>t.parameters?.header?.parse(e.headers)||e.headers,i=>r.headers=JSON.parse(i.message)),c=E(()=>t.parameters?.cookie?.parse(e.cookies)||e.cookies,i=>r.cookies=JSON.parse(i.message));if(Object.keys(r).length)throw new O(r);return{body:o??null,queries:n??{},params:a??{},headers:p??{},cookies:c??{}}}function g(e,t,r,o){typeof o=="string"&&console.error(o?`[error:${o}]: ${r}`:`[error]: ${r}`),e.status(t).contentType("application/json").send({statusCode:t,message:r})}function V(e){return typeof e>"u"?null:typeof e=="string"||typeof e=="number"||typeof e=="boolean"?{contentType:"text/plain",body:String(e)}:Array.isArray(e)||typeof e=="object"||e===null?{contentType:"application/json",body:JSON.stringify(e)}:Buffer.isBuffer(e)?{contentType:"application/octet-stream",body:e}:e instanceof URLSearchParams?{contentType:"application/x-www-form-urlencoded",body:Array.from(e).map(t=>t.map(encodeURIComponent).join("=")).join("&")}:{contentType:"text/plain",body:String(e)}}function $(e){let t=/:([^/]+)/g,r=S(e).replace(t,"{$1}"),o=[],n=null;for(;(n=t.exec(e))!==null;)o.push(n[1]);return{path:r,params:o}}function S(e){return e.replace(/\/+/gi,"/")}function E(e,t){try{return e()}catch(r){return t(r),null}}import{mapValues as F}from"lodash";var P="content-type";function L(e,t,r){let o=[];e.on("data",n=>o.push(n)),e.on("end",async()=>{if(e.method==="GET")return r();if(e.headers[P]==="application/json"){let n=Buffer.concat(o);try{n.length&&(e.body=JSON.parse(n.toString("utf-8")))}catch{return g(t,400,"Invalid JSON")}return r()}else if(e.headers[P]?.startsWith("multipart/form-data")){let n=v({}),[a,p]=await n.parse(e),c={};for(let[d,u=[]]of Object.entries(a))c[d]??=[],c[d]?.push(...u);for(let[d,u=[]]of Object.entries(p)){c[d]??=[];let b=u.map(m=>{let s=I.readFileSync(m.filepath),f=new Uint8Array(s),T=new File([f],m.originalFilename||m.newFilename,{type:m.mimetype||""});return I.rmSync(m.filepath),T});c[d]?.push(...b)}let i=[];for(let[d,u=[]]of Object.entries(c))u.length>1&&i.push({field:d,message:"Duplicate keys"});return i.length?g(t,400,JSON.stringify(i.map(({field:d,message:u})=>({in:d,result:u})))):(e.body=F(c,d=>d[0]),r())}else if(e.headers[P]==="application/x-www-form-urlencoded"){let n=Buffer.concat(o).toString("utf-8"),a=new URLSearchParams(n),p=[];return Array.from(a.keys()).reduce((c,i)=>(c.has(i)?p.push(i):c.add(i),c),new Set),p.length?g(t,400,JSON.stringify(p.map(c=>({in:c,result:"Duplicate keys"})))):(e.body=Object.fromEntries(a),r())}else return e.headers[P]==="application/octet-stream"?(e.body=Buffer.concat(o),r()):g(t,415,`'${e.headers[P]}' content type is not supported`)}),e.on("error",n=>{g(t,500,String(n))})}function be(e,t,r){r?.cors&&e.use(J(typeof r.cors=="boolean"?{}:r.cors)),e.use(L),console.log(`[server]: Registering ${Object.keys(t).length} endpoints...`);let o=new Set;for(let[n,a]of Object.entries(t)){let[p="",...c]=n.split(":"),i=c.join(":");if(o.has(a.operationId))throw new Error(`Duplicate operation ID "${a.operationId}" for path ${i}`);if(o.add(a.operationId),!H.some(d=>d===p))throw new Error(`Invalid method "${p}" for path ${i}`);console.log(`[register]: ${a.operationId} -> ${p.toUpperCase()} ${i}`),e[p](i,async(d,u)=>{let b={};try{let m=C(d,a);if(a.security?.length)for(let l of a.security)await l.inner.handler(m,b);let s=await a.handler(m,b),f=s instanceof h&&s.payload.status?a.responses[s.payload.status]||a.responses.default:a.responses[p==="post"?201:200]||a.responses.default;if(!f||typeof f=="boolean")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${s?.status??"default"}`),new Error("Internal server error");try{f.parse(s instanceof h?s.payload.body:s)}catch(l){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(l)),new Error("Internal server error")}let T=s instanceof h?s.payload.headers:void 0,A=s instanceof h?s.payload.status:void 0,j=s instanceof h?s.payload.body:s;if(s instanceof h&&s.payload.body instanceof G)return u.header(s.payload.headers),s.payload.body.pipe(u);{let l=V(j),w=A??(p==="post"?201:200);return l?u.contentType(l.contentType).status(w).header(T).send(l.body):u.header(T).end()}}catch(m){return U(m,u)}})}r?.docs&&_(e,r.docs.path,r.docs.specUrl),K(e)}function U(e,t){e instanceof z?t.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof O?t.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([r,o])=>({in:r,result:o}))}):e instanceof Error?(console.error(String(e)),t.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),t.status(500).send({statusCode:500,message:String(e)}))}function _(e,t,r){e.get(t,(o,n)=>{n.contentType("html").send(B.readFileSync("dist/index.html"))}),e.get("/openapi.json",(o,n)=>{n.contentType("json").send(B.readFileSync(r))})}function K(e){e.all("*",(t,r)=>{g(r,404,`Cannot find ${t.method.toUpperCase()} ${t.path}`)})}import{generateSchema as Z}from"@anatine/zod-openapi";import{isEmpty as k,keyBy as Q,mapValues as N,upperFirst as M}from"lodash";import{z as y}from"zod";var x="ApiError",Y=y.object({statusCode:y.number().int().min(100).max(599),message:y.union([y.object({}),y.any().array(),y.string()])}),xe=y.object({statusCode:y.number().int().min(100).max(599),message:y.union([y.object({}),y.any().array(),y.string()])});function je(e){let t={},r={};for(let[o,n]of Object.entries(e.paths)){let[a,...p]=o.split(/:/),{path:c,params:i}=$(p.join(":")),d=[],u=t[c]??{};if(n.parameters)for(let[s,f]of Object.entries(n.parameters)){let{properties:T={},required:A=[]}=Z(f);for(let[j,l]of Object.entries(T)){let{description:w,...D}=l;d.push({name:j,in:s,description:w,required:A.includes(j)||void 0,schema:D})}}let b=`${M(n.operationId)}RequestBody`;if(n.requestBody){let s=Z(n.requestBody);r[b]=n.requestBodyType==="multipart/form-data"?W(s):s}let m=`${M(n.operationId)}Response`;if(n.responses)for(let[s,f]of Object.entries(n.responses))typeof f=="object"&&(r[m]=Z(f));u[a]={tags:n.tags?.length?Object.values(n.tags).map(s=>s.name):void 0,summary:n.summary||n.operationId,description:n.description,operationId:n.operationId,deprecated:n.deprecated,parameters:k(d)?void 0:d,security:n.security?.map(s=>({[s.inner.name]:[]})),requestBody:n.requestBody?{description:"[DUMMY]",content:R(n.requestBodyType||"application/json",b)}:void 0,responses:{...N(n.responses,s=>({description:"[DUMMY]",content:typeof s=="boolean"?R("application/json",x):R("application/json",m)})),400:n.requestBody||!k(n.parameters)?{description:"Misformed data in a sending request",content:R("application/json",x)}:void 0,401:n.security?.length?{description:"Unauthorized",content:R("application/json",x)}:void 0,500:{description:"Server unhandled or runtime error that may occur",content:R("application/json",x)}}},t[c]=u}return{openapi:e.openapi,info:e.info,paths:t,components:{schemas:{...r,[x]:Z(Y)},securitySchemes:e.security?.length?N(Q(e.security.map(o=>o.inner),"name"),({handler:o,name:n,...a})=>a):void 0},tags:e.tags&&!k(e.tags)?Object.values(e.tags):void 0}}function R(e,t){return{[e]:{schema:{$ref:`#/components/schemas/${t}`}}}}function W(e){return{type:e.type,properties:N(e.properties,t=>t.nullable?{type:"string",format:"binary"}:t)}}import{intersection as X,mapKeys as ee,mapValues as te}from"lodash";function Ze(e,t){let r=[],o=[];for(let n of t){let a=Object.keys(n).map(p=>S(`${e}${p}`));o.push(...X(r,a)),r.push(...a)}if(o.length)throw new Error(`Duplicated keys occured: ${o.join(", ")}`);return ee(Object.assign({},...t),(n,a)=>S(a.replace(/:/,`:${e}`)))}function Ae(e,t){return te(e,r=>({...t,...r}))}var H=["get","post","put","patch","delete"];function Be(e){return e}var h=class{constructor(t){this.payload=t}},q=class{constructor(t){this.inner=t}use(t,r){return this}},z=class extends Error{constructor(r,o){super(o);this.status=r;this.msg=o}},O=class extends Error{constructor(r){super(JSON.stringify(r));this.msg=r}};export{z as ApiError,h as HttpResponse,H as METHODS,q as Security,O as ValidationError,Ae as applyGroupConfig,je as buildJson,Be as endpoint,be as initExpress,Ze as mergeEndpointGroups};
//# sourceMappingURL=index.mjs.map