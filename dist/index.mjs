import{randomBytes as ie}from"crypto";function G(e,r){let t="",s=0,n=[],o=[],p=[],m={};for(let a=0;a<e.length;a++){let u=e[a]??NaN,l=a>0?e[a-1]??null:null,f=u===10&&l===13;if(u===10||u===13||(t+=String.fromCharCode(u)),s===0&&f)`--${r}`===t&&(s=1),t="";else if(s===1&&f)t.length?p.push(t):(m=Object.fromEntries(p.flatMap(y=>{let[c,T=""]=y.split(":");return c?.trim()?[[c.trim().toLocaleLowerCase(),T?.trim()]]:[]})),s=2,n=[]),t="";else if(s===2){if(t.length>r.length+4&&(t=""),`--${r}`===t){let y=n.length-t.length,c=n.slice(0,y-1);o.push(pe({headers:m,part:c})),n=[],p=[],m={},t="",s=3}else n.push(u);f&&(t="")}else s===3&&f&&(s=1)}return o}function F(e){let r=e.split(";");for(let t of r){let s=String(t).trim();if(s.startsWith("boundary")){let n=s.split("=");return String(n[1]).trim().replace(/^["']|["']$/g,"")}}return null}function pe(e){let[,r,t]=e.headers["content-disposition"]?.split(";")??[],s={headers:e.headers,name:r?.split("=")[1]?.replace(/"/g,""),data:Buffer.from(e.part)};if(t){let[n,o]=t.split("=").map(p=>p.trim());Object.assign(s,{...n&&o&&{[n]:JSON.parse(o)},type:e.headers["content-type"]?.split(":")[1]?.trim()})}return s}function de(e="----------------------"){return`--${e}${ie(12).toString("hex")}`}async function J(e,r=de()){let t=[];for(let[s,n]of Object.entries(e))for(let o of n)t.push(Buffer.from(`--${r}`)),typeof o=="string"?t.push(Buffer.from(`Content-Disposition: form-data; name="${s}"\r
\r
`),Buffer.from(o),Buffer.from(`\r
`)):o instanceof File&&t.push(Buffer.from(`Content-Disposition: form-data; name="${s}"; filename="${o.name}"\r
`),Buffer.from(`Content-Type: ${o.type||"application/octet-stream"}\r
\r
`),Buffer.from(await o.arrayBuffer()),Buffer.from(`\r
`));return t.push(Buffer.from(`--${r}--\r
`)),Buffer.concat(t)}import{mapValues as V}from"lodash";import $ from"zod";var W=["get","post","put","patch","delete"];function Ne(e){return{...e,...e.requestBody&&!(e.requestBody instanceof b)&&{requestBody:new h(e.requestBody)},responses:V(e.responses,r=>r instanceof $.ZodType?new h(r):r)}}var P=class{constructor(r){this.payload=r}},K=class{constructor(r){this.inner=r}use(r,t){return this}},I=class extends Error{constructor(t,s){super(s);this.status=t;this.msg=s}},O=class extends Error{constructor(t){super(JSON.stringify(t));this.msg=t}},b=class{constructor(){this._description=null;this._headers=null;this._examples=null}describe(r){return this._description=r,this}get description(){return this._description}requireHeaders(r){return this._headers=r,this}get requiredHeaders(){return this._headers}setExamples(r){return this._examples=r,this}getExamples(){return this._examples}},j=class j extends b{constructor(t){super();this.body=t}async serialize(t){return Buffer.from(JSON.stringify(t))}get mimeType(){return j.mimeType}};j.mimeType="application/json";var h=j,Z=class Z extends b{constructor(t,s){super();this.body=t;this.encoding=s}async serialize(t){return J(V(t,s=>s.map(n=>n instanceof File?n:String(n))))}get mimeType(){return Z.mimeType}};Z.mimeType="multipart/form-data";var S=Z,D=class D extends b{constructor(t,s){super();this.body=t;this.encoding=s}async serialize(t){return Buffer.from(new URLSearchParams(t instanceof URLSearchParams?t:V(t,s=>String(s))).toString())}get mimeType(){return D.mimeType}};D.mimeType="application/x-www-form-urlencoded";var N=D,C=class C extends b{constructor(t=$.instanceof(Buffer)){super();this.body=t}async serialize(t){return t}get mimeType(){return C.mimeType}};C.mimeType="application/octet-stream";var U=C,w=class w extends b{constructor(t=$.string()){super();this.body=t}async serialize(t){return Buffer.from(t)}get mimeType(){return w.mimeType}};w.mimeType="text/plain";var Q=w;import{Readable as ue}from"stream";import me from"cors";var Y=`<!doctype html>
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
</html>`;function X(e,r){let t={},s=A(()=>r.requestBody?.body.parse(e.body)||e.body,a=>t.body=JSON.parse(a.message)),n=A(()=>r.parameters?.query?.parse(e.query)||e.query,a=>t.queries=JSON.parse(a.message)),o=A(()=>r.parameters?.path?.parse(e.params)||e.params,a=>t.params=JSON.parse(a.message)),p=A(()=>r.parameters?.header?.parse(e.headers)||e.headers,a=>t.headers=JSON.parse(a.message)),m=A(()=>r.parameters?.cookie?.parse(e.cookies)||e.cookies,a=>t.cookies=JSON.parse(a.message));if(Object.keys(t).length)throw new O(t);return{body:s??null,queries:n??{},params:o??{},headers:p??{},cookies:m??{}}}function R(e,r,t,s){typeof s=="string"&&console.error(s?`[error:${s}]: ${t}`:`[error]: ${t}`),e.status(r).contentType("application/json").send({statusCode:r,message:t})}function ee(e){let r=/:([^/]+)/g,t=L(e).replace(r,"{$1}"),s=[],n=null;for(;(n=r.exec(e))!==null;)s.push(n[1]);return{path:t,params:s}}function L(e){return e.replace(/\/+/gi,"/")}function A(e,r){try{return e()}catch(t){return r(t),null}}var z="content-type";function te(e,r,t){let s=[];e.on("data",n=>s.push(n)),e.on("end",async()=>{if(e.method==="GET")return t();if(e.headers[z]==="application/json"){let n=Buffer.concat(s);try{n.length&&(e.body=JSON.parse(n.toString("utf-8")))}catch{return R(r,400,"Invalid JSON")}return t()}else if(e.headers[z]?.startsWith("multipart/form-data")){let n=Buffer.concat(s),o=F(e.headers["content-type"]);if(!o)return R(r,400,"Cannot find multipart boundary");let p=G(n,o),m={};for(let a of p){if(!a.name)continue;let u=a.filename?new File([a.data],a.filename,a.type?{type:a.type}:{}):a.data.toString("utf-8");(m[a.name]??=[]).push(u)}return e.body=m,t()}else if(e.headers[z]==="application/x-www-form-urlencoded"){let n=Buffer.concat(s).toString("utf-8"),o=new URLSearchParams(n);return e.body=Object.fromEntries(Array.from(o.keys()).map(p=>[p,o.getAll(p)])),t()}else return e.headers[z]==="application/octet-stream"?(e.body=Buffer.concat(s),t()):R(r,415,`'${e.headers[z]}' content type is not supported`)}),e.on("error",n=>{R(r,500,String(n))})}function ve(e,r,t){t?.cors&&e.use(me(typeof t.cors=="boolean"?{}:t.cors)),e.use(te),console.log(`[server]: Registering ${Object.keys(r).length} endpoints...`);let s=new Set;for(let[n,o]of Object.entries(r)){let[p="",...m]=n.split(":"),a=m.join(":");if(s.has(o.operationId))throw new Error(`Duplicate operation ID "${o.operationId}" for path ${a}`);if(s.add(o.operationId),!W.some(u=>u===p))throw new Error(`Invalid method "${p}" for path ${a}`);console.log(`[register]: ${o.operationId} -> ${p.toUpperCase()} ${a}`),e[p](a,async(u,l)=>{let f={};try{let i=X(u,o);if(o.security?.length)for(let E of o.security)await E.inner.handler(i,f);let y=await o.handler(i,f),c=y instanceof P?y:new P({body:y}),T=c.payload.status??(p==="post"?201:200),g=o.responses[T]||o.responses.default;if(!g||typeof g=="boolean"||typeof g=="string")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${T}/default`),new Error("Internal server error");try{g.body.parse(c.payload.body)}catch(E){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(E)),new Error("Internal server error")}c.payload.body instanceof ue?(l.header(c.payload.headers),c.payload.body.pipe(l)):typeof c.payload.body>"u"?l.header(c.payload.headers).status(T).end():l.contentType(g.mimeType).header(c.payload.headers).status(T).send(g.serialize(c.payload.body))}catch(i){ye(i,l)}})}t?.docs&&le(e,t.docs),fe(e)}function ye(e,r){e instanceof I?r.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof O?r.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([t,s])=>({in:t,result:s}))}):e instanceof Error?(console.error(String(e)),r.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),r.status(500).send({statusCode:500,message:String(e)}))}function le(e,r){e.get(r.docsPath,(t,s)=>{s.contentType("html").send(Y.replace("{{title}}",r.spec.info.title).replace("{{specUrl}}",r.specPath))}),e.get(r.specPath,(t,s)=>{s.contentType("json").send(JSON.stringify(r.spec,null,2))})}function fe(e){e.all("*",(r,t)=>{R(t,404,`Cannot find ${r.method.toUpperCase()} ${r.path}`)})}import{generateSchema as x}from"@anatine/zod-openapi";import re from"http-status";import{isEmpty as k,keyBy as ge,mapValues as _,omit as he,pickBy as Te,upperFirst as ne}from"lodash";import{z as d}from"zod";var q="GeneralApiError",se="ValidationError",be=d.object({code:d.string(),expected:d.string(),received:d.string(),path:d.string().array(),message:d.string()}),Re=d.object({in:d.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:d.array(be).describe("An array of error items")}),oe=d.object({statusCode:d.number().int().min(100).max(599).describe("The HTTP response status code"),message:d.string().describe("The message associated with the error")}).describe("A general HTTP error response"),Ee=oe.extend({message:d.union([d.array(Re).describe("An array of error schemas detailing validation issues"),d.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function et(e){let r={},t={};for(let[s,n]of Object.entries(e.paths)){let[o,...p]=s.split(":"),{path:m}=ee(p.join(":")),a=[],u=r[m]??{};for(let[i,y]of Object.entries(n.parameters??{})){let{properties:c={},required:T=[]}=x(y);for(let[g,E]of Object.entries(c)){if("$ref"in E)continue;let{description:v,...ae}=E,M=T.includes(g);a.push({name:g,in:i,...v&&{description:v},...M&&{required:M},schema:ae})}}let l=`${ne(n.operationId)}RequestBody`;if(n.requestBody&&n.requestBody.body._def.typeName!==d.ZodVoid.name){let i=x(n.requestBody.body);t[l]=n.requestBody instanceof S?Oe(i):i}let f=`${ne(n.operationId)}Response`;for(let[,i]of Object.entries(n.responses??{}))typeof i=="object"&&i.body._def.typeName!==d.ZodVoid.name&&(t[f]=x(i.body));u[o]={...n.tags?.length&&{tags:Object.values(n.tags).map(i=>i.name)},summary:n.summary||n.operationId,...n.description&&{description:n.description},operationId:n.operationId,...n.deprecated&&{deprecated:n.deprecated},...!k(a)&&{parameters:a},...n.security?.length&&{security:n.security.map(i=>({[i.inner.name]:[]}))},...n.requestBody&&{requestBody:{...n.requestBody.description&&{description:n.requestBody.description},content:B(n.requestBody.mimeType,l,n.requestBody.body._def.typeName===d.ZodVoid.name,n.requestBody instanceof S||n.requestBody instanceof N?n.requestBody.encoding:void 0),required:!n.requestBody.body.isOptional()}},responses:{..._(Te(n.responses,i=>typeof i<"u"),(i,y)=>({description:(typeof i=="string"?i:null)||String(re[`${y}`])||"No description",content:typeof i=="boolean"||typeof i=="string"?B(h.mimeType,q):B(i.mimeType,f,i.body._def.typeName===d.ZodVoid.name)})),...(n.requestBody||!k(n.parameters))&&{400:{description:H(n.responses,400)||"Misformed data in a sending request",content:B(h.mimeType,se)}},...n.security?.length&&{401:{description:H(n.responses,401)||re[401],content:B(h.mimeType,q)}},500:{description:H(n.responses,500)||"Server unhandled or runtime error that may occur",content:B(h.mimeType,q)}}},r[m]=u}return{openapi:e.openapi,info:e.info,paths:r,components:{schemas:{...t,[q]:x(oe),[se]:x(Ee)},...e.security?.length&&{securitySchemes:_(ge(e.security.map(s=>s.inner),"name"),s=>he(s,["handler","name"]))}},...e.tags&&!k(e.tags)&&{tags:Object.values(e.tags)}}}function B(e,r,t,s){return t?{[e]:{}}:{[e]:{schema:{$ref:`#/components/schemas/${r}`},...s&&{encoding:_(s,n=>({...n,...n.contentType&&{contentType:n.contentType.join(", ")},...n.headers&&{headers:x(n.headers).properties}}))}}}}function Oe(e){return{type:e.type,properties:_(e.properties,r=>"nullable"in r&&r.nullable&&Object.keys(r).length===1?{type:"string",format:"binary"}:r)}}function H(e,r){let t=e[r];return typeof t=="string"?t:null}import{intersection as Be,mapKeys as xe,mapValues as Pe}from"lodash";function st(e,r){let t=[],s=[];for(let n of r){let o=Object.keys(n).map(p=>L(`${e}${p}`));s.push(...Be(t,o)),t.push(...o)}if(s.length)throw new Error(`Duplicated keys occured: ${s.join(", ")}`);return xe(Object.assign({},...r),(n,o)=>L(o.replace(/:/,`:${e}`)))}function ot(e,r){return Pe(e,t=>Object.assign(t,r))}export{I as ApiError,S as FormDataBody,P as HttpResponse,h as JsonBody,W as METHODS,U as OctetStreamBody,K as Security,Q as TextBody,N as UrlEncodedBody,O as ValidationError,ot as applyGroupConfig,et as buildJson,Ne as endpoint,ve as initExpress,st as mergeEndpointGroups};
//# sourceMappingURL=index.mjs.map