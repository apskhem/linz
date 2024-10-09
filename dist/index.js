"use strict";var K=Object.create;var A=Object.defineProperty;var Q=Object.getOwnPropertyDescriptor;var Y=Object.getOwnPropertyNames;var W=Object.getPrototypeOf,X=Object.prototype.hasOwnProperty;var ee=(e,t)=>{for(var n in t)A(e,n,{get:t[n],enumerable:!0})},H=(e,t,n,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of Y(t))!X.call(e,r)&&r!==n&&A(e,r,{get:()=>t[r],enumerable:!(s=Q(t,r))||s.enumerable});return e};var w=(e,t,n)=>(n=e!=null?K(W(e)):{},H(t||!e||!e.__esModule?A(n,"default",{value:e,enumerable:!0}):n,e)),te=e=>H(A({},"__esModule",{value:!0}),e);var me={};ee(me,{ApiError:()=>S,HttpResponse:()=>h,METHODS:()=>$,Security:()=>L,ValidationError:()=>O,applyGroupConfig:()=>de,buildJson:()=>ie,endpoint:()=>ue,initExpress:()=>ne,mergeEndpointGroups:()=>ce});module.exports=te(me);var V=w(require("fs")),J=require("stream"),U=w(require("cors"));var k=w(require("fs")),v=w(require("formidable"));function M(e,t){let n={},s=x(()=>t.requestBody?.parse(e.body)||e.body,i=>n.body=JSON.parse(i.message)),r=x(()=>t.parameters?.query?.parse(e.query)||e.query,i=>n.queries=JSON.parse(i.message)),a=x(()=>t.parameters?.path?.parse(e.params)||e.params,i=>n.params=JSON.parse(i.message)),p=x(()=>t.parameters?.header?.parse(e.headers)||e.headers,i=>n.headers=JSON.parse(i.message)),c=x(()=>t.parameters?.cookie?.parse(e.cookies)||e.cookies,i=>n.cookies=JSON.parse(i.message));if(Object.keys(n).length)throw new O(n);return{body:s??null,queries:r??{},params:a??{},headers:p??{},cookies:c??{}}}function b(e,t,n,s){typeof s=="string"&&console.error(s?`[error:${s}]: ${n}`:`[error]: ${n}`),e.status(t).contentType("application/json").send({statusCode:t,message:n})}function q(e){return typeof e>"u"?null:typeof e=="string"||typeof e=="number"||typeof e=="boolean"?{contentType:"text/plain",body:String(e)}:Array.isArray(e)||typeof e=="object"||e===null?{contentType:"application/json",body:JSON.stringify(e)}:Buffer.isBuffer(e)?{contentType:"application/octet-stream",body:e}:e instanceof URLSearchParams?{contentType:"application/x-www-form-urlencoded",body:Array.from(e).map(t=>t.map(encodeURIComponent).join("=")).join("&")}:{contentType:"text/plain",body:String(e)}}function D(e){let t=/:([^/]+)/g,n=B(e).replace(t,"{$1}"),s=[],r=null;for(;(r=t.exec(e))!==null;)s.push(r[1]);return{path:n,params:s}}function B(e){return e.replace(/\/+/gi,"/")}function x(e,t){try{return e()}catch(n){return t(n),null}}var F=require("lodash"),j="content-type";function G(e,t,n){let s=[];e.on("data",r=>s.push(r)),e.on("end",async()=>{if(e.method==="GET")return n();if(e.headers[j]==="application/json"){let r=Buffer.concat(s);try{r.length&&(e.body=JSON.parse(r.toString("utf-8")))}catch{return b(t,400,"Invalid JSON")}return n()}else if(e.headers[j]?.startsWith("multipart/form-data")){let r=(0,v.default)({}),[a,p]=await r.parse(e),c={};for(let[d,u=[]]of Object.entries(a))c[d]??=[],c[d]?.push(...u);for(let[d,u=[]]of Object.entries(p)){c[d]??=[];let T=u.map(m=>{let o=k.readFileSync(m.filepath),l=new Uint8Array(o),R=new File([l],m.originalFilename||m.newFilename,{type:m.mimetype||""});return k.rmSync(m.filepath),R});c[d]?.push(...T)}let i=[];for(let[d,u=[]]of Object.entries(c))u.length>1&&i.push({field:d,message:"Duplicate keys"});return i.length?b(t,400,JSON.stringify(i.map(({field:d,message:u})=>({in:d,result:u})))):(e.body=(0,F.mapValues)(c,d=>d[0]),n())}else if(e.headers[j]==="application/x-www-form-urlencoded"){let r=Buffer.concat(s).toString("utf-8"),a=new URLSearchParams(r),p=[];return Array.from(a.keys()).reduce((c,i)=>(c.has(i)?p.push(i):c.add(i),c),new Set),p.length?b(t,400,JSON.stringify(p.map(c=>({in:c,result:"Duplicate keys"})))):(e.body=Object.fromEntries(a),n())}else return e.headers[j]==="application/octet-stream"?(e.body=Buffer.concat(s),n()):b(t,415,`'${e.headers[j]}' content type is not supported`)}),e.on("error",r=>{b(t,500,String(r))})}function ne(e,t,n){n?.cors&&e.use((0,U.default)(typeof n.cors=="boolean"?{}:n.cors)),e.use(G),console.log(`[server]: Registering ${Object.keys(t).length} endpoints...`);let s=new Set;for(let[r,a]of Object.entries(t)){let[p="",...c]=r.split(":"),i=c.join(":");if(s.has(a.operationId))throw new Error(`Duplicate operation ID "${a.operationId}" for path ${i}`);if(s.add(a.operationId),!$.some(d=>d===p))throw new Error(`Invalid method "${p}" for path ${i}`);console.log(`[register]: ${a.operationId} -> ${p.toUpperCase()} ${i}`),e[p](i,async(d,u)=>{let T={};try{let m=M(d,a);if(a.security?.length)for(let g of a.security)await g.inner.handler(m,T);let o=await a.handler(m,T),l=o instanceof h&&o.payload.status?a.responses[o.payload.status]||a.responses.default:a.responses[p==="post"?201:200]||a.responses.default;if(!l||typeof l=="boolean")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${o?.status??"default"}`),new Error("Internal server error");try{l.parse(o instanceof h?o.payload.body:o)}catch(g){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(g)),new Error("Internal server error")}let R=o instanceof h?o.payload.headers:void 0,N=o instanceof h?o.payload.status:void 0,Z=o instanceof h?o.payload.body:o;if(o instanceof h&&o.payload.body instanceof J.Readable)return u.header(o.payload.headers),o.payload.body.pipe(u);{let g=q(Z),C=N??(p==="post"?201:200);return g?u.contentType(g.contentType).status(C).header(R).send(g.body):u.header(R).end()}}catch(m){return re(m,u)}})}n?.docs&&se(e,n.docs.path,n.docs.specUrl),oe(e)}function re(e,t){e instanceof S?t.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof O?t.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([n,s])=>({in:n,result:s}))}):e instanceof Error?(console.error(String(e)),t.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),t.status(500).send({statusCode:500,message:String(e)}))}function se(e,t,n){e.get(t,(s,r)=>{r.contentType("html").send(V.readFileSync("dist/index.html"))}),e.get("/openapi.json",(s,r)=>{r.contentType("json").send(V.readFileSync(n))})}function oe(e){e.all("*",(t,n)=>{b(n,404,`Cannot find ${t.method.toUpperCase()} ${t.path}`)})}var z=require("@anatine/zod-openapi"),f=require("lodash"),y=require("zod");var I="ApiError",ae=y.z.object({statusCode:y.z.number().int().min(100).max(599),message:y.z.union([y.z.object({}),y.z.any().array(),y.z.string()])}),ze=y.z.object({statusCode:y.z.number().int().min(100).max(599),message:y.z.union([y.z.object({}),y.z.any().array(),y.z.string()])});function ie(e){let t={},n={};for(let[s,r]of Object.entries(e.paths)){let[a,...p]=s.split(/:/),{path:c,params:i}=D(p.join(":")),d=[],u=t[c]??{};if(r.parameters)for(let[o,l]of Object.entries(r.parameters)){let{properties:R={},required:N=[]}=(0,z.generateSchema)(l);for(let[Z,g]of Object.entries(R)){let{description:C,..._}=g;d.push({name:Z,in:o,description:C,required:N.includes(Z)||void 0,schema:_})}}let T=`${(0,f.upperFirst)(r.operationId)}RequestBody`;if(r.requestBody){let o=(0,z.generateSchema)(r.requestBody);n[T]=r.requestBodyType==="multipart/form-data"?pe(o):o}let m=`${(0,f.upperFirst)(r.operationId)}Response`;if(r.responses)for(let[o,l]of Object.entries(r.responses))typeof l=="object"&&(n[m]=(0,z.generateSchema)(l));u[a]={tags:r.tags?.length?Object.values(r.tags).map(o=>o.name):void 0,summary:r.summary||r.operationId,description:r.description,operationId:r.operationId,deprecated:r.deprecated,parameters:(0,f.isEmpty)(d)?void 0:d,security:r.security?.map(o=>({[o.inner.name]:[]})),requestBody:r.requestBody?{description:"[DUMMY]",content:E(r.requestBodyType||"application/json",T)}:void 0,responses:{...(0,f.mapValues)(r.responses,o=>({description:"[DUMMY]",content:typeof o=="boolean"?E("application/json",I):E("application/json",m)})),400:r.requestBody||!(0,f.isEmpty)(r.parameters)?{description:"Misformed data in a sending request",content:E("application/json",I)}:void 0,401:r.security?.length?{description:"Unauthorized",content:E("application/json",I)}:void 0,500:{description:"Server unhandled or runtime error that may occur",content:E("application/json",I)}}},t[c]=u}return{openapi:e.openapi,info:e.info,paths:t,components:{schemas:{...n,[I]:(0,z.generateSchema)(ae)},securitySchemes:e.security?.length?(0,f.mapValues)((0,f.keyBy)(e.security.map(s=>s.inner),"name"),({handler:s,name:r,...a})=>a):void 0},tags:e.tags&&!(0,f.isEmpty)(e.tags)?Object.values(e.tags):void 0}}function E(e,t){return{[e]:{schema:{$ref:`#/components/schemas/${t}`}}}}function pe(e){return{type:e.type,properties:(0,f.mapValues)(e.properties,t=>t.nullable?{type:"string",format:"binary"}:t)}}var P=require("lodash");function ce(e,t){let n=[],s=[];for(let r of t){let a=Object.keys(r).map(p=>B(`${e}${p}`));s.push(...(0,P.intersection)(n,a)),n.push(...a)}if(s.length)throw new Error(`Duplicated keys occured: ${s.join(", ")}`);return(0,P.mapKeys)(Object.assign({},...t),(r,a)=>B(a.replace(/:/,`:${e}`)))}function de(e,t){return(0,P.mapValues)(e,n=>({...t,...n}))}var $=["get","post","put","patch","delete"];function ue(e){return e}var h=class{constructor(t){this.payload=t}},L=class{constructor(t){this.inner=t}use(t,n){return this}},S=class extends Error{constructor(n,s){super(s);this.status=n;this.msg=s}},O=class extends Error{constructor(n){super(JSON.stringify(n));this.msg=n}};0&&(module.exports={ApiError,HttpResponse,METHODS,Security,ValidationError,applyGroupConfig,buildJson,endpoint,initExpress,mergeEndpointGroups});
//# sourceMappingURL=index.js.map