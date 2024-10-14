"use strict";var de=Object.create;var D=Object.defineProperty;var ce=Object.getOwnPropertyDescriptor;var ue=Object.getOwnPropertyNames;var me=Object.getPrototypeOf,le=Object.prototype.hasOwnProperty;var ye=(e,t)=>{for(var r in t)D(e,r,{get:t[r],enumerable:!0})},K=(e,t,r,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of ue(t))!le.call(e,n)&&n!==r&&D(e,n,{get:()=>t[n],enumerable:!(s=ce(t,n))||s.enumerable});return e};var V=(e,t,r)=>(r=e!=null?de(me(e)):{},K(t||!e||!e.__esModule?D(r,"default",{value:e,enumerable:!0}):r,e)),fe=e=>K(D({},"__esModule",{value:!0}),e);var je={};ye(je,{ApiError:()=>N,FormDataBody:()=>A,HttpResponse:()=>S,JsonBody:()=>T,METHODS:()=>$,OctetStreamBody:()=>v,Security:()=>H,UrlEncodedBody:()=>j,ValidationError:()=>O,applyGroupConfig:()=>Ne,buildJson:()=>Ae,endpoint:()=>ge,initExpress:()=>be,mergeEndpointGroups:()=>Be});module.exports=fe(je);var U=V(require("zod")),$=["get","post","put","patch","delete"];function ge(e){return{...e,...e.requestBody&&!(e.requestBody instanceof x)&&{requestBody:new T(e.requestBody)}}}var S=class{constructor(t){this.payload=t}},H=class{constructor(t){this.inner=t}use(t,r){return this}},N=class extends Error{constructor(r,s){super(s);this.status=r;this.msg=s}},O=class extends Error{constructor(r){super(JSON.stringify(r));this.msg=r}},x=class{constructor(){this._description=null;this._headers=null;this._examples=null}describe(t){return this._description=t,this}get description(){return this._description}requireHeaders(t){return this._headers=t,this}get requiredHeaders(){return this._headers}setExamples(t){return this._examples=t,this}getExamples(){return this._examples}},Z=class Z extends x{constructor(r){super();this.body=r}get mimeType(){return Z.mimeType}};Z.mimeType="application/json";var T=Z,q=class q extends x{constructor(r,s){super();this.body=r;this.encoding=s}get mimeType(){return q.mimeType}};q.mimeType="multipart/form-data";var A=q,C=class C extends x{constructor(r,s){super();this.body=r;this.encoding=s}get mimeType(){return C.mimeType}};C.mimeType="application/x-www-form-urlencoded";var j=C,L=class L extends x{constructor(r=U.default.instanceof(Buffer)){super();this.body=r}get mimeType(){return L.mimeType}};L.mimeType="application/octet-stream";var v=L;var se=require("stream"),oe=V(require("cors"));var Q=`<!doctype html>
<html>
  <head>
    <title>{{title}}</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="{{specUrl}}"></script>
    <script>
      var configuration = {
        theme: 'purple',
      }

      document.getElementById('api-reference').dataset.configuration =
        JSON.stringify(configuration)
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;var re=require("lodash");function W(e,t){let r="",s=0,n=[],o=[],d=[],u={};for(let a=0;a<e.length;a++){let i=e[a]??NaN,m=a>0?e[a-1]??null:null,g=i===10&&m===13;if(i===10||i===13||(r+=String.fromCharCode(i)),s===0&&g)`--${t}`===r&&(s=1),r="";else if(s===1&&g)r.length?d.push(r):(u=Object.fromEntries(d.flatMap(f=>{let[y,R=""]=f.split(":");return y?.trim()?[[y.trim().toLocaleLowerCase(),R?.trim()]]:[]})),s=2,n=[]),r="";else if(s===2){if(r.length>t.length+4&&(r=""),`--${t}`===r){let f=n.length-r.length,y=n.slice(0,f-1);o.push(he({headers:u,part:y})),n=[],d=[],u={},r="",s=3}else n.push(i);g&&(r="")}else s===3&&g&&(s=1)}return o}function Y(e){let t=e.split(";");for(let r of t){let s=String(r).trim();if(s.startsWith("boundary")){let n=s.split("=");return String(n[1]).trim().replace(/^["']|["']$/g,"")}}return null}function he(e){let[,t,r]=e.headers["content-disposition"]?.split(";")??[],s={headers:e.headers,name:t?.split("=")[1]?.replace(/"/g,""),data:Buffer.from(e.part)};if(r){let[n,o]=r.split("=").map(d=>d.trim());Object.assign(s,{...n&&o&&{[n]:JSON.parse(o)},type:e.headers["content-type"]?.split(":")[1]?.trim()})}return s}function X(e,t){let r={},s=z(()=>t.requestBody?.body.parse(e.body)||e.body,a=>r.body=JSON.parse(a.message)),n=z(()=>t.parameters?.query?.parse(e.query)||e.query,a=>r.queries=JSON.parse(a.message)),o=z(()=>t.parameters?.path?.parse(e.params)||e.params,a=>r.params=JSON.parse(a.message)),d=z(()=>t.parameters?.header?.parse(e.headers)||e.headers,a=>r.headers=JSON.parse(a.message)),u=z(()=>t.parameters?.cookie?.parse(e.cookies)||e.cookies,a=>r.cookies=JSON.parse(a.message));if(Object.keys(r).length)throw new O(r);return{body:s??null,queries:n??{},params:o??{},headers:d??{},cookies:u??{}}}function b(e,t,r,s){typeof s=="string"&&console.error(s?`[error:${s}]: ${r}`:`[error]: ${r}`),e.status(t).contentType("application/json").send({statusCode:t,message:r})}function ee(e){return typeof e>"u"?null:typeof e=="string"||typeof e=="number"||typeof e=="boolean"?{contentType:"text/plain",body:String(e)}:Array.isArray(e)||typeof e=="object"||e===null?{contentType:"application/json",body:JSON.stringify(e)}:Buffer.isBuffer(e)?{contentType:"application/octet-stream",body:e}:e instanceof URLSearchParams?{contentType:"application/x-www-form-urlencoded",body:Array.from(e).map(t=>t.map(encodeURIComponent).join("=")).join("&")}:{contentType:"text/plain",body:String(e)}}function te(e){let t=/:([^/]+)/g,r=_(e).replace(t,"{$1}"),s=[],n=null;for(;(n=t.exec(e))!==null;)s.push(n[1]);return{path:r,params:s}}function _(e){return e.replace(/\/+/gi,"/")}function z(e,t){try{return e()}catch(r){return t(r),null}}var w="content-type";function ne(e,t,r){let s=[];e.on("data",n=>s.push(n)),e.on("end",async()=>{if(e.method==="GET")return r();if(e.headers[w]==="application/json"){let n=Buffer.concat(s);try{n.length&&(e.body=JSON.parse(n.toString("utf-8")))}catch{return b(t,400,"Invalid JSON")}return r()}else if(e.headers[w]?.startsWith("multipart/form-data")){let n=Buffer.concat(s),o=Y(e.headers["content-type"]);if(!o)return b(t,400,"Cannot find multipart boundary");let d=W(n,o),u={};for(let i of d){if(!i.name)continue;let m=i.filename?new File([i.data],i.filename,i.type?{type:i.type}:{}):i.data.toString("utf-8");(u[i.name]??=[]).push(m)}let a=[];for(let[i,m=[]]of Object.entries(u))m.length>1&&a.push({field:i,message:"Duplicated key"});return a.length?b(t,400,JSON.stringify({in:"body",result:a.map(({field:i,message:m})=>({path:[i],message:m}))})):(e.body=(0,re.mapValues)(u,i=>i[0]),r())}else if(e.headers[w]==="application/x-www-form-urlencoded"){let n=Buffer.concat(s).toString("utf-8"),o=new URLSearchParams(n),d=[];return Array.from(o.keys()).reduce((u,a)=>(u.has(a)&&d.push(a),u.add(a)),new Set),d.length?b(t,400,JSON.stringify({in:"body",result:d.map(u=>({path:[u],message:"Duplicated key"}))})):(e.body=Object.fromEntries(o),r())}else return e.headers[w]==="application/octet-stream"?(e.body=Buffer.concat(s),r()):b(t,415,`'${e.headers[w]}' content type is not supported`)}),e.on("error",n=>{b(t,500,String(n))})}function be(e,t,r){r?.cors&&e.use((0,oe.default)(typeof r.cors=="boolean"?{}:r.cors)),e.use(ne),console.log(`[server]: Registering ${Object.keys(t).length} endpoints...`);let s=new Set;for(let[n,o]of Object.entries(t)){let[d="",...u]=n.split(":"),a=u.join(":");if(s.has(o.operationId))throw new Error(`Duplicate operation ID "${o.operationId}" for path ${a}`);if(s.add(o.operationId),!$.some(i=>i===d))throw new Error(`Invalid method "${d}" for path ${a}`);console.log(`[register]: ${o.operationId} -> ${d.toUpperCase()} ${a}`),e[d](a,async(i,m)=>{let g={};try{let p=X(i,o);if(o.security?.length)for(let h of o.security)await h.inner.handler(p,g);let f=await o.handler(p,g),y=f instanceof S?f:new S({body:f}),R=y.payload.status??(d==="post"?201:200),E=o.responses[R]||o.responses.default;if(!E||typeof E=="boolean"||typeof E=="string")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${R}/default`),new Error("Internal server error");try{E.parse(y.payload.body)}catch(h){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(h)),new Error("Internal server error")}if(y.payload.body instanceof se.Readable)m.header(y.payload.headers),y.payload.body.pipe(m);else{let h=ee(y.payload.body);h?m.contentType(h.contentType).status(R).header(y.payload.headers).send(h.body):m.header(y.payload.headers).end()}}catch(p){Re(p,m)}})}r?.docs&&Ee(e,r.docs),Oe(e)}function Re(e,t){e instanceof N?t.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof O?t.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([r,s])=>({in:r,result:s}))}):e instanceof Error?(console.error(String(e)),t.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),t.status(500).send({statusCode:500,message:String(e)}))}function Ee(e,t){e.get(t.docsPath,(r,s)=>{s.contentType("html").send(Q.replace("{{title}}",t.spec.info.title).replace("{{specUrl}}",t.specPath))}),e.get(t.specPath,(r,s)=>{s.contentType("json").send(JSON.stringify(t.spec,null,2))})}function Oe(e){e.all("*",(t,r)=>{b(r,404,`Cannot find ${t.method.toUpperCase()} ${t.path}`)})}var P=require("@anatine/zod-openapi"),M=V(require("http-status")),l=require("lodash"),c=require("zod");var k="GeneralApiError",ae="ValidationError",xe=c.z.object({code:c.z.string(),expected:c.z.string(),received:c.z.string(),path:c.z.string().array(),message:c.z.string()}),Pe=c.z.object({in:c.z.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:c.z.array(xe).describe("An array of error items")}),ie=c.z.object({statusCode:c.z.number().int().min(100).max(599).describe("The HTTP response status code"),message:c.z.string().describe("The message associated with the error")}).describe("A general HTTP error response"),Se=ie.extend({message:c.z.union([c.z.array(Pe).describe("An array of error schemas detailing validation issues"),c.z.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function Ae(e){let t={},r={};for(let[s,n]of Object.entries(e.paths)){let[o,...d]=s.split(":"),{path:u}=te(d.join(":")),a=[],i=t[u]??{};for(let[p,f]of Object.entries(n.parameters??{})){let{properties:y={},required:R=[]}=(0,P.generateSchema)(f);for(let[E,h]of Object.entries(y)){if("$ref"in h)continue;let{description:J,...pe}=h,F=R.includes(E);a.push({name:E,in:p,...J&&{description:J},...F&&{required:F},schema:pe})}}let m=`${(0,l.upperFirst)(n.operationId)}RequestBody`;if(n.requestBody&&n.requestBody.body._def.typeName!==c.z.ZodVoid.name){let p=(0,P.generateSchema)(n.requestBody.body);r[m]=n.requestBody instanceof A?Ie(p):p}let g=`${(0,l.upperFirst)(n.operationId)}Response`;for(let[,p]of Object.entries(n.responses??{}))typeof p=="object"&&p._def.typeName!==c.z.ZodVoid.name&&(r[g]=(0,P.generateSchema)(p));i[o]={...n.tags?.length&&{tags:Object.values(n.tags).map(p=>p.name)},summary:n.summary||n.operationId,...n.description&&{description:n.description},operationId:n.operationId,...n.deprecated&&{deprecated:n.deprecated},...!(0,l.isEmpty)(a)&&{parameters:a},...n.security?.length&&{security:n.security.map(p=>({[p.inner.name]:[]}))},...n.requestBody&&{requestBody:{...n.requestBody.description&&{description:n.requestBody.description},content:I(n.requestBody.mimeType,m,n.requestBody.body._def.typeName===c.z.ZodVoid.name,n.requestBody instanceof A||n.requestBody instanceof j?n.requestBody.encoding:void 0),required:!n.requestBody.body.isOptional()}},responses:{...(0,l.mapValues)(n.responses,(p,f)=>({description:(typeof p=="string"?p:null)||String(M.default[`${f}`])||"No description",content:typeof p=="boolean"||typeof p=="string"?I(T.mimeType,k):I(T.mimeType,g,p?._def.typeName===c.z.ZodVoid.name)})),...(n.requestBody||!(0,l.isEmpty)(n.parameters))&&{400:{description:G(n.responses,400)||"Misformed data in a sending request",content:I(T.mimeType,ae)}},...n.security?.length&&{401:{description:G(n.responses,401)||M.default[401],content:I(T.mimeType,k)}},500:{description:G(n.responses,500)||"Server unhandled or runtime error that may occur",content:I(T.mimeType,k)}}},t[u]=i}return{openapi:e.openapi,info:e.info,paths:t,components:{schemas:{...r,[k]:(0,P.generateSchema)(ie),[ae]:(0,P.generateSchema)(Se)},...e.security?.length&&{securitySchemes:(0,l.mapValues)((0,l.keyBy)(e.security.map(s=>s.inner),"name"),s=>(0,l.omit)(s,["handler","name"]))}},...e.tags&&!(0,l.isEmpty)(e.tags)&&{tags:Object.values(e.tags)}}}function I(e,t,r,s){return r?{[e]:{}}:{[e]:{schema:{$ref:`#/components/schemas/${t}`},...s&&{encoding:(0,l.mapValues)(s,n=>({...n,...n.contentType&&{contentType:n.contentType.join(", ")},...n.headers&&{headers:(0,P.generateSchema)(n.headers).properties}}))}}}}function Ie(e){return{type:e.type,properties:(0,l.mapValues)(e.properties,t=>"nullable"in t&&t.nullable&&Object.keys(t).length===1?{type:"string",format:"binary"}:t)}}function G(e,t){let r=e[t];return typeof r=="string"?r:null}var B=require("lodash");function Be(e,t){let r=[],s=[];for(let n of t){let o=Object.keys(n).map(d=>_(`${e}${d}`));s.push(...(0,B.intersection)(r,o)),r.push(...o)}if(s.length)throw new Error(`Duplicated keys occured: ${s.join(", ")}`);return(0,B.mapKeys)(Object.assign({},...t),(n,o)=>_(o.replace(/:/,`:${e}`)))}function Ne(e,t){return(0,B.mapValues)(e,r=>Object.assign(r,t))}0&&(module.exports={ApiError,FormDataBody,HttpResponse,JsonBody,METHODS,OctetStreamBody,Security,UrlEncodedBody,ValidationError,applyGroupConfig,buildJson,endpoint,initExpress,mergeEndpointGroups});
//# sourceMappingURL=index.js.map