import{mapValues as fe}from"radash";import H from"zod";import{randomBytes as ue}from"crypto";function F(e,r){let t="",s=0,n=[],o=[],p=[],c={};for(let i=0;i<e.length;i++){let a=e[i]??NaN,y=i>0?e[i-1]??null:null,g=a===10&&y===13;if(a===10||a===13||(t+=String.fromCharCode(a)),s===0&&g)`--${r}`===t&&(s=1),t="";else if(s===1&&g)t.length?p.push(t):(c=Object.fromEntries(p.flatMap(l=>{let[u,h=""]=l.split(":");return u?.trim()?[[u.trim().toLowerCase(),h?.trim()]]:[]})),s=2,n=[]),t="";else if(s===2){if(t.length>r.length+4&&(t=""),`--${r}`===t){let l=n.length-t.length,u=n.slice(0,l-1);o.push(me({headers:c,part:u})),n=[],p=[],c={},t="",s=3}else n.push(a);g&&(t="")}else s===3&&g&&(s=1)}return o}function K(e){let r=e.split(";");for(let t of r){let s=String(t).trim();if(s.startsWith("boundary")){let n=s.split("=");return String(n[1]).trim().replace(/^["']|["']$/g,"")}}return null}function me(e){let r=ye(e.headers["content-disposition"]??"");return{headers:e.headers,name:r.name,data:Buffer.from(e.part),...r.filename&&{filename:r.filename,type:e.headers["content-type"]?.trim()}}}function ye(e){let r={type:null,name:null,filename:null},t=e.split(";").map(s=>s.trim());t[0]&&(r.type=t[0].toLowerCase());for(let s of t.slice(1)){let[n,o]=s.split("=").map(p=>p.trim());n&&o&&(r[n.toLowerCase()]=o.replace(/^"|"$/g,""))}return r}function v(e="----------------------"){return`--${e}${ue(12).toString("hex")}`}async function U(e,r=v()){let t=[];for(let[s,n]of Object.entries(e))for(let o of n)t.push(Buffer.from(`--${r}`)),typeof o=="string"?t.push(Buffer.from(`Content-Disposition: form-data; name="${s}"\r
\r
`),Buffer.from(o),Buffer.from(`\r
`)):o instanceof File&&t.push(Buffer.from(`Content-Disposition: form-data; name="${s}"; filename="${o.name}"\r
`),Buffer.from(`Content-Type: ${o.type||"application/octet-stream"}\r
\r
`),Buffer.from(await o.arrayBuffer()),Buffer.from(`\r
`));return t.push(Buffer.from(`--${r}--\r
`)),Buffer.concat(t)}var X=["get","post","put","patch","delete"];function Ze(e){return{...e,...e.requestBody&&!(e.requestBody instanceof E)&&{requestBody:new T(e.requestBody)},responses:Object.fromEntries(Object.entries(e.responses).map(([r,t])=>[r,t instanceof H.ZodType?new T(t):t]))}}var z=class e{constructor(r){this.payload=r}static withoutBody(r,t){return t?new e({headers:t,status:r}):new e({status:r})}},W=class{constructor(r){this.inner=r}use(r,t){return this}},j=class extends Error{constructor(t,s){super(s);this.status=t;this.msg=s}},B=class extends Error{constructor(t){super(JSON.stringify(t));this.msg=t}},E=class{constructor(){this._description=null;this._headers=null;this._examples=null}describe(r){return this._description=r,this}get description(){return this._description}requireHeaders(r){return this._headers=r,this}get requiredHeaders(){return this._headers}setExamples(r){return this._examples=r,this}getExamples(){return this._examples}},C=class C extends E{constructor(t){super();this.body=t}async serialize(t){return Buffer.from(JSON.stringify(t))}get mimeType(){return C.mimeType}};C.mimeType="application/json";var T=C,S=class S extends E{constructor(t,s){super();this.body=t;this.encoding=s}async serialize(t){return(await this.serializeWithContentType(t))[1]}async serializeWithContentType(t){let s=v();return[`${S.mimeType}; boundary=${s}`,await U(fe(t,n=>[n instanceof File?n:String(n)]),s)]}get mimeType(){return S.mimeType}};S.mimeType="multipart/form-data";var O=S,D=class D extends E{constructor(t,s){super();this.body=t;this.encoding=s}async serialize(t){return Buffer.from(new URLSearchParams(t instanceof URLSearchParams?t:Object.fromEntries(Object.entries(t).map(([s,n])=>[s,String(n)]))).toString())}get mimeType(){return D.mimeType}};D.mimeType="application/x-www-form-urlencoded";var w=D,Z=class Z extends E{constructor(t=H.instanceof(Buffer)){super();this.body=t}async serialize(t){return t}get mimeType(){return Z.mimeType}};Z.mimeType="application/octet-stream";var Q=Z,L=class L extends E{constructor(t=H.string()){super();this.body=t}async serialize(t){return Buffer.from(t)}get mimeType(){return L.mimeType}};L.mimeType="text/plain";var _=L,q=class q extends _{get mimeType(){return q.mimeType}};q.mimeType="text/html";var Y=q;import*as se from"fs";import{Readable as he}from"stream";import Te from"cors";var ee=`<!doctype html>
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
</html>`;import{mapValues as ge}from"radash";function te(e,r){let t={},s=A(()=>r.requestBody?.body.parse(e.body)||e.body,i=>t.body=JSON.parse(i.message)),n=A(()=>r.parameters?.query?.parse(e.query)||e.query,i=>t.queries=JSON.parse(i.message)),o=A(()=>r.parameters?.path?.parse(e.params)||e.params,i=>t.params=JSON.parse(i.message)),p=A(()=>r.parameters?.header?.parse(e.headers)||e.headers,i=>t.headers=JSON.parse(i.message)),c=A(()=>r.parameters?.cookie?.parse(e.cookies)||e.cookies,i=>t.cookies=JSON.parse(i.message));if(Object.keys(t).length)throw new B(t);return{body:s??null,queries:n??{},params:o??{},headers:p??{},cookies:c??{}}}function b(e,r,t,s){typeof s=="string"&&console.error(s?`[error:${s}]: ${t}`:`[error]: ${t}`),e.status(r).contentType("application/json").send({statusCode:r,message:t})}function re(e){let r=/:([^/]+)/g,t=$(e).replace(r,"{$1}"),s=[],n=null;for(;(n=r.exec(e))!==null;)s.push(n[1]);return{path:t,params:s}}function $(e){return e.replace(/\/+/gi,"/")}function A(e,r){try{return e()}catch(t){return r(t),null}}var I="content-type";function ne(e,r,t){let s=[];e.on("data",n=>s.push(n)),e.on("end",async()=>{if(e.method==="GET"||!s.length)return t();if(e.headers[I]==="application/json"){let n=Buffer.concat(s);try{n.length&&(e.body=JSON.parse(n.toString("utf-8")))}catch{return b(r,400,"Invalid JSON")}return t()}else if(e.headers[I]?.startsWith("multipart/form-data")){let n=Buffer.concat(s),o=K(e.headers["content-type"]);if(!o)return b(r,400,"Cannot find multipart boundary");let p=F(n,o),c={};for(let a of p){if(!a.name)continue;let y=a.filename?new File([a.data],a.filename,a.type?{type:a.type}:{}):a.data.toString("utf-8");(c[a.name]??=[]).push(y)}let i=[];for(let[a,y=[]]of Object.entries(c))y.length>1&&i.push({field:a,message:"Duplicated key"});return i.length?b(r,400,JSON.stringify({in:"body",result:i.map(({field:a,message:y})=>({path:[a],message:y}))})):(e.body=ge(c,a=>a[0]),t())}else if(e.headers[I]==="application/x-www-form-urlencoded"){let n=Buffer.concat(s).toString("utf-8"),o=new URLSearchParams(n),p=[];return Array.from(o.keys()).reduce((c,i)=>(c.has(i)&&p.push(i),c.add(i)),new Set),p.length?b(r,400,JSON.stringify({in:"body",result:p.map(c=>({path:[c],message:"Duplicated key"}))})):(e.body=Object.fromEntries(o),t())}else return e.headers[I]==="application/octet-stream"?(e.body=Buffer.concat(s),t()):b(r,415,`'${e.headers[I]}' content type is not supported`)}),e.on("error",n=>{b(r,500,String(n))})}function Ue(e,r,t){t?.cors&&e.use(Te(typeof t.cors=="boolean"?{}:t.cors)),e.use(ne),console.log(`[server]: Registering ${Object.keys(r).length} endpoints...`);let s=new Set;for(let[n,o]of Object.entries(r)){let[p="",...c]=n.split(":"),i=c.join(":");if(s.has(o.operationId))throw new Error(`Duplicate operation ID "${o.operationId}" for path ${i}`);if(s.add(o.operationId),!X.some(a=>a===p))throw new Error(`Invalid method "${p}" for path ${i}`);console.log(`[register]: ${o.operationId} -> ${p.toUpperCase()} ${i}`),e[p](i,async(a,y)=>{let g={};try{let d=te(a,o);if(o.security?.length)for(let R of o.security)await R.inner.handler(d,g);let l=await o.handler(d,g),u=l instanceof z?l:new z({body:l}),h=u.payload.status??(p==="post"?201:200),f=o.responses[h]||o.responses.default;if(!f||typeof f=="boolean"||typeof f=="string")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${h}/default`),new Error("Internal server error");try{f.body.parse(u.payload.body)}catch(R){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(R)),new Error("Internal server error")}if(u.payload.body instanceof he||u.payload.body instanceof se.ReadStream)y.header(u.payload.headers),u.payload.body.pipe(y);else if(typeof u.payload.body>"u")y.header(u.payload.headers).status(h).end();else if(f instanceof O){let[R,N]=await f.serializeWithContentType(u.payload.body);y.contentType(R).header(u.payload.headers).status(h).send(N)}else y.contentType(f.mimeType).header(u.payload.headers).status(h).send(await f.serialize(u.payload.body))}catch(d){be(d,y)}})}t?.docs&&Re(e,t.docs),Ee(e)}function be(e,r){e instanceof j?r.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof B?r.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([t,s])=>({in:t,result:s}))}):e instanceof Error?(console.error(String(e)),r.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),r.status(500).send({statusCode:500,message:String(e)}))}function Re(e,r){e.get(r.docsPath,(t,s)=>{s.contentType("html").send(ee.replace("{{title}}",r.spec.info.title).replace("{{specUrl}}",r.specPath))}),e.get(r.specPath,(t,s)=>{s.contentType("json").send(JSON.stringify(r.spec,null,2))})}function Ee(e){e.all("*",(r,t)=>{b(t,404,`Cannot find ${r.method.toUpperCase()} ${r.path}`)})}import{generateSchema as P}from"@anatine/zod-openapi";import oe from"http-status";import{pascal as ie,title as ae,isEmpty as M,mapValues as V,objectify as Oe,omit as Be,shake as xe}from"radash";import{z as m}from"zod";var k="GeneralApiError",pe="ValidationError",Pe=m.object({code:m.string(),expected:m.string(),received:m.string(),path:m.string().array(),message:m.string()}),Se=m.object({in:m.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:m.array(Pe).describe("An array of error items")}),de=m.object({statusCode:m.number().int().min(100).max(599).describe("The HTTP response status code"),message:m.string().describe("The message associated with the error")}).describe("A general HTTP error response"),ze=de.extend({message:m.union([m.array(Se).describe("An array of error schemas detailing validation issues"),m.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function it(e){let r={},t={};for(let[s,n]of Object.entries(e.paths)){let[o,...p]=s.split(":"),{path:c}=re(p.join(":")),i=[],a=r[c]??{};for(let[d,l]of Object.entries(n.parameters??{})){let{properties:u={},required:h=[]}=P(l);for(let[f,R]of Object.entries(u)){if("$ref"in R)continue;let{description:N,...ce}=R,J=h.includes(f);i.push({name:f,in:d,...N&&{description:N},...J&&{required:J},schema:ce})}}let y=`${ie(ae(n.operationId))}RequestBody`;if(n.requestBody&&n.requestBody.body._def.typeName!==m.ZodVoid.name){let d=P(n.requestBody.body);t[y]=n.requestBody instanceof O?Ae(d):d}let g=`${ie(ae(n.operationId))}Response`;for(let[,d]of Object.entries(n.responses??{}))typeof d=="object"&&d.body._def.typeName!==m.ZodVoid.name&&(t[g]=P(d.body));a[o]={...n.tags?.length&&{tags:Object.values(n.tags).map(d=>d.name)},summary:n.summary||n.operationId,...n.description&&{description:n.description},operationId:n.operationId,...n.deprecated&&{deprecated:n.deprecated},...!M(i)&&{parameters:i},...n.security?.length&&{security:n.security.map(d=>({[d.inner.name]:[]}))},...n.requestBody&&{requestBody:{...n.requestBody.description&&{description:n.requestBody.description},content:x(n.requestBody.mimeType,y,n.requestBody.body._def.typeName===m.ZodVoid.name,n.requestBody instanceof O||n.requestBody instanceof w?n.requestBody.encoding:void 0),required:!n.requestBody.body.isOptional()}},responses:{...V(xe(n.responses),(d,l)=>({description:(typeof d=="string"?d:null)||String(oe[`${l}`])||"No description",content:typeof d=="boolean"||typeof d=="string"?x(T.mimeType,k):x(d.mimeType,g,d.body._def.typeName===m.ZodVoid.name)})),...(n.requestBody||!M(n.parameters))&&{400:{description:G(n.responses,400)||"Misformed data in a sending request",content:x(T.mimeType,pe)}},...n.security?.length&&{401:{description:G(n.responses,401)||oe[401],content:x(T.mimeType,k)}},500:{description:G(n.responses,500)||"Server unhandled or runtime error that may occur",content:x(T.mimeType,k)}}},r[c]=a}return{openapi:e.openapi,info:e.info,paths:r,components:{schemas:{...t,[k]:P(de),[pe]:P(ze)},...e.security?.length&&{securitySchemes:V(Oe(e.security.map(s=>s.inner),s=>s.name),s=>Be(s,["handler","name"]))}},...e.tags&&!M(e.tags)&&{tags:Object.values(e.tags)}}}function x(e,r,t,s){return t?{[e]:{}}:{[e]:{schema:{$ref:`#/components/schemas/${r}`},...s&&{encoding:V(s,n=>({...n,...n.contentType&&{contentType:n.contentType.join(", ")},...n.headers&&{headers:P(n.headers).properties}}))}}}}function Ae(e){return{type:e.type,properties:V(e.properties??{},r=>"nullable"in r&&r.nullable&&Object.keys(r).length===1?{type:"string",format:"binary"}:r)}}function G(e,r){let t=e[r];return typeof t=="string"?t:null}import{mapKeys as Ie,mapValues as Ne}from"radash";function ct(e,r){let t=[],s=[];for(let n of r){let o=Object.keys(n).map(p=>$(`${e}${p}`));s.push(...t.filter(p=>o.includes(p))),t.push(...o)}if(s.length)throw new Error(`Duplicated keys occured: ${s.join(", ")}`);return Ie(Object.assign({},...r),n=>$(n.replace(/:/,`:${e}`)))}function ut(e,r){return Ne(e,t=>Object.assign(t,r))}export{j as ApiError,O as FormDataBody,Y as HtmlBody,z as HttpResponse,T as JsonBody,X as METHODS,Q as OctetStreamBody,W as Security,_ as TextBody,w as UrlEncodedBody,B as ValidationError,ut as applyGroupConfig,it as buildJson,Ze as endpoint,Ue as initExpress,ct as mergeEndpointGroups};
//# sourceMappingURL=index.mjs.map