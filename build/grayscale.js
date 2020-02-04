!function(e){var t={};function s(r){if(t[r])return t[r].exports;var n=t[r]={i:r,l:!1,exports:{}};return e[r].call(n.exports,n,n.exports,s),n.l=!0,n.exports}s.m=e,s.c=t,s.d=function(e,t,r){s.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},s.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.t=function(e,t){if(1&t&&(e=s(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(s.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var n in e)s.d(r,n,function(t){return e[t]}.bind(null,n));return r},s.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return s.d(t,"a",t),t},s.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},s.p="",s(s.s=2)}([,,function(e,t,s){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),(async()=>{let e=document.querySelector("#canvas").getContext("2d"),t=new Image,r=new Promise((e,s)=>{t.onload=e,t.onerror=s});t.src="assets/images/test.png",await r;let n=(await Promise.resolve().then(()=>s(3))).default,a=await n.workgroup("./build/assembly/optimized.wasm",6,"\n        await (async (data)=>{\n            return instance.exports[data.name](id, ...data.args);\n        })");console.log("created workers!"),e.drawImage(t,0,0);let o=e.getImageData(0,0,640,480),i=Math.min(o.width*o.height*4,1073741824),l=a.allocate(i),p=a.map(l,i,Uint8Array);p.set(o.data),console.log("allocation of shared memory complete!"),await a.task({name:"main",args:[o.width,o.height,l]}).support(),console.log("compute done!"),o.data.set(p),console.log(`copied back data with ${i} bytes!`),e.putImageData(o,0,0)})()},function(e,t,s){"use strict";s.r(t);let r=(e="")=>`\nlet instance = null, threads = 1, id = 0;\n//let table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});\n\n// thread native dispatcher \nonmessage = async (e)=>{\n    let result = null;\n    \n    if (e.data.type == "init") {\n        threads = e.data.threads, id = e.data.id;\n\n        instance = await WebAssembly.instantiate(e.data.module, { env: {\n            abort: function() { throw Error("abort called"); }, memory: e.data.memory\n        }});\n\n        result = await instance.exports.init(threads);\n    }\n    \n    if (e.data.type == "dispatch") {\n        result = await instance.exports[e.data.name](id, ...e.data.args);\n    }\n    \n    if (e.data.type == "support") {\n        result = ${e}(e.data);\n    }\n\n    postMessage(Object.assign(e.data, {result}));\n}\n`;class n{constructor(){}async initiate(e,t=1,s=""){this.workers=[];let n=new Blob([r(s)],{type:"text/javascript"}),a=URL.createObjectURL(n);for(let e=0;e<t;e++)this.workers.push(new Worker(a));this.reponseIndex=0,this.responses={};let o=this.reponseIndex++;return this.responses[o]=[],this.moduleFetch=(await fetch(e)).arrayBuffer(),this.module=await WebAssembly.compile(await this.moduleFetch),this.memory=new WebAssembly.Memory({initial:1,maximum:65536,shared:!0}),this.instance=await WebAssembly.instantiate(this.module,{env:{memory:this.memory,abort:function(){throw Error("abort called")}}}),this.instance.exports.init(t),this.workers.every(async(e,s)=>{e.responses={},e.onmessage=t=>{e.responses[t.data.response].resolved=t.data};let r={};e.responses[o]=r,this.responses[o][s]=new Promise((e,t)=>{Object.defineProperty(r,"resolved",{set:s=>{s?e(s):t()}})}),e.postMessage({response:o,type:"init",module:this.module,memory:this.memory,threads:t,id:s})}),await Promise.all(this.responses[o]),this}async wait(e){let t=await Promise.all(this.responses[e]);return delete this.responses[e],t}task({name:e="main",args:t=[]}){let s=this.reponseIndex++;return this.responses[s]=[],this.workers.every(async(e,t)=>{let r={};e.responses[s]=r,this.responses[s][t]=new Promise((e,t)=>{Object.defineProperty(r,"resolved",{set:s=>{s?e(s):t()}})})}),new a({name:e,args:t,resp:s,workgroup:this})}allocate(e=4){return this.instance.exports.allocate(e)}free(e){return this.instance.exports.free(e)}map(e,t=0,s=Uint8Array){return t?new s(this.instance.exports.memory.buffer,e,t):new s(this.instance.exports.memory.buffer,e)}}class a{constructor({name:e="main",args:t=[],resp:s=0,workgroup:r}){this.workgroup=r,this.resp=s,this.args=t,this.name=e}async dispatch(){return this.workgroup.workers.every(async(e,t)=>{e.postMessage({type:"dispatch",id:t,response:this.resp,name:this.name,args:this.args})}),this.workgroup.wait(this.resp)}async support(){return this.workgroup.workers.every(async(e,t)=>{e.postMessage({type:"support",id:t,response:this.resp,name:this.name,args:this.args})}),this.workgroup.wait(this.resp)}get id(){return this.resp}}t.default={init:async()=>0,workgroup:async(e,t=1,s="")=>(new n).initiate(e,t,s)}}]);