var G=["get","post","put","patch","delete"];function be(e){return{...e,...e.requestBody&&!(e.requestBody instanceof E)&&{requestBody:new h(e.requestBody)}}}var A=class{constructor(t){this.payload=t}},$=class{constructor(t){this.inner=t}use(t,n){return this}},N=class extends Error{constructor(n,s){super(s);this.status=n;this.msg=s}},O=class extends Error{constructor(n){super(JSON.stringify(n));this.msg=n}},E=class{constructor(){this._desc=null}describe(t){return this._desc=t,this}get description(){return this._desc}},z=class z extends E{constructor(n){super();this.body=n}get mimeType(){return z.mimeType}};z.mimeType="application/json";var h=z,w=class w extends E{constructor(n,s){super();this.body=n;this.encoding=s}get mimeType(){return w.mimeType}};w.mimeType="multipart/form-data";var I=w,D=class D extends E{constructor(n,s){super();this.body=n;this.encoding=s}get mimeType(){return D.mimeType}};D.mimeType="application/x-www-form-urlencoded";var j=D,Z=class Z extends E{constructor(n){super();this.body=n}get mimeType(){return Z.mimeType}};Z.mimeType="application/octet-stream";var v=Z;import{Readable as ae}from"stream";import ie from"cors";var M=`<!doctype html>
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
</html>`;import{mapValues as oe}from"lodash";function J(e,t){let n="",s=0,r=[],o=[],d=[],c={};for(let a=0;a<e.length;a++){let i=e[a]??NaN,m=a>0?e[a-1]??null:null,f=i===10&&m===13;if(i===10||i===13||(n+=String.fromCharCode(i)),s===0&&f)`--${t}`===n&&(s=1),n="";else if(s===1&&f)n.length?d.push(n):(c=Object.fromEntries(d.flatMap(y=>{let[l,b=""]=y.split(":");return l?.trim()?[[l.trim().toLocaleLowerCase(),b?.trim()]]:[]})),s=2,r=[]),n="";else if(s===2){if(n.length>t.length+4&&(n=""),`--${t}`===n){let y=r.length-n.length,l=r.slice(0,y-1);o.push(ne({headers:c,part:l})),r=[],d=[],c={},n="",s=3}else r.push(i);f&&(n="")}else s===3&&f&&(s=1)}return o}function F(e){let t=e.split(";");for(let n of t){let s=String(n).trim();if(s.startsWith("boundary")){let r=s.split("=");return String(r[1]).trim().replace(/^["']|["']$/g,"")}}return null}function ne(e){let[,t,n]=e.headers["content-disposition"]?.split(";")??[],s={headers:e.headers,name:t?.split("=")[1]?.replace(/"/g,""),data:Buffer.from(e.part)};if(n){let[r,o]=n.split("=").map(d=>d.trim());Object.assign(s,{...r&&o&&{[r]:JSON.parse(o)},type:e.headers["content-type"]?.split(":")[1]?.trim()})}return s}function K(e,t){let n={},s=S(()=>t.requestBody?.body.parse(e.body)||e.body,a=>n.body=JSON.parse(a.message)),r=S(()=>t.parameters?.query?.parse(e.query)||e.query,a=>n.queries=JSON.parse(a.message)),o=S(()=>t.parameters?.path?.parse(e.params)||e.params,a=>n.params=JSON.parse(a.message)),d=S(()=>t.parameters?.header?.parse(e.headers)||e.headers,a=>n.headers=JSON.parse(a.message)),c=S(()=>t.parameters?.cookie?.parse(e.cookies)||e.cookies,a=>n.cookies=JSON.parse(a.message));if(Object.keys(n).length)throw new O(n);return{body:s??null,queries:r??{},params:o??{},headers:d??{},cookies:c??{}}}function T(e,t,n,s){typeof s=="string"&&console.error(s?`[error:${s}]: ${n}`:`[error]: ${n}`),e.status(t).contentType("application/json").send({statusCode:t,message:n})}function U(e){return typeof e>"u"?null:typeof e=="string"||typeof e=="number"||typeof e=="boolean"?{contentType:"text/plain",body:String(e)}:Array.isArray(e)||typeof e=="object"||e===null?{contentType:"application/json",body:JSON.stringify(e)}:Buffer.isBuffer(e)?{contentType:"application/octet-stream",body:e}:e instanceof URLSearchParams?{contentType:"application/x-www-form-urlencoded",body:Array.from(e).map(t=>t.map(encodeURIComponent).join("=")).join("&")}:{contentType:"text/plain",body:String(e)}}function Q(e){let t=/:([^/]+)/g,n=C(e).replace(t,"{$1}"),s=[],r=null;for(;(r=t.exec(e))!==null;)s.push(r[1]);return{path:n,params:s}}function C(e){return e.replace(/\/+/gi,"/")}function S(e,t){try{return e()}catch(n){return t(n),null}}var B="content-type";function W(e,t,n){let s=[];e.on("data",r=>s.push(r)),e.on("end",async()=>{if(e.method==="GET")return n();if(e.headers[B]==="application/json"){let r=Buffer.concat(s);try{r.length&&(e.body=JSON.parse(r.toString("utf-8")))}catch{return T(t,400,"Invalid JSON")}return n()}else if(e.headers[B]?.startsWith("multipart/form-data")){let r=Buffer.concat(s),o=F(e.headers["content-type"]);if(!o)return T(t,400,"Cannot find multipart boundary");let d=J(r,o),c={};for(let i of d){if(!i.name)continue;let m=i.filename?new File([i.data],i.filename,i.type?{type:i.type}:{}):i.data.toString("utf-8");(c[i.name]??=[]).push(m)}let a=[];for(let[i,m=[]]of Object.entries(c))m.length>1&&a.push({field:i,message:"Duplicated key"});return a.length?T(t,400,JSON.stringify({in:"body",result:a.map(({field:i,message:m})=>({path:[i],message:m}))})):(e.body=oe(c,i=>i[0]),n())}else if(e.headers[B]==="application/x-www-form-urlencoded"){let r=Buffer.concat(s).toString("utf-8"),o=new URLSearchParams(r),d=[];return Array.from(o.keys()).reduce((c,a)=>(c.has(a)&&d.push(a),c.add(a)),new Set),d.length?T(t,400,JSON.stringify({in:"body",result:d.map(c=>({path:[c],message:"Duplicated key"}))})):(e.body=Object.fromEntries(o),n())}else return e.headers[B]==="application/octet-stream"?(e.body=Buffer.concat(s),n()):T(t,415,`'${e.headers[B]}' content type is not supported`)}),e.on("error",r=>{T(t,500,String(r))})}function De(e,t,n){n?.cors&&e.use(ie(typeof n.cors=="boolean"?{}:n.cors)),e.use(W),console.log(`[server]: Registering ${Object.keys(t).length} endpoints...`);let s=new Set;for(let[r,o]of Object.entries(t)){let[d="",...c]=r.split(":"),a=c.join(":");if(s.has(o.operationId))throw new Error(`Duplicate operation ID "${o.operationId}" for path ${a}`);if(s.add(o.operationId),!G.some(i=>i===d))throw new Error(`Invalid method "${d}" for path ${a}`);console.log(`[register]: ${o.operationId} -> ${d.toUpperCase()} ${a}`),e[d](a,async(i,m)=>{let f={};try{let p=K(i,o);if(o.security?.length)for(let g of o.security)await g.inner.handler(p,f);let y=await o.handler(p,f),l=y instanceof A?y:new A({body:y}),b=l.payload.status??(d==="post"?201:200),R=o.responses[b]||o.responses.default;if(!R||typeof R=="boolean"||typeof R=="string")throw console.error(`[error]: There is no corresponding validator defined in schema for status ${b}/default`),new Error("Internal server error");try{R.parse(l.payload.body)}catch(g){throw console.error("[error]: Invalid output format to the corresponding defined output schema"),console.error(String(g)),new Error("Internal server error")}if(l.payload.body instanceof ae)m.header(l.payload.headers),l.payload.body.pipe(m);else{let g=U(l.payload.body);g?m.contentType(g.contentType).status(b).header(l.payload.headers).send(g.body):m.header(l.payload.headers).end()}}catch(p){pe(p,m)}})}n?.docs&&de(e,n.docs),ce(e)}function pe(e,t){e instanceof N?t.status(e.status).send({statusCode:e.status,message:e.message}):e instanceof O?t.status(400).send({statusCode:400,message:Object.entries(JSON.parse(e.message)).map(([n,s])=>({in:n,result:s}))}):e instanceof Error?(console.error(String(e)),t.status(500).send({statusCode:500,message:e.message})):(console.error(String(e)),t.status(500).send({statusCode:500,message:String(e)}))}function de(e,t){e.get(t.docsPath,(n,s)=>{s.contentType("html").send(M.replace("{{title}}",t.spec.info.title).replace("{{specUrl}}",t.specPath))}),e.get(t.specPath,(n,s)=>{s.contentType("json").send(JSON.stringify(t.spec,null,2))})}function ce(e){e.all("*",(t,n)=>{T(n,404,`Cannot find ${t.method.toUpperCase()} ${t.path}`)})}import{generateSchema as x}from"@anatine/zod-openapi";import Y from"http-status";import{isEmpty as V,keyBy as ue,mapValues as q,upperFirst as X}from"lodash";import{z as u}from"zod";var L="GeneralApiError",ee="ValidationError",me=u.object({code:u.string(),expected:u.string(),received:u.string(),path:u.string().array(),message:u.string()}),le=u.object({in:u.enum(["body","queries","params","headers","cookies"]).describe("The part of a request where data validation failed"),result:u.array(me).describe("An array of error items")}),te=u.object({statusCode:u.number().int().min(100).max(599).describe("The HTTP response status code"),message:u.string().describe("The message associated with the error")}).describe("A general HTTP error response"),ye=te.extend({message:u.union([u.array(le).describe("An array of error schemas detailing validation issues"),u.string().describe("Alternatively, a simple error message")])}).describe("An error related to the validation process with more detailed information");function Ge(e){let t={},n={};for(let[s,r]of Object.entries(e.paths)){let[o,...d]=s.split(":"),{path:c}=Q(d.join(":")),a=[],i=t[c]??{};if(r.parameters)for(let[p,y]of Object.entries(r.parameters)){let{properties:l={},required:b=[]}=x(y);for(let[R,g]of Object.entries(l)){let{description:H,...re}=g,_=b.includes(R);a.push({name:R,in:p,...H&&{description:H},..._&&{required:_},schema:re})}}let m=`${X(r.operationId)}RequestBody`;if(r.requestBody&&r.requestBody.body._def.typeName!==u.ZodVoid.name){let p=x(r.requestBody.body);n[m]=r.requestBody instanceof I?fe(p):p}let f=`${X(r.operationId)}Response`;if(r.responses)for(let[,p]of Object.entries(r.responses))typeof p=="object"&&p._def.typeName!==u.ZodVoid.name&&(n[f]=x(p));i[o]={...r.tags?.length&&{tags:Object.values(r.tags).map(p=>p.name)},summary:r.summary||r.operationId,...r.description&&{description:r.description},operationId:r.operationId,...r.deprecated&&{deprecated:r.deprecated},...!V(a)&&{parameters:a},...r.security?.length&&{security:r.security.map(p=>({[p.inner.name]:[]}))},...r.requestBody&&{requestBody:{...r.requestBody.description&&{description:r.requestBody.description},content:P(r.requestBody.mimeType,m,r.requestBody.body._def.typeName===u.ZodVoid.name,r.requestBody instanceof I||r.requestBody instanceof j?r.requestBody.encoding:void 0),required:!r.requestBody.body.isOptional()}},responses:{...q(r.responses,(p,y)=>({description:(typeof p=="string"?String(p):null)||Y[`${y}`].toString()||"No description",content:typeof p=="boolean"||typeof p=="string"?P(h.mimeType,L):P(h.mimeType,f,p?._def.typeName===u.ZodVoid.name)})),...(r.requestBody||!V(r.parameters))&&{400:{description:k(r.responses,400)||"Misformed data in a sending request",content:P(h.mimeType,ee)}},...r.security?.length&&{401:{description:k(r.responses,401)||Y[401],content:P(h.mimeType,L)}},500:{description:k(r.responses,500)||"Server unhandled or runtime error that may occur",content:P(h.mimeType,L)}}},t[c]=i}return{openapi:e.openapi,info:e.info,paths:t,components:{schemas:{...n,[L]:x(te),[ee]:x(ye)},...e.security?.length&&{securitySchemes:q(ue(e.security.map(s=>s.inner),"name"),({handler:s,name:r,...o})=>o)}},...e.tags&&!V(e.tags)&&{tags:Object.values(e.tags)}}}function P(e,t,n,s){return n?{[e]:{}}:{[e]:{schema:{$ref:`#/components/schemas/${t}`},...s&&{encoding:q(s,r=>({...r,...r.contentType&&{contentType:r.contentType.join(", ")},...r.headers&&{headers:x(r.headers).properties}}))}}}}function fe(e){return{type:e.type,properties:q(e.properties,t=>"nullable"in t&&t.nullable?{type:"string",format:"binary"}:t)}}function k(e,t){let n=e[t];return typeof n=="string"?String(n):null}import{intersection as ge,mapKeys as he,mapValues as Te}from"lodash";function Ke(e,t){let n=[],s=[];for(let r of t){let o=Object.keys(r).map(d=>C(`${e}${d}`));s.push(...ge(n,o)),n.push(...o)}if(s.length)throw new Error(`Duplicated keys occured: ${s.join(", ")}`);return he(Object.assign({},...t),(r,o)=>C(o.replace(/:/,`:${e}`)))}function Ue(e,t){return Te(e,n=>Object.assign(n,t))}export{N as ApiError,I as FormDataBody,A as HttpResponse,h as JsonBody,G as METHODS,v as OctetStreamBody,$ as Security,j as UrlEncodedBody,O as ValidationError,Ue as applyGroupConfig,Ge as buildJson,be as endpoint,De as initExpress,Ke as mergeEndpointGroups};
//# sourceMappingURL=index.mjs.map