import{mapValues as he}from"radash";import _ from"zod";import{randomBytes as ye}from"crypto";function Q(e,r){let t="",o=0,n=[],s=[],p=[],c={};for(let i=0;i<e.length;i++){let a=e[i]??NaN,m=i>0?e[i-1]??null:null,g=a===10&&m===13;if(a===10||a===13||(t+=String.fromCharCode(a)),o===0&&g)`--${r}`===t&&(o=1),t="";else if(o===1&&g)t.length?p.push(t):(c=Object.fromEntries(p.flatMap(l=>{let[h,y=""]=l.split(":");return h?.trim()?[[h.trim().toLowerCase(),y?.trim()]]:[]})),o=2,n=[]),t="";else if(o===2){if(t.length>r.length+4&&(t=""),`--${r}`===t){let l=n.length-t.length,h=n.slice(0,l-1);s.push(le({headers:c,part:h})),n=[],p=[],c={},t="",o=3}else n.push(a);g&&(t="")}else o===3&&g&&(o=1)}return s}function X(e){let r=e.split(";");for(let t of r){let o=String(t).trim();if(o.startsWith("boundary")){let n=o.split("=");return String(n[1]).trim().replace(/^["']|["']$/g,"")}}return null}function le(e){let r=fe(e.headers["content-disposition"]??"");return{headers:e.headers,name:r.name,data:Buffer.from(e.part),...r.filename&&{filename:r.filename,type:e.headers["content-type"]?.trim()}}}function fe(e){let r={type:null,name:null,filename:null},t=e.split(";").map(o=>o.trim());t[0]&&(r.type=t[0].toLowerCase());for(let o of t.slice(1)){let[n,s]=o.split("=").map(p=>p.trim());n&&s&&(r[n.toLowerCase()]=s.replace(/^"|"$/g,""))}return r}function V(e="----------------------"){return`--${e}${ye(12).toString("hex")}`}async function Y(e,r=V()){let t=[];for(let[o,n]of Object.entries(e))for(let s of n)t.push(Buffer.from(`--${r}`)),typeof s=="string"?t.push(Buffer.from(`Content-Disposition: form-data; name="${o}"\r
\r
`),Buffer.from(s),Buffer.from(`\r
`)):s instanceof File&&t.push(Buffer.from(`Content-Disposition: form-data; name="${o}"; filename="${s.name}"\r
`),Buffer.from(`Content-Type: ${s.type||"application/octet-stream"}\r
\r
`),Buffer.from(await s.arrayBuffer()),Buffer.from(`\r
`));return t.push(Buffer.from(`--${r}--\r
`)),Buffer.concat(t)}var ne=["get","post","put","patch","delete"];function ve(e){return{...e,...e.requestBody&&!(e.requestBody instanceof E)&&{requestBody:new T(e.requestBody)},responses:Object.fromEntries(Object.entries(e.responses).map(([r,t])=>[r,t instanceof _.ZodType?new T(t):t]))}}var A=class e{constructor(r){this.payload=r}static withoutBody(r,t){return t?new e({headers:t,status:r}):new e({status:r})}},ee=class{constructor(r){this.inner=r}use(r,t){return this}},j=class extends Error{constructor(t,o){super(o);this.status=t;this.msg=o}},S=class extends Error{constructor(t){super(JSON.stringify(t));this.msg=t}},E=class{constructor(){this._description=null;this._headers=null;this._examples=null}describe(r){return this._description=r,this}get description(){return this._description}requireHeaders(r){return this._headers=r,this}get requiredHeaders(){return this._headers}setExamples(r){return this._examples=r,this}getExamples(){return this._examples}},N=class N extends E{constructor(t){super();this.body=t}async serialize(t){return Buffer.from(JSON.stringify(t))}get mimeType(){return N.mimeType}};N.mimeType="application/json";var T=N,I=class I extends E{constructor(t,o){super();this.body=t;this.encoding=o}async serialize(t){return(await this.serializeWithContentType(t))[1]}async serializeWithContentType(t){let o=V();return[`${I.mimeType}; boundary=${o}`,await Y(he(t,n=>[n instanceof File?n:String(n)]),o)]}get mimeType(){return I.mimeType}};I.mimeType="multipart/form-data";var B=I,C=class C extends E{constructor(t,o){super();this.body=t;this.encoding=o}async serialize(t){return Buffer.from(new URLSearchParams(t instanceof URLSearchParams?t:Object.fromEntries(Object.entries(t).map(([o,n])=>[o,String(n)]))).toString())}get mimeType(){return C.mimeType}};C.mimeType="application/x-www-form-urlencoded";var w=C,D=class D extends E{constructor(t=_.instanceof(Buffer)){super();this.body=t}async serialize(t){return t}get mimeType(){return D.mimeType}};D.mimeType="application/octet-stream";var te=D,Z=class Z extends E{constructor(t=_.string()){super();this.body=t}async serialize(t){return Buffer.from(t)}get mimeType(){return Z.mimeType}};Z.mimeType="text/plain";var M=Z,L=class L extends M{get mimeType(){return L.mimeType}};L.mimeType="text/html";var re=L;import*as de from"fs";import{Readable as Te}from"stream";import*as G from"url";import Re from"cors";import{match as Oe}from"path-to-regexp";var oe=`<!doctype html>
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
</html>`;import{mapValues as be}from"radash";function se(e,r){let t={},o=z(()=>r.requestBody?.body.parse(e.body)||e.body,i=>t.body=JSON.parse(i.message)),n=z(()=>r.parameters?.query?.parse(e.query)||e.query,i=>t.queries=JSON.parse(i.message)),s=z(()=>r.parameters?.path?.parse(e.params)||e.params,i=>t.params=JSON.parse(i.message)),p=z(()=>r.parameters?.header?.parse(e.headers)||e.headers,i=>t.headers=JSON.parse(i.message)),c=z(()=>r.parameters?.cookie?.parse(e.cookies)||e.cookies,i=>t.cookies=JSON.parse(i.message));if(Object.keys(t).length)throw new S(t);return{body:o??null,queries:n??{},params:s??{},headers:p??{},cookies:c??{}}}function R(e,r,t,o){typeof o=="string"&&console.error(o?`[error:${o}]: ${t}`:`[error]: ${t}`),e.writeHead(r,{"content-type":"application/json"}).end(JSON.stringify({statusCode:r,message:t}))}function ie(e){let r=/:([^/]+)/g,t=H(e).replace(r,"{$1}"),o=[],n=null;for(;(n=r.exec(e))!==null;)o.push(n[1]);return{path:t,params:o}}function H(e){return e.replace(/\/+/gi,"/")}function z(e,r){try{return e()}catch(t){return r(t),null}}function ae(e,r,t){let o=[];e.on("data",n=>o.push(n)),e.on("end",async()=>{if(e.method==="GET"||!o.length)return t();if(e.headers["content-type"]==="application/json"){let n=Buffer.concat(o);try{n.length&&Object.assign(e,{body:JSON.parse(n.toString("utf-8"))})}catch{return R(r,400,"Invalid JSON")}return t()}else if(e.headers["content-type"]?.startsWith("multipart/form-data")){let n=Buffer.concat(o),s=X(e.headers["content-type"]);if(!s)return R(r,400,"Cannot find multipart boundary");let p=Q(n,s),c={};for(let a of p){if(!a.name)continue;let m=a.filename?new File([a.data],a.filename,a.type?{type:a.type}:{}):a.data.toString("utf-8");(c[a.name]??=[]).push(m)}let i=[];for(let[a,m=[]]of Object.entries(c))m.length>1&&i.push({field:a,message:"Duplicated key"});return i.length?R(r,400,JSON.stringify({in:"body",result:i.map(({field:a,message:m})=>({path:[a],message:m}))})):(Object.assign(e,{body:be(c,a=>a[0])}),t())}else if(e.headers["content-type"]==="application/x-www-form-urlencoded"){let n=Buffer.concat(o).toString("utf-8"),s=new URLSearchParams(n),p=[];return Array.from(s.keys()).reduce((c,i)=>(c.has(i)&&p.push(i),c.add(i)),new Set),p.length?R(r,400,JSON.stringify({in:"body",result:p.map(c=>({path:[c],message:"Duplicated key"}))})):(Object.assign(e,{body:Object.fromEntries(s)}),t())}else return e.headers["content-type"]==="application/octet-stream"?(Object.assign(e,{body:Buffer.concat(o)}),t()):R(r,415,`'${e.headers["content-type"]}' content type is not supported`)}),e.on("error",n=>{R(r,500,String(n))})}function pe(e=""){return e.split(";").reduce((r,t)=>{let[o,...n]=t.trim().split("=");return o&&(r[o]=decodeURIComponent(n.join("="))),r},{})}var v={"content-type":"application/json"};function Ye(e,r,t){t?.cors&&e.use(Re(typeof t.cors=="boolean"?{}:t.cors)),e.use(ae),console.log(`[server]: Registering ${Object.keys(r).length} endpoints...`);let o=new Set;for(let[n,s]of Object.entries(r)){let[p="",...c]=n.split(":"),i=c.join(":");if(o.has(s.operationId))throw new Error(`Duplicate operation ID "${s.operationId}" for path ${i}`);if(o.add(s.operationId),!ne.some(a=>a===p))throw new Error(`Invalid method "${p}" for path ${i}`);console.log(`[register]: ${s.operationId} -> ${p.toUpperCase()} ${i}`),e[p](i,async(a,m)=>{let g=G.parse(a.url||"",!0);Object.assign(a,{query:g.query,params:Oe(i)(g.pathname||""),cookies:pe(a.headers.cookie)});let d={};try{let l=se(a,s);if(s.security?.length)for(let O of s.security)await O.inner.handler(l,d);let h=await s.handler(l,d),y=h instanceof A?h:new A({body:h}),b=y.payload.status??(p==="post"?201:200),f=s.responses[b]||s.responses.default;if(!f||typeof f=="boolean"||typeof f=="string")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${b}/default`),new Error("Internal server error");try{f.body.parse(y.payload.body)}catch(O){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(O)),new Error("Internal server error")}if(y.payload.body instanceof Te||y.payload.body instanceof de.ReadStream)m.writeHead(b,y.payload.headers),y.payload.body.pipe(m);else if(typeof y.payload.body>"u")m.writeHead(b,y.payload.headers).end();else if(f instanceof B){let[O,q]=await f.serializeWithContentType(y.payload.body);m.writeHead(b,{"content-type":O,...y.payload.headers}).end(q)}else m.writeHead(b,{"content-type":f.mimeType,...y.payload.headers}).end(await f.serialize(y.payload.body))}catch(l){Ee(l,m)}})}t?.docs&&Be(e,t.docs),e.use((n,s)=>{let{pathname:p}=G.parse(n.url||"",!0);R(s,404,`Cannot find ${n.method} ${p}`)})}function Ee(e,r){e instanceof j?r.writeHead(e.status,v).end(JSON.stringify({statusCode:e.status,message:e.message})):e instanceof S?r.writeHead(400,v).end(JSON.stringify({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([t,o])=>({in:t,result:o}))})):e instanceof Error?(console.error(String(e)),r.writeHead(500,v).end(JSON.stringify({statusCode:500,message:e.message}))):(console.error(String(e)),r.writeHead(500,v).end(JSON.stringify({statusCode:500,message:String(e)})))}function Be(e,r){e.get(r.docsPath,(t,o)=>{o.writeHead(200,{"content-type":"text/html"}).end(oe.replace("{{title}}",r.spec.info.title).replace("{{specUrl}}",r.specPath))}),e.get(r.specPath,(t,o)=>{o.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify(r.spec))})}import{generateSchema as P}from"@anatine/zod-openapi";import ce from"http-status";import{pascal as J,title as F,isEmpty as K,mapValues as k,objectify as Pe,omit as Se,shake as xe,mapEntries as Ie}from"radash";import{z as u}from"zod";var $="GeneralApiError",ue="ValidationError",Ae=u.object({code:u.string(),expected:u.string(),received:u.string(),path:u.string().array(),message:u.string()}),ze=u.object({in:u.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:u.array(Ae).describe("An array of error items")}),me=u.object({statusCode:u.number().int().min(100).max(599).describe("The HTTP response status code"),message:u.string().describe("The message associated with the error")}).describe("A general HTTP error response"),je=me.extend({message:u.union([u.array(ze).describe("An array of error schemas detailing validation issues"),u.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function ct(e){let r={},t={};for(let[o,n]of Object.entries(e.paths)){let[s,...p]=o.split(":"),{path:c}=ie(p.join(":")),i=[],a=r[c]??{};for(let[d,l]of Object.entries(n.parameters??{})){let{properties:h={},required:y=[]}=P(l);for(let[b,f]of Object.entries(h)){if("$ref"in f)continue;let{description:O,...q}=f,W=y.includes(b);i.push({name:b,in:d,...O&&{description:O},...W&&{required:W},schema:q})}}let m=`${J(F(n.operationId))}RequestBody`;if(n.requestBody&&n.requestBody.body._def.typeName!==u.ZodVoid.name){let d=P(n.requestBody.body);t[m]=n.requestBody instanceof B?we(d):d}let g=`${J(F(n.operationId))}Response`;for(let[,d]of Object.entries(n.responses??{}))typeof d=="object"&&d.body._def.typeName!==u.ZodVoid.name&&(t[g]=P(d.body));a[s]={...n.tags?.length&&{tags:Object.values(n.tags).map(d=>d.name)},summary:n.summary||n.operationId,...n.description&&{description:n.description},operationId:n.operationId,...n.deprecated&&{deprecated:n.deprecated},...!K(i)&&{parameters:i},...n.security?.length&&{security:n.security.map(d=>({[d.inner.name]:[]}))},...n.requestBody&&{requestBody:{...n.requestBody.description&&{description:n.requestBody.description},content:x(n.requestBody.mimeType,m,n.requestBody.body._def.typeName===u.ZodVoid.name,n.requestBody instanceof B||n.requestBody instanceof w?n.requestBody.encoding:void 0),required:!n.requestBody.body.isOptional()}},responses:{...k(xe(n.responses),(d,l)=>({description:(typeof d=="string"?d:null)||String(ce[`${l}`])||"No description",content:typeof d=="boolean"||typeof d=="string"?x(T.mimeType,$):x(d.mimeType,g,d.body._def.typeName===u.ZodVoid.name)})),...(n.requestBody||!K(n.parameters))&&{400:{description:U(n.responses,400)||"Misformed data in a sending request",content:x(T.mimeType,ue)}},...n.security?.length&&{401:{description:U(n.responses,401)||ce[401],content:x(T.mimeType,$)}},500:{description:U(n.responses,500)||"Server unhandled or runtime error that may occur",content:x(T.mimeType,$)}}},r[c]=a}return{openapi:e.openapi,info:e.info,paths:r,components:{schemas:{...t,[$]:P(me),[ue]:P(je),...Ie(e.additionalSchemas??{},(o,n)=>[J(F(o)),P(n)])},...e.security?.length&&{securitySchemes:k(Pe(e.security.map(o=>o.inner),o=>o.name),o=>Se(o,["handler","name"]))}},...e.tags&&!K(e.tags)&&{tags:Object.values(e.tags)}}}function x(e,r,t,o){return t?{[e]:{}}:{[e]:{schema:{$ref:`#/components/schemas/${r}`},...o&&{encoding:k(o,n=>({...n,...n.contentType&&{contentType:n.contentType.join(", ")},...n.headers&&{headers:P(n.headers).properties}}))}}}}function we(e){return{type:e.type,properties:k(e.properties??{},r=>"nullable"in r&&r.nullable&&Object.keys(r).length===1?{type:"string",format:"binary"}:r)}}function U(e,r){let t=e[r];return typeof t=="string"?t:null}import{mapKeys as Ne,mapValues as Ce}from"radash";function lt(e,r){let t=[],o=[];for(let n of r){let s=Object.keys(n).map(p=>H(`${e}${p}`));o.push(...t.filter(p=>s.includes(p))),t.push(...s)}if(o.length)throw new Error(`Duplicated keys occured: ${o.join(", ")}`);return Ne(Object.assign({},...r),n=>H(n.replace(/:/,`:${e}`)))}function ft(e,r){return Ce(e,t=>Object.assign(t,r))}export{j as ApiError,B as FormDataBody,re as HtmlBody,A as HttpResponse,T as JsonBody,ne as METHODS,te as OctetStreamBody,ee as Security,M as TextBody,w as UrlEncodedBody,S as ValidationError,ft as applyGroupConfig,ct as buildJson,Ye as createApi,ve as endpoint,lt as mergeEndpointGroups};
//# sourceMappingURL=index.mjs.map