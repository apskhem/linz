"use strict";var se=Object.create;var z=Object.defineProperty;var oe=Object.getOwnPropertyDescriptor;var ae=Object.getOwnPropertyNames;var ie=Object.getPrototypeOf,pe=Object.prototype.hasOwnProperty;var ce=(e,t)=>{for(var r in t)z(e,r,{get:t[r],enumerable:!0})},q=(e,t,r,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of ae(t))!pe.call(e,n)&&n!==r&&z(e,n,{get:()=>t[n],enumerable:!(s=oe(t,n))||s.enumerable});return e};var G=(e,t,r)=>(r=e!=null?se(ie(e)):{},q(t||!e||!e.__esModule?z(r,"default",{value:e,enumerable:!0}):r,e)),de=e=>q(z({},"__esModule",{value:!0}),e);var Ae={};ce(Ae,{ApiError:()=>j,FormDataBody:()=>A,HttpResponse:()=>P,JsonBody:()=>C,METHODS:()=>V,OctetStreamBody:()=>k,Security:()=>w,UrlEncodedBody:()=>L,ValidationError:()=>O,applyGroupConfig:()=>xe,buildJson:()=>Oe,endpoint:()=>ue,initExpress:()=>ye,mergeEndpointGroups:()=>Pe});module.exports=de(Ae);var V=["get","post","put","patch","delete"];function ue(e){return e}var P=class{constructor(t){this.payload=t}},w=class{constructor(t){this.inner=t}use(t,r){return this}},j=class extends Error{constructor(r,s){super(s);this.status=r;this.msg=s}},O=class extends Error{constructor(r){super(JSON.stringify(r));this.msg=r}},x=class{},C=class extends x{constructor(r){super();this.body=r}mimeType(){return"application/json"}},A=class extends x{constructor(r,s){super();this.body=r;this.encoding=s}mimeType(){return"multipart/form-data"}},L=class extends x{constructor(r){super();this.body=r}mimeType(){return"application/x-www-form-urlencoded"}},k=class extends x{constructor(r){super();this.body=r}mimeType(){return"application/octet-stream"}};var X=require("stream"),ee=G(require("cors"));var M=`<!doctype html>
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
</html>`;var W=require("lodash");function J(e,t){let r="",s=0,n=[],o=[],p=[],d={};for(let a=0;a<e.length;a++){let i=e[a]??NaN,u=a>0?e[a-1]??null:null,g=i===10&&u===13;if(i===10||i===13||(r+=String.fromCharCode(i)),s===0&&g)`--${t}`===r&&(s=1),r="";else if(s===1&&g)r.length?p.push(r):(d=Object.fromEntries(p.flatMap(f=>{let[m,T=""]=f.split(":");return m?.trim()?[[m.trim().toLocaleLowerCase(),T?.trim()]]:[]})),s=2,n=[]),r="";else if(s===2){if(r.length>t.length+4&&(r=""),`--${t}`===r){let f=n.length-r.length,m=n.slice(0,f-1);o.push(le({headers:d,part:m})),n=[],p=[],d={},r="",s=3}else n.push(i);g&&(r="")}else s===3&&g&&(s=1)}return o}function F(e){let t=e.split(";");for(let r of t){let s=String(r).trim();if(s.startsWith("boundary")){let n=s.split("=");return String(n[1]).trim().replace(/^["']|["']$/g,"")}}return null}function le(e){let[,t,r]=e.headers["content-disposition"]?.split(";")??[],s={headers:e.headers,name:t?.split("=")[1]?.replace(/"/g,""),data:Buffer.from(e.part)};if(r){let[n,o]=r.split("=").map(p=>p.trim());Object.assign(s,{...n&&o&&{[n]:JSON.parse(o)},type:e.headers["content-type"]?.split(":")[1]?.trim()})}return s}function K(e,t){let r={},s=B(()=>t.requestBody?.body.parse(e.body)||e.body,a=>r.body=JSON.parse(a.message)),n=B(()=>t.parameters?.query?.parse(e.query)||e.query,a=>r.queries=JSON.parse(a.message)),o=B(()=>t.parameters?.path?.parse(e.params)||e.params,a=>r.params=JSON.parse(a.message)),p=B(()=>t.parameters?.header?.parse(e.headers)||e.headers,a=>r.headers=JSON.parse(a.message)),d=B(()=>t.parameters?.cookie?.parse(e.cookies)||e.cookies,a=>r.cookies=JSON.parse(a.message));if(Object.keys(r).length)throw new O(r);return{body:s??null,queries:n??{},params:o??{},headers:p??{},cookies:d??{}}}function b(e,t,r,s){typeof s=="string"&&console.error(s?`[error:${s}]: ${r}`:`[error]: ${r}`),e.status(t).contentType("application/json").send({statusCode:t,message:r})}function U(e){return typeof e>"u"?null:typeof e=="string"||typeof e=="number"||typeof e=="boolean"?{contentType:"text/plain",body:String(e)}:Array.isArray(e)||typeof e=="object"||e===null?{contentType:"application/json",body:JSON.stringify(e)}:Buffer.isBuffer(e)?{contentType:"application/octet-stream",body:e}:e instanceof URLSearchParams?{contentType:"application/x-www-form-urlencoded",body:Array.from(e).map(t=>t.map(encodeURIComponent).join("=")).join("&")}:{contentType:"text/plain",body:String(e)}}function Q(e){let t=/:([^/]+)/g,r=Z(e).replace(t,"{$1}"),s=[],n=null;for(;(n=t.exec(e))!==null;)s.push(n[1]);return{path:r,params:s}}function Z(e){return e.replace(/\/+/gi,"/")}function B(e,t){try{return e()}catch(r){return t(r),null}}var N="content-type";function Y(e,t,r){let s=[];e.on("data",n=>s.push(n)),e.on("end",async()=>{if(e.method==="GET")return r();if(e.headers[N]==="application/json"){let n=Buffer.concat(s);try{n.length&&(e.body=JSON.parse(n.toString("utf-8")))}catch{return b(t,400,"Invalid JSON")}return r()}else if(e.headers[N]?.startsWith("multipart/form-data")){let n=Buffer.concat(s),o=F(e.headers["content-type"]);if(!o)return b(t,400,"Cannot find multipart boundary");let p=J(n,o),d={};for(let i of p){if(!i.name)continue;let u=i.filename?new File([i.data],i.filename,i.type?{type:i.type}:{}):i.data.toString("utf-8");(d[i.name]??=[]).push(u)}let a=[];for(let[i,u=[]]of Object.entries(d))u.length>1&&a.push({field:i,message:"Duplicated key"});return a.length?b(t,400,JSON.stringify({in:"body",result:a.map(({field:i,message:u})=>({path:[i],message:u}))})):(e.body=(0,W.mapValues)(d,i=>i[0]),r())}else if(e.headers[N]==="application/x-www-form-urlencoded"){let n=Buffer.concat(s).toString("utf-8"),o=new URLSearchParams(n),p=[];return Array.from(o.keys()).reduce((d,a)=>(d.has(a)&&p.push(a),d.add(a)),new Set),p.length?b(t,400,JSON.stringify({in:"body",result:p.map(d=>({path:[d],message:"Duplicated key"}))})):(e.body=Object.fromEntries(o),r())}else return e.headers[N]==="application/octet-stream"?(e.body=Buffer.concat(s),r()):b(t,415,`'${e.headers[N]}' content type is not supported`)}),e.on("error",n=>{b(t,500,String(n))})}function ye(e,t,r){r?.cors&&e.use((0,ee.default)(typeof r.cors=="boolean"?{}:r.cors)),e.use(Y),console.log(`[server]: Registering ${Object.keys(t).length} endpoints...`);let s=new Set;for(let[n,o]of Object.entries(t)){let[p="",...d]=n.split(":"),a=d.join(":");if(s.has(o.operationId))throw new Error(`Duplicate operation ID "${o.operationId}" for path ${a}`);if(s.add(o.operationId),!V.some(i=>i===p))throw new Error(`Invalid method "${p}" for path ${a}`);console.log(`[register]: ${o.operationId} -> ${p.toUpperCase()} ${a}`),e[p](a,async(i,u)=>{let g={};try{let c=K(i,o);if(o.security?.length)for(let h of o.security)await h.inner.handler(c,g);let f=await o.handler(c,g),m=f instanceof P?f:new P({body:f}),T=m.payload.status??(p==="post"?201:200),R=o.responses[T]||o.responses.default;if(!R||typeof R=="boolean"||typeof R=="string")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${T}/default`),new Error("Internal server error");try{R.parse(m.payload.body)}catch(h){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(h)),new Error("Internal server error")}if(m.payload.body instanceof X.Readable)u.header(m.payload.headers),m.payload.body.pipe(u);else{let h=U(m.payload.body);h?u.contentType(h.contentType).status(T).header(m.payload.headers).send(h.body):u.header(m.payload.headers).end()}}catch(c){fe(c,u)}})}r?.docs&&ge(e,r.docs),he(e)}function fe(e,t){e instanceof j?t.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof O?t.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([r,s])=>({in:r,result:s}))}):e instanceof Error?(console.error(String(e)),t.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),t.status(500).send({statusCode:500,message:String(e)}))}function ge(e,t){e.get(t.docsPath,(r,s)=>{s.contentType("html").send(M.replace("{{title}}",t.spec.info.title).replace("{{specUrl}}",t.specPath))}),e.get(t.specPath,(r,s)=>{s.contentType("json").send(JSON.stringify(t.spec,null,2))})}function he(e){e.all("*",(t,r)=>{b(r,404,`Cannot find ${t.method.toUpperCase()} ${t.path}`)})}var E=require("@anatine/zod-openapi"),_=G(require("http-status")),y=require("lodash"),l=require("zod");var D="GeneralApiError",te="ValidationError",be=l.z.object({code:l.z.string(),expected:l.z.string(),received:l.z.string(),path:l.z.string().array(),message:l.z.string()}),Te=l.z.object({in:l.z.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:l.z.array(be).describe("An array of error items")}),re=l.z.object({statusCode:l.z.number().int().min(100).max(599).describe("The HTTP response status code"),message:l.z.string().describe("The message associated with the error")}).describe("A general HTTP error response"),Re=re.extend({message:l.z.union([l.z.array(Te).describe("An array of error schemas detailing validation issues"),l.z.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function Oe(e){let t={},r={};for(let[s,n]of Object.entries(e.paths)){let[o,...p]=s.split(":"),{path:d}=Q(p.join(":")),a=[],i=t[d]??{};if(n.parameters)for(let[c,f]of Object.entries(n.parameters)){let{properties:m={},required:T=[]}=(0,E.generateSchema)(f);for(let[R,h]of Object.entries(m)){let{description:$,...ne}=h,v=T.includes(R);a.push({name:R,in:c,...$&&{description:$},...v&&{required:v},schema:ne})}}let u=`${(0,y.upperFirst)(n.operationId)}RequestBody`;if(n.requestBody){let c=(0,E.generateSchema)(n.requestBody.body);r[u]=n.requestBody instanceof A?Ee(c):c}let g=`${(0,y.upperFirst)(n.operationId)}Response`;if(n.responses)for(let[,c]of Object.entries(n.responses))typeof c=="object"&&(r[g]=(0,E.generateSchema)(c));i[o]={...n.tags?.length&&{tags:Object.values(n.tags).map(c=>c.name)},summary:n.summary||n.operationId,...n.description&&{description:n.description},operationId:n.operationId,...n.deprecated&&{deprecated:n.deprecated},...!(0,y.isEmpty)(a)&&{parameters:a},...n.security?.length&&{security:n.security.map(c=>({[c.inner.name]:[]}))},...n.requestBody&&{requestBody:{content:S(n.requestBody.mimeType(),u,n.requestBody instanceof A?n.requestBody.encoding:void 0),required:!n.requestBody.body.isOptional()}},responses:{...(0,y.mapValues)(n.responses,(c,f)=>({description:(typeof c=="string"?String(c):null)||_.default[`${f}`].toString()||"No description",content:typeof c=="boolean"||typeof c=="string"?S("application/json",D):S("application/json",g)})),...(n.requestBody||!(0,y.isEmpty)(n.parameters))&&{400:{description:H(n.responses,400)||"Misformed data in a sending request",content:S("application/json",te)}},...n.security?.length&&{401:{description:H(n.responses,401)||_.default[401],content:S("application/json",D)}},500:{description:H(n.responses,500)||"Server unhandled or runtime error that may occur",content:S("application/json",D)}}},t[d]=i}return{openapi:e.openapi,info:e.info,paths:t,components:{schemas:{...r,[D]:(0,E.generateSchema)(re),[te]:(0,E.generateSchema)(Re)},...e.security?.length&&{securitySchemes:(0,y.mapValues)((0,y.keyBy)(e.security.map(s=>s.inner),"name"),({handler:s,name:n,...o})=>o)}},...e.tags&&!(0,y.isEmpty)(e.tags)&&{tags:Object.values(e.tags)}}}function S(e,t,r){return{[e]:{schema:{$ref:`#/components/schemas/${t}`},...r&&{encoding:(0,y.mapValues)(r,s=>({...s,...s.contentType&&{contentType:s.contentType.join(", ")},...s.headers&&{headers:(0,E.generateSchema)(s.headers).properties}}))}}}}function Ee(e){return{type:e.type,properties:(0,y.mapValues)(e.properties,t=>"nullable"in t&&t.nullable?{type:"string",format:"binary"}:t)}}function H(e,t){let r=e[t];return typeof r=="string"?String(r):null}var I=require("lodash");function Pe(e,t){let r=[],s=[];for(let n of t){let o=Object.keys(n).map(p=>Z(`${e}${p}`));s.push(...(0,I.intersection)(r,o)),r.push(...o)}if(s.length)throw new Error(`Duplicated keys occured: ${s.join(", ")}`);return(0,I.mapKeys)(Object.assign({},...t),(n,o)=>Z(o.replace(/:/,`:${e}`)))}function xe(e,t){return(0,I.mapValues)(e,r=>Object.assign(r,t))}0&&(module.exports={ApiError,FormDataBody,HttpResponse,JsonBody,METHODS,OctetStreamBody,Security,UrlEncodedBody,ValidationError,applyGroupConfig,buildJson,endpoint,initExpress,mergeEndpointGroups});
//# sourceMappingURL=index.js.map