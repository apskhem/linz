"use strict";var Y=Object.create;var z=Object.defineProperty;var X=Object.getOwnPropertyDescriptor;var ee=Object.getOwnPropertyNames;var te=Object.getPrototypeOf,re=Object.prototype.hasOwnProperty;var ne=(e,t)=>{for(var r in t)z(e,r,{get:t[r],enumerable:!0})},v=(e,t,r,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of ee(t))!re.call(e,n)&&n!==r&&z(e,n,{get:()=>t[n],enumerable:!(s=X(t,n))||s.enumerable});return e};var Z=(e,t,r)=>(r=e!=null?Y(te(e)):{},v(t||!e||!e.__esModule?z(r,"default",{value:e,enumerable:!0}):r,e)),se=e=>v(z({},"__esModule",{value:!0}),e);var he={};ne(he,{ApiError:()=>j,HttpResponse:()=>b,METHODS:()=>V,Security:()=>C,ValidationError:()=>T,applyGroupConfig:()=>ge,buildJson:()=>ye,endpoint:()=>oe,initExpress:()=>ae,mergeEndpointGroups:()=>fe});module.exports=se(he);var V=["get","post","put","patch","delete"];function oe(e){return e}var b=class{constructor(t){this.payload=t}},C=class{constructor(t){this.inner=t}use(t,r){return this}},j=class extends Error{constructor(r,s){super(s);this.status=r;this.msg=s}},T=class extends Error{constructor(r){super(JSON.stringify(r));this.msg=r}};var F=require("stream"),U=Z(require("cors"));var D=`<!doctype html>
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
</html>`;var G=require("lodash"),N=Z(require("parse-multipart-data"));function H(e,t){let r={},s=I(()=>t.requestBody?.parse(e.body)||e.body,a=>r.body=JSON.parse(a.message)),n=I(()=>t.parameters?.query?.parse(e.query)||e.query,a=>r.queries=JSON.parse(a.message)),o=I(()=>t.parameters?.path?.parse(e.params)||e.params,a=>r.params=JSON.parse(a.message)),c=I(()=>t.parameters?.header?.parse(e.headers)||e.headers,a=>r.headers=JSON.parse(a.message)),u=I(()=>t.parameters?.cookie?.parse(e.cookies)||e.cookies,a=>r.cookies=JSON.parse(a.message));if(Object.keys(r).length)throw new T(r);return{body:s??null,queries:n??{},params:o??{},headers:c??{},cookies:u??{}}}function g(e,t,r,s){typeof s=="string"&&console.error(s?`[error:${s}]: ${r}`:`[error]: ${r}`),e.status(t).contentType("application/json").send({statusCode:t,message:r})}function M(e){return typeof e>"u"?null:typeof e=="string"||typeof e=="number"||typeof e=="boolean"?{contentType:"text/plain",body:String(e)}:Array.isArray(e)||typeof e=="object"||e===null?{contentType:"application/json",body:JSON.stringify(e)}:Buffer.isBuffer(e)?{contentType:"application/octet-stream",body:e}:e instanceof URLSearchParams?{contentType:"application/x-www-form-urlencoded",body:Array.from(e).map(t=>t.map(encodeURIComponent).join("=")).join("&")}:{contentType:"text/plain",body:String(e)}}function _(e){let t=/:([^/]+)/g,r=B(e).replace(t,"{$1}"),s=[],n=null;for(;(n=t.exec(e))!==null;)s.push(n[1]);return{path:r,params:s}}function B(e){return e.replace(/\/+/gi,"/")}function I(e,t){try{return e()}catch(r){return t(r),null}}var A="content-type";function J(e,t,r){let s=[];e.on("data",n=>s.push(n)),e.on("end",async()=>{if(e.method==="GET")return r();if(e.headers[A]==="application/json"){let n=Buffer.concat(s);try{n.length&&(e.body=JSON.parse(n.toString("utf-8")))}catch{return g(t,400,"Invalid JSON")}return r()}else if(e.headers[A]?.startsWith("multipart/form-data")){let n=Buffer.concat(s),o=N.getBoundary(e.headers["content-type"]),c=N.parse(n,o),u={};for(let p of c){if(!p.name)continue;let m=p.filename?new File([p.data],p.filename,{type:p.type}):p.data.toString("utf-8");(u[p.name]??=[]).push(m)}let a=[];for(let[p,m=[]]of Object.entries(u))m.length>1&&a.push({field:p,message:"Duplicated key"});return a.length?g(t,400,JSON.stringify({in:"body",result:a.map(({field:p,message:m})=>({path:[p],message:m}))})):(e.body=(0,G.mapValues)(u,p=>p[0]),r())}else if(e.headers[A]==="application/x-www-form-urlencoded"){let n=Buffer.concat(s).toString("utf-8"),o=new URLSearchParams(n),c=[];return Array.from(o.keys()).reduce((u,a)=>(u.has(a)&&c.push(a),u.add(a)),new Set),c.length?g(t,400,JSON.stringify({in:"body",result:c.map(u=>({path:[u],message:"Duplicated key"}))})):(e.body=Object.fromEntries(o),r())}else return e.headers[A]==="application/octet-stream"?(e.body=Buffer.concat(s),r()):g(t,415,`'${e.headers[A]}' content type is not supported`)}),e.on("error",n=>{g(t,500,String(n))})}function ae(e,t,r){r?.cors&&e.use((0,U.default)(typeof r.cors=="boolean"?{}:r.cors)),e.use(J),console.log(`[server]: Registering ${Object.keys(t).length} endpoints...`);let s=new Set;for(let[n,o]of Object.entries(t)){let[c="",...u]=n.split(":"),a=u.join(":");if(s.has(o.operationId))throw new Error(`Duplicate operation ID "${o.operationId}" for path ${a}`);if(s.add(o.operationId),!V.some(p=>p===c))throw new Error(`Invalid method "${c}" for path ${a}`);console.log(`[register]: ${o.operationId} -> ${c.toUpperCase()} ${a}`),e[c](a,async(p,m)=>{let S={};try{let i=H(p,o);if(o.security?.length)for(let f of o.security)await f.inner.handler(i,S);let h=await o.handler(i,S),l=h instanceof b?h:new b({body:h}),x=l.payload.status??(c==="post"?201:200),O=o.responses[x]||o.responses.default;if(!O||typeof O=="boolean"||typeof O=="string")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${x}/default`),new Error("Internal server error");try{O.parse(l.payload.body)}catch(f){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(f)),new Error("Internal server error")}if(l.payload.body instanceof F.Readable)m.header(l.payload.headers),l.payload.body.pipe(m);else{let f=M(l.payload.body);f?m.contentType(f.contentType).status(x).header(l.payload.headers).send(f.body):m.header(l.payload.headers).end()}}catch(i){ie(i,m)}})}r?.docs&&pe(e,r.docs),ce(e)}function ie(e,t){e instanceof j?t.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof T?t.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([r,s])=>({in:r,result:s}))}):e instanceof Error?(console.error(String(e)),t.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),t.status(500).send({statusCode:500,message:String(e)}))}function pe(e,t){e.get(t.docsPath,(r,s)=>{s.contentType("html").send(D.replace("{{title}}",t.spec.info.title).replace("{{specUrl}}",t.specPath))}),e.get(t.specPath,(r,s)=>{s.contentType("json").send(JSON.stringify(t.spec,null,2))})}function ce(e){e.all("*",(t,r)=>{g(r,404,`Cannot find ${t.method.toUpperCase()} ${t.path}`)})}var E=require("@anatine/zod-openapi"),k=Z(require("http-status")),y=require("lodash"),d=require("zod");var w="GeneralApiError",K="ValidationError",de=d.z.object({code:d.z.string(),expected:d.z.string(),received:d.z.string(),path:d.z.string().array(),message:d.z.string()}),ue=d.z.object({in:d.z.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:d.z.array(de).describe("An array of error items")}),Q=d.z.object({statusCode:d.z.number().int().min(100).max(599).describe("The HTTP response status code"),message:d.z.string().describe("The message associated with the error")}).describe("A general HTTP error response"),me=Q.extend({message:d.z.union([d.z.array(ue).describe("An array of error schemas detailing validation issues"),d.z.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function ye(e){let t={},r={};for(let[s,n]of Object.entries(e.paths)){let[o,...c]=s.split(":"),{path:u}=_(c.join(":")),a=[],p=t[u]??{};if(n.parameters)for(let[i,h]of Object.entries(n.parameters)){let{properties:l={},required:x=[]}=(0,E.generateSchema)(h);for(let[O,f]of Object.entries(l)){let{description:$,...W}=f,q=x.includes(O);a.push({name:O,in:i,...$&&{description:$},...q&&{required:q},schema:W})}}let m=`${(0,y.upperFirst)(n.operationId)}RequestBody`;if(n.requestBody){let i=(0,E.generateSchema)(n.requestBody);r[m]=n.requestBodyType==="multipart/form-data"?le(i):i}let S=`${(0,y.upperFirst)(n.operationId)}Response`;if(n.responses)for(let[,i]of Object.entries(n.responses))typeof i=="object"&&(r[S]=(0,E.generateSchema)(i));p[o]={...n.tags?.length&&{tags:Object.values(n.tags).map(i=>i.name)},summary:n.summary||n.operationId,...n.description&&{description:n.description},operationId:n.operationId,...n.deprecated&&{deprecated:n.deprecated},...!(0,y.isEmpty)(a)&&{parameters:a},...n.security?.length&&{security:n.security.map(i=>({[i.inner.name]:[]}))},...n.requestBody&&{requestBody:{content:R(n.requestBodyType||"application/json",m),required:!n.requestBody.isOptional()}},responses:{...(0,y.mapValues)(n.responses,(i,h)=>({description:(typeof i=="string"?String(i):null)||k.default[`${h}`].toString()||"No description",content:typeof i=="boolean"||typeof i=="string"?R("application/json",w):R("application/json",S)})),...(n.requestBody||!(0,y.isEmpty)(n.parameters))&&{400:{description:L(n.responses,400)||"Misformed data in a sending request",content:R("application/json",K)}},...n.security?.length&&{401:{description:L(n.responses,401)||k.default[401],content:R("application/json",w)}},500:{description:L(n.responses,500)||"Server unhandled or runtime error that may occur",content:R("application/json",w)}}},t[u]=p}return{openapi:e.openapi,info:e.info,paths:t,components:{schemas:{...r,[w]:(0,E.generateSchema)(Q),[K]:(0,E.generateSchema)(me)},...e.security?.length&&{securitySchemes:(0,y.mapValues)((0,y.keyBy)(e.security.map(s=>s.inner),"name"),({handler:s,name:n,...o})=>o)}},...e.tags&&!(0,y.isEmpty)(e.tags)&&{tags:Object.values(e.tags)}}}function R(e,t){return{[e]:{schema:{$ref:`#/components/schemas/${t}`}}}}function le(e){return{type:e.type,properties:(0,y.mapValues)(e.properties,t=>"nullable"in t&&t.nullable?{type:"string",format:"binary"}:t)}}function L(e,t){let r=e[t];return typeof r=="string"?String(r):null}var P=require("lodash");function fe(e,t){let r=[],s=[];for(let n of t){let o=Object.keys(n).map(c=>B(`${e}${c}`));s.push(...(0,P.intersection)(r,o)),r.push(...o)}if(s.length)throw new Error(`Duplicated keys occured: ${s.join(", ")}`);return(0,P.mapKeys)(Object.assign({},...t),(n,o)=>B(o.replace(/:/,`:${e}`)))}function ge(e,t){return(0,P.mapValues)(e,r=>Object.assign(r,t))}0&&(module.exports={ApiError,HttpResponse,METHODS,Security,ValidationError,applyGroupConfig,buildJson,endpoint,initExpress,mergeEndpointGroups});
//# sourceMappingURL=index.js.map