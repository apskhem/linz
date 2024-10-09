"use strict";var W=Object.create;var w=Object.defineProperty;var X=Object.getOwnPropertyDescriptor;var ee=Object.getOwnPropertyNames;var te=Object.getPrototypeOf,re=Object.prototype.hasOwnProperty;var ne=(e,t)=>{for(var r in t)w(e,r,{get:t[r],enumerable:!0})},M=(e,t,r,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of ee(t))!re.call(e,n)&&n!==r&&w(e,n,{get:()=>t[n],enumerable:!(s=X(t,n))||s.enumerable});return e};var x=(e,t,r)=>(r=e!=null?W(te(e)):{},M(t||!e||!e.__esModule?w(r,"default",{value:e,enumerable:!0}):r,e)),se=e=>M(w({},"__esModule",{value:!0}),e);var ge={};ne(ge,{ApiError:()=>A,HttpResponse:()=>g,METHODS:()=>$,Security:()=>H,ValidationError:()=>R,applyGroupConfig:()=>fe,buildJson:()=>me,endpoint:()=>he,initExpress:()=>oe,mergeEndpointGroups:()=>le});module.exports=se(ge);var L=x(require("fs")),J=require("stream"),U=x(require("cors"));var k=x(require("fs")),F=x(require("formidable"));function q(e,t){let r={},s=j(()=>t.requestBody?.parse(e.body)||e.body,i=>r.body=JSON.parse(i.message)),n=j(()=>t.parameters?.query?.parse(e.query)||e.query,i=>r.queries=JSON.parse(i.message)),a=j(()=>t.parameters?.path?.parse(e.params)||e.params,i=>r.params=JSON.parse(i.message)),c=j(()=>t.parameters?.header?.parse(e.headers)||e.headers,i=>r.headers=JSON.parse(i.message)),p=j(()=>t.parameters?.cookie?.parse(e.cookies)||e.cookies,i=>r.cookies=JSON.parse(i.message));if(Object.keys(r).length)throw new R(r);return{body:s??null,queries:n??{},params:a??{},headers:c??{},cookies:p??{}}}function b(e,t,r,s){typeof s=="string"&&console.error(s?`[error:${s}]: ${r}`:`[error]: ${r}`),e.status(t).contentType("application/json").send({statusCode:t,message:r})}function v(e){return typeof e>"u"?null:typeof e=="string"||typeof e=="number"||typeof e=="boolean"?{contentType:"text/plain",body:String(e)}:Array.isArray(e)||typeof e=="object"||e===null?{contentType:"application/json",body:JSON.stringify(e)}:Buffer.isBuffer(e)?{contentType:"application/octet-stream",body:e}:e instanceof URLSearchParams?{contentType:"application/x-www-form-urlencoded",body:Array.from(e).map(t=>t.map(encodeURIComponent).join("=")).join("&")}:{contentType:"text/plain",body:String(e)}}function D(e){let t=/:([^/]+)/g,r=N(e).replace(t,"{$1}"),s=[],n=null;for(;(n=t.exec(e))!==null;)s.push(n[1]);return{path:r,params:s}}function N(e){return e.replace(/\/+/gi,"/")}function j(e,t){try{return e()}catch(r){return t(r),null}}var _=require("lodash"),I="content-type";function G(e,t,r){let s=[];e.on("data",n=>s.push(n)),e.on("end",async()=>{if(e.method==="GET")return r();if(e.headers[I]==="application/json"){let n=Buffer.concat(s);try{n.length&&(e.body=JSON.parse(n.toString("utf-8")))}catch{return b(t,400,"Invalid JSON")}return r()}else if(e.headers[I]?.startsWith("multipart/form-data")){let n=(0,F.default)({}),[a,c]=await n.parse(e),p={};for(let[d,u=[]]of Object.entries(a))p[d]??=[],p[d]?.push(...u);for(let[d,u=[]]of Object.entries(c)){p[d]??=[];let T=u.map(y=>{let o=k.readFileSync(y.filepath),l=new Uint8Array(o),O=new File([l],y.originalFilename||y.newFilename,{type:y.mimetype||""});return k.rmSync(y.filepath),O});p[d]?.push(...T)}let i=[];for(let[d,u=[]]of Object.entries(p))u.length>1&&i.push({field:d,message:"Duplicated key"});return i.length?b(t,400,JSON.stringify({in:"body",result:i.map(({field:d,message:u})=>({path:[d],message:u}))})):(e.body=(0,_.mapValues)(p,d=>d[0]),r())}else if(e.headers[I]==="application/x-www-form-urlencoded"){let n=Buffer.concat(s).toString("utf-8"),a=new URLSearchParams(n),c=[];return Array.from(a.keys()).reduce((p,i)=>(p.has(i)?c.push(i):p.add(i),p),new Set),c.length?b(t,400,JSON.stringify({in:"body",result:c.map(p=>({path:[p],message:"Duplicated key"}))})):(e.body=Object.fromEntries(a),r())}else return e.headers[I]==="application/octet-stream"?(e.body=Buffer.concat(s),r()):b(t,415,`'${e.headers[I]}' content type is not supported`)}),e.on("error",n=>{b(t,500,String(n))})}function oe(e,t,r){r?.cors&&e.use((0,U.default)(typeof r.cors=="boolean"?{}:r.cors)),e.use(G),console.log(`[server]: Registering ${Object.keys(t).length} endpoints...`);let s=new Set;for(let[n,a]of Object.entries(t)){let[c="",...p]=n.split(":"),i=p.join(":");if(s.has(a.operationId))throw new Error(`Duplicate operation ID "${a.operationId}" for path ${i}`);if(s.add(a.operationId),!$.some(d=>d===c))throw new Error(`Invalid method "${c}" for path ${i}`);console.log(`[register]: ${a.operationId} -> ${c.toUpperCase()} ${i}`),e[c](i,async(d,u)=>{let T={};try{let y=q(d,a);if(a.security?.length)for(let h of a.security)await h.inner.handler(y,T);let o=await a.handler(y,T),l=c==="post"?201:200,O=o instanceof g&&o.payload.status?a.responses[o.payload.status]||a.responses.default:a.responses[l]||a.responses.default;if(!O||typeof O=="boolean"){let h=o instanceof g?o.payload.status:l;throw console.error(`[error]: There is no corresponding validator defined in schema for status ${h??"default"}`),new Error("Internal server error")}try{O.parse(o instanceof g?o.payload.body:o)}catch(h){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(h)),new Error("Internal server error")}let z=o instanceof g?o.payload.headers:void 0,Z=o instanceof g?o.payload.status:void 0,V=o instanceof g?o.payload.body:o;if(o instanceof g&&o.payload.body instanceof J.Readable)return u.header(o.payload.headers),o.payload.body.pipe(u);{let h=v(V),C=Z??l;return h?u.contentType(h.contentType).status(C).header(z).send(h.body):u.header(z).end()}}catch(y){return ae(y,u)}})}r?.docs&&ie(e,r.docs.path,r.docs.specUrl),pe(e)}function ae(e,t){e instanceof A?t.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof R?t.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([r,s])=>({in:r,result:s}))}):e instanceof Error?(console.error(String(e)),t.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),t.status(500).send({statusCode:500,message:String(e)}))}function ie(e,t,r){e.get(t,(s,n)=>{n.contentType("html").send(L.readFileSync("dist/index.html"))}),e.get("/openapi.json",(s,n)=>{n.contentType("json").send(L.readFileSync(r))})}function pe(e){e.all("*",(t,r)=>{b(r,404,`Cannot find ${t.method.toUpperCase()} ${t.path}`)})}var P=require("@anatine/zod-openapi"),f=require("lodash"),m=require("zod");var Q=x(require("http-status")),B="GeneralApiError",K="ValidationError",de=m.z.object({code:m.z.string(),expected:m.z.string(),received:m.z.string(),path:m.z.string().array(),message:m.z.string()}),ce=m.z.object({in:m.z.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:m.z.array(de).describe("An array of error items")}),Y=m.z.object({statusCode:m.z.number().int().min(100).max(599).describe("The HTTP response status code"),message:m.z.string().describe("The message associated with the error")}).describe("A general HTTP error response"),ue=Y.extend({message:m.z.union([m.z.array(ce).describe("An array of error schemas detailing validation issues"),m.z.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function me(e){let t={},r={};for(let[s,n]of Object.entries(e.paths)){let[a,...c]=s.split(/:/),{path:p,params:i}=D(c.join(":")),d=[],u=t[p]??{};if(n.parameters)for(let[o,l]of Object.entries(n.parameters)){let{properties:O={},required:z=[]}=(0,P.generateSchema)(l);for(let[Z,V]of Object.entries(O)){let{description:h,...C}=V;d.push({name:Z,in:o,description:h,required:z.includes(Z)||void 0,schema:C})}}let T=`${(0,f.upperFirst)(n.operationId)}RequestBody`;if(n.requestBody){let o=(0,P.generateSchema)(n.requestBody);r[T]=n.requestBodyType==="multipart/form-data"?ye(o):o}let y=`${(0,f.upperFirst)(n.operationId)}Response`;if(n.responses)for(let[o,l]of Object.entries(n.responses))typeof l=="object"&&(r[y]=(0,P.generateSchema)(l));u[a]={tags:n.tags?.length?Object.values(n.tags).map(o=>o.name):void 0,summary:n.summary||n.operationId,description:n.description,operationId:n.operationId,deprecated:n.deprecated,parameters:(0,f.isEmpty)(d)?void 0:d,security:n.security?.map(o=>({[o.inner.name]:[]})),requestBody:n.requestBody?{description:"[DUMMY]",content:E(n.requestBodyType||"application/json",T)}:void 0,responses:{...(0,f.mapValues)(n.responses,(o,l)=>({description:Q.default[`${l}`].toString(),content:typeof o=="boolean"?E("application/json",B):E("application/json",y)})),400:n.requestBody||!(0,f.isEmpty)(n.parameters)?{description:"Misformed data in a sending request",content:E("application/json",K)}:void 0,401:n.security?.length?{description:"Unauthorized",content:E("application/json",B)}:void 0,500:{description:"Server unhandled or runtime error that may occur",content:E("application/json",B)}}},t[p]=u}return{openapi:e.openapi,info:e.info,paths:t,components:{schemas:{...r,[B]:(0,P.generateSchema)(Y),[K]:(0,P.generateSchema)(ue)},securitySchemes:e.security?.length?(0,f.mapValues)((0,f.keyBy)(e.security.map(s=>s.inner),"name"),({handler:s,name:n,...a})=>a):void 0},tags:e.tags&&!(0,f.isEmpty)(e.tags)?Object.values(e.tags):void 0}}function E(e,t){return{[e]:{schema:{$ref:`#/components/schemas/${t}`}}}}function ye(e){return{type:e.type,properties:(0,f.mapValues)(e.properties,t=>t.nullable?{type:"string",format:"binary"}:t)}}var S=require("lodash");function le(e,t){let r=[],s=[];for(let n of t){let a=Object.keys(n).map(c=>N(`${e}${c}`));s.push(...(0,S.intersection)(r,a)),r.push(...a)}if(s.length)throw new Error(`Duplicated keys occured: ${s.join(", ")}`);return(0,S.mapKeys)(Object.assign({},...t),(n,a)=>N(a.replace(/:/,`:${e}`)))}function fe(e,t){return(0,S.mapValues)(e,r=>({...t,...r}))}var $=["get","post","put","patch","delete"];function he(e){return e}var g=class{constructor(t){this.payload=t}},H=class{constructor(t){this.inner=t}use(t,r){return this}},A=class extends Error{constructor(r,s){super(s);this.status=r;this.msg=s}},R=class extends Error{constructor(r){super(JSON.stringify(r));this.msg=r}};0&&(module.exports={ApiError,HttpResponse,METHODS,Security,ValidationError,applyGroupConfig,buildJson,endpoint,initExpress,mergeEndpointGroups});
//# sourceMappingURL=index.js.map