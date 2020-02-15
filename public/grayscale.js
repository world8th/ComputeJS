/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./grayscale.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./grayscale.ts":
/*!**********************!*\
  !*** ./grayscale.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
(async () => {
    let canvas = document.querySelector("#canvas");
    let ctx = canvas.getContext("2d");
    let image = new Image();
    let promise = new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });
    image.src = "images/test.png";
    await promise;
    let compute = (await Promise.resolve().then(() => __webpack_require__(/*! ./lib/compute.js */ "./lib/compute.js"))).default;
    let workgroup = await compute.workgroup("./assembly/optimized.wasm", 6, `
        await (async (data)=>{
            return instance.exports[data.name](id, ...data.args);
        })`);
    console.log("created workers!");
    const size = Math.min(canvas.width * canvas.height * 4, 1024 * 1024 * 1024);
    const buffer = workgroup.allocate(size);
    ctx.drawImage(image, 0, 0);
    let map = workgroup.map(buffer, size, Uint8ClampedArray);
    let img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    map.set(img.data);
    console.log("allocation of shared memory complete!");
    await workgroup.task({ name: "main", args: [canvas.width, canvas.height, buffer] }).support();
    console.log("compute done!");
    img.data.set(map);
    ctx.putImageData(img, 0, 0);
})();


/***/ }),

/***/ "./lib/compute.js":
/*!************************!*\
  !*** ./lib/compute.js ***!
  \************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
//const { Worker, isMainThread, parentPort, workerData } = typeof require != "undefined" ? require('worker_threads') : { Worker: global.Worker, isMainThread: true, parentPort: this, workerData: {} };
//const fetch = typeof require != "undefined" ? require('node-fetch') : global.fetch;
//const Blob  = typeof require != "undefined" ? require('cross-blob') : global.Blob;
//let fs;
//if (typeof require != "undefined") fs = require("fs");

let ThreadCode = (support = ``)=>{ return `
//const { Worker, isMainThread, parentPort, workerData} = typeof require != "undefined" ? require('worker_threads') : { Worker, isMainThread: false, parentPort: this, workerData: {} };

let instance = null, threads = 1, id = 0;
//let table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

// thread native dispatcher 
this.onmessage = async (e)=>{
    let result = null;
    
    if (e.data.type == "init") {
        threads = e.data.threads, id = e.data.id;

        instance = await WebAssembly.instantiate(e.data.module, { env: {
            abort: function() { throw Error("abort called"); }, memory: e.data.memory
        }});

        result = await instance.exports.init(threads);
    }
    
    if (e.data.type == "dispatch") {
        result = await instance.exports[e.data.name](id, ...e.data.args);
    }
    
    if (e.data.type == "support") {
        result = ${support}(e.data);
    }

    this.postMessage(Object.assign(e.data, {result}));
}
`};

class Workgroup {
    constructor(){
        
    }
    
    async initiate(module, threads = 1, supportCode = ``){
        //WebAssembly.instantiateStreaming(fetch(
        this.workers = [];

        // initialize threads
        let blob = null, url = "";
        if (typeof Blob != "undefined") {
            blob = new Blob([ThreadCode(supportCode)],{type:"text/javascript"}), url = URL.createObjectURL(blob);
            for (let i=0;i<threads;i++) { this.workers.push(new Worker(url)); }
        } else {
            url = ThreadCode(supportCode);
        }

        // 
        this.reponseIndex = 0, this.responses = {};

        // 
        let resp = this.reponseIndex++;
        this.responses[resp] = [];

        // initialize workers
        try {
            if (typeof fetch != "undefined") this.moduleFetch = await (await fetch(module)).arrayBuffer();
            //if (typeof fetch == "undefined") this.moduleFetch = fs.readFileSync(module).buffer;
        } catch(e) {
            console.error(e);
        }

        try {
            this.module = await WebAssembly.compile(this.moduleFetch);
        } catch(e) {
            console.error(e);
        }

        // create shared memory model
        this.memory = new WebAssembly.Memory({initial: 1, maximum: 65536, shared: true});
        //this.table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

        // create host/manager instance
        (this.instance = await WebAssembly.instantiate(this.module, { env: {
            memory: this.memory,
            abort: function() { throw Error("abort called"); }
        }})).exports.init(threads);

        // 
        this.workers.every(async (w,i)=>{
            w.responses = {};
            w.onmessage = (e)=>{ w.responses[e.data.response].resolved = e.data; };

            // add new task into worker
            let response = {}; w.responses[resp] = response; // initialize resolver
            this.responses[resp][i] = new Promise((resolve,reject)=>{ Object.defineProperty(response, "resolved", {set: value => { value?resolve(value):reject(); }}); });

            // send command into worker
            w.postMessage({ response: resp, type: "init", module: this.module, memory: this.memory, threads, id: i });
        });

        // await initialization of workers
        await Promise.all(this.responses[resp]);

        return this;
    }

    // wait task by ID
    async wait(resp){
        let result = await Promise.all(this.responses[resp]);
        delete this.responses[resp];
        return result;
    }
    
    // create work task 
    task({name="main",args=[]}){
        // 
        let resp = this.reponseIndex++;
        this.responses[resp] = [];
        
        // add new task into worker
        this.workers.every(async (w,i)=>{
            let response = {}; w.responses[resp] = response; // initialize resolver
            this.responses[resp][i] = new Promise((resolve,reject)=>{ Object.defineProperty(response, "resolved", {set: value => { value?resolve(value):reject(); }}); });
        });

        return new Worktask({name,args,resp,workgroup:this});
    }
    
    // allocate memory for work
    allocate(size = 4){
        return this.instance.exports.allocate(size);
    }

    // free memory pointer
    free(pointer){
        return this.instance.exports.free(pointer);
    }

    // get workgroup memory object 
    map(ptr, range = 0, type = Uint8Array){
        if (range) {
            return new type(this.instance.exports.memory.buffer, ptr, range); // Ranged
        } else {
            return new type(this.instance.exports.memory.buffer, ptr); // Whole Size (may used for WebGPU)
        }
    }
}

class Worktask {
    constructor({name="main",args=[],resp=0,workgroup}) {
        this.workgroup = workgroup, this.resp = resp, this.args = args, this.name = name;
    }

    // send command for computing
    async dispatch() {
        ///return this.workgroup.instance.exports[this.name](0, ...this.args);
        this.workgroup.workers.every(async (w,i)=>{
            w.postMessage({ type: "dispatch", id:i, response: this.resp, name: this.name, args: this.args });
        });
        return this.workgroup.wait(this.resp);
    }

    // send command for javascript host manager
    async support() {
        ///return this.workgroup.instance.exports[this.name](0, ...this.args);
        this.workgroup.workers.every(async (w,i)=>{
            w.postMessage({ type: "support", id:i, response: this.resp, name: this.name, args: this.args });
        });
        return this.workgroup.wait(this.resp);
    }

    // get task ID (not recommended)
    get id() { return this.resp; }
}

/* harmony default export */ __webpack_exports__["default"] = ({
    async init() { return 0; },
    async workgroup(module, threads = 1,support=``) {
        return new Workgroup().initiate(module,threads,support);
    }
});


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vZ3JheXNjYWxlLnRzIiwid2VicGFjazovLy8uL2xpYi9jb21wdXRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7UUFBQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTs7O1FBR0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDBDQUEwQyxnQ0FBZ0M7UUFDMUU7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSx3REFBd0Qsa0JBQWtCO1FBQzFFO1FBQ0EsaURBQWlELGNBQWM7UUFDL0Q7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBLHlDQUF5QyxpQ0FBaUM7UUFDMUUsZ0hBQWdILG1CQUFtQixFQUFFO1FBQ3JJO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMkJBQTJCLDBCQUEwQixFQUFFO1FBQ3ZELGlDQUFpQyxlQUFlO1FBQ2hEO1FBQ0E7UUFDQTs7UUFFQTtRQUNBLHNEQUFzRCwrREFBK0Q7O1FBRXJIO1FBQ0E7OztRQUdBO1FBQ0E7Ozs7Ozs7Ozs7Ozs7OztBQzlFQSxDQUFDLEtBQUssSUFBRyxFQUFFO0lBQ1AsSUFBSSxNQUFNLEdBQXNCLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEUsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUdsQyxJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO0lBQ3hCLElBQUksT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxFQUFFO1FBQ3hDLEtBQUssQ0FBQyxNQUFNLEdBQUMs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O0FBQ0E7QUFDQSxnQ0FBZ0MsZ0RBQWdEOztBQUVoRjtBQUNBLDhCQUE4Qiw4QkFBOEI7QUFDNUQscUVBQXFFLDhDQUE4QyxlQUFlLCtCQUErQixHQUFHLEVBQUUsRUFBRTs7QUFFeEs7QUFDQSwyQkFBMkIseUZBQXlGO0FBQ3BILFNBQVM7O0FBRVQ7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFVBQVUsb0JBQW9CO0FBQzlCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsOEJBQThCLDhCQUE4QjtBQUM1RCxxRUFBcUUsOENBQThDLGVBQWUsK0JBQStCLEdBQUcsRUFBRSxFQUFFO0FBQ3hLLFNBQVM7O0FBRVQsNkJBQTZCLDhCQUE4QjtBQUMzRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSw2RUFBNkU7QUFDN0UsU0FBUztBQUNULHNFQUFzRTtBQUN0RTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxpQkFBaUIscUNBQXFDO0FBQ3REO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkIsZ0ZBQWdGO0FBQzNHLFNBQVM7QUFDVDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMkJBQTJCLCtFQUErRTtBQUMxRyxTQUFTO0FBQ1Q7QUFDQTs7QUFFQTtBQUNBLGNBQWMsa0JBQWtCO0FBQ2hDOztBQUVlO0FBQ2Ysa0JBQWtCLFVBQVUsRUFBRTtBQUM5QjtBQUNBO0FBQ0E7QUFDQSxDQUFDLEVBQUMiLCJmaWxlIjoiZ3JheXNjYWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZ2V0dGVyIH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gXHRcdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuIFx0XHR9XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4gXHR9O1xuXG4gXHQvLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3RcbiBcdC8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuIFx0Ly8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4gXHQvLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3RcbiBcdC8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbiBcdF9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG4gXHRcdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IF9fd2VicGFja19yZXF1aXJlX18odmFsdWUpO1xuIFx0XHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuIFx0XHRpZigobW9kZSAmIDQpICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgJiYgdmFsdWUuX19lc01vZHVsZSkgcmV0dXJuIHZhbHVlO1xuIFx0XHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobnMsICdkZWZhdWx0JywgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdmFsdWUgfSk7XG4gXHRcdGlmKG1vZGUgJiAyICYmIHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgZm9yKHZhciBrZXkgaW4gdmFsdWUpIF9fd2VicGFja19yZXF1aXJlX18uZChucywga2V5LCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHZhbHVlW2tleV07IH0uYmluZChudWxsLCBrZXkpKTtcbiBcdFx0cmV0dXJuIG5zO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IFwiLi9ncmF5c2NhbGUudHNcIik7XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9saWIvY29tcHV0ZS5kLnRzXCIgLz5cclxuXHJcbmltcG9ydCB7IENvbXB1dGUgfSBmcm9tIFwiLi9saWIvY29tcHV0ZS5qc1wiO1xyXG5cclxuKGFzeW5jICgpPT57XHJcbiAgICBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjY2FudmFzXCIpO1xyXG4gICAgbGV0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG4gICAgLy8gbG9hZCBpbWFnZSAoc2ltcGxlcilcclxuICAgIGxldCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgaW1hZ2Uub25sb2FkPXJlc29sdmU7XHJcbiAgICAgICAgaW1hZ2Uub25lcnJvcj1yZWplY3Q7XHJcbiAgICB9KTtcclxuICAgIGltYWdlLnNyYyA9IFwiaW1hZ2VzL3Rlc3QucG5nXCI7XHJcbiAgICBhd2FpdCBwcm9taXNlO1xyXG5cclxuICAgIC8vIGltcG9ydCBjb21wdXRlIGxpYnJhcnkgXHJcbiAgICBsZXQgY29tcHV0ZTogQ29tcHV0ZS5Nb2R1bGUgPSAoYXdhaXQgaW1wb3J0KFwiLi9saWIvY29tcHV0ZS5qc1wiKSkuZGVmYXVsdDsgLy8gUmVxdWlyZWQgVHlwZSBDb252ZXJzaW9uXHJcbiAgICBcclxuICAgIC8vIGNyZWF0ZSB3YXNtIHdvcmtncm91cCAoNCB0aHJlYWRzKSB3aXRoIG1vZHVsZVxyXG4gICAgbGV0IHdvcmtncm91cCA9IGF3YWl0IGNvbXB1dGUud29ya2dyb3VwKFwiLi9hc3NlbWJseS9vcHRpbWl6ZWQud2FzbVwiLCA2LCBgXHJcbiAgICAgICAgYXdhaXQgKGFzeW5jIChkYXRhKT0+e1xyXG4gICAgICAgICAgICByZXR1cm4gaW5zdGFuY2UuZXhwb3J0c1tkYXRhLm5hbWVdKGlkLCAuLi5kYXRhLmFyZ3MpO1xyXG4gICAgICAgIH0pYCk7XHJcbiAgICBjb25zb2xlLmxvZyhcImNyZWF0ZWQgd29ya2VycyFcIik7XHJcblxyXG4gICAgLy8gYWxsb2NhdGUgc2hhcmVkIG1lbW9yeSBmb3Igd29ya1xyXG4gICAgY29uc3Qgc2l6ZSA9IE1hdGgubWluKGNhbnZhcy53aWR0aCpjYW52YXMuaGVpZ2h0KjQsMTAyNCoxMDI0KjEwMjQpO1xyXG4gICAgY29uc3QgYnVmZmVyID0gd29ya2dyb3VwLmFsbG9jYXRlKHNpemUpOyAvLyBqdXN0IG51bWJlciBwb2ludGVyXHJcblxyXG4gICAgLy8gXHJcbiAgICBjdHguZHJhd0ltYWdlKGltYWdlLDAsMCk7XHJcblxyXG4gICAgLy8gbWFrZSB0eXBlZCBhcnJheSBhbmQgc2V0IHdpdGggaW1hZ2UgZGF0YSBcclxuICAgIGxldCBtYXAgPSB3b3JrZ3JvdXAubWFwPFVpbnQ4Q2xhbXBlZEFycmF5PihidWZmZXIsc2l6ZSxVaW50OENsYW1wZWRBcnJheSk7XHJcbiAgICBsZXQgaW1nID0gY3R4LmdldEltYWdlRGF0YSgwLDAsY2FudmFzLndpZHRoLGNhbnZhcy5oZWlnaHQpO1xyXG4gICAgbWFwLnNldChpbWcuZGF0YSk7IC8vIHNldCBieSBtYXBwZWQgcmFuZ2VcclxuICAgIGNvbnNvbGUubG9nKFwiYWxsb2NhdGlvbiBvZiBzaGFyZWQgbWVtb3J5IGNvbXBsZXRlIVwiKTtcclxuXHJcbiAgICAvLyBSdW4gXCJzdXBwb3J0XCIgdGFzayAoY2FuIHJ1biBcIm1haW5cIiB3aXRob3V0IGlucHV0IGRhdGEpXHJcbiAgICBhd2FpdCB3b3JrZ3JvdXAudGFzayh7bmFtZTogXCJtYWluXCIsIGFyZ3M6IFtjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQsIGJ1ZmZlcl19KS5zdXBwb3J0KCk7XHJcbiAgICBjb25zb2xlLmxvZyhcImNvbXB1dGUgZG9uZSFcIik7XHJcblxyXG4gICAgLy8gcHV0IGltYWdlRGF0YVxyXG4gICAgaW1nLmRhdGEuc2V0KG1hcCk7XHJcbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltZywwLDApO1xyXG59KSgpO1xyXG4iLCIvL2NvbnN0IHsgV29ya2VyLCBpc01haW5UaHJlYWQsIHBhcmVudFBvcnQsIHdvcmtlckRhdGEgfSA9IHR5cGVvZiByZXF1aXJlICE9IFwidW5kZWZpbmVkXCIgPyByZXF1aXJlKCd3b3JrZXJfdGhyZWFkcycpIDogeyBXb3JrZXI6IGdsb2JhbC5Xb3JrZXIsIGlzTWFpblRocmVhZDogdHJ1ZSwgcGFyZW50UG9ydDogdGhpcywgd29ya2VyRGF0YToge30gfTtcbi8vY29uc3QgZmV0Y2ggPSB0eXBlb2YgcmVxdWlyZSAhPSBcInVuZGVmaW5lZFwiID8gcmVxdWlyZSgnbm9kZS1mZXRjaCcpIDogZ2xvYmFsLmZldGNoO1xuLy9jb25zdCBCbG9iICA9IHR5cGVvZiByZXF1aXJlICE9IFwidW5kZWZpbmVkXCIgPyByZXF1aXJlKCdjcm9zcy1ibG9iJykgOiBnbG9iYWwuQmxvYjtcbi8vbGV0IGZzO1xuLy9pZiAodHlwZW9mIHJlcXVpcmUgIT0gXCJ1bmRlZmluZWRcIikgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5cbmxldCBUaHJlYWRDb2RlID0gKHN1cHBvcnQgPSBgYCk9PnsgcmV0dXJuIGBcbi8vY29uc3QgeyBXb3JrZXIsIGlzTWFpblRocmVhZCwgcGFyZW50UG9ydCwgd29ya2VyRGF0YX0gPSB0eXBlb2YgcmVxdWlyZSAhPSBcInVuZGVmaW5lZFwiID8gcmVxdWlyZSgnd29ya2VyX3RocmVhZHMnKSA6IHsgV29ya2VyLCBpc01haW5UaHJlYWQ6IGZhbHNlLCBwYXJlbnRQb3J0OiB0aGlzLCB3b3JrZXJEYXRhOiB7fSB9O1xuXG5sZXQgaW5zdGFuY2UgPSBudWxsLCB0aHJlYWRzID0gMSwgaWQgPSAwO1xuLy9sZXQgdGFibGUgPSBuZXcgV2ViQXNzZW1ibHkuVGFibGUoe2luaXRpYWw6IDEsIG1heGltdW06IDY1NTM2LCBzaGFyZWQ6IHRydWUsIGVsZW1lbnQ6IFwiYW55ZnVuY1wifSk7XG5cbi8vIHRocmVhZCBuYXRpdmUgZGlzcGF0Y2hlciBcbnRoaXMub25tZXNzYWdlID0gYXN5bmMgKGUpPT57XG4gICAgbGV0IHJlc3VsdCA9IG51bGw7XG4gICAgXG4gICAgaWYgKGUuZGF0YS50eXBlID09IFwiaW5pdFwiKSB7XG4gICAgICAgIHRocmVhZHMgPSBlLmRhdGEudGhyZWFkcywgaWQgPSBlLmRhdGEuaWQ7XG5cbiAgICAgICAgaW5zdGFuY2UgPSBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZShlLmRhdGEubW9kdWxlLCB7IGVudjoge1xuICAgICAgICAgICAgYWJvcnQ6IGZ1bmN0aW9uKCkgeyB0aHJvdyBFcnJvcihcImFib3J0IGNhbGxlZFwiKTsgfSwgbWVtb3J5OiBlLmRhdGEubWVtb3J5XG4gICAgICAgIH19KTtcblxuICAgICAgICByZXN1bHQgPSBhd2FpdCBpbnN0YW5jZS5leHBvcnRzLmluaXQodGhyZWFkcyk7XG4gICAgfVxuICAgIFxuICAgIGlmIChlLmRhdGEudHlwZSA9PSBcImRpc3BhdGNoXCIpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgaW5zdGFuY2UuZXhwb3J0c1tlLmRhdGEubmFtZV0oaWQsIC4uLmUuZGF0YS5hcmdzKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGUuZGF0YS50eXBlID09IFwic3VwcG9ydFwiKSB7XG4gICAgICAgIHJlc3VsdCA9ICR7c3VwcG9ydH0oZS5kYXRhKTtcbiAgICB9XG5cbiAgICB0aGlzLnBvc3RNZXNzYWdlKE9iamVjdC5hc3NpZ24oZS5kYXRhLCB7cmVzdWx0fSkpO1xufVxuYH07XG5cbmNsYXNzIFdvcmtncm91cCB7XG4gICAgY29uc3RydWN0b3IoKXtcbiAgICAgICAgXG4gICAgfVxuICAgIFxuICAgIGFzeW5jIGluaXRpYXRlKG1vZHVsZSwgdGhyZWFkcyA9IDEsIHN1cHBvcnRDb2RlID0gYGApe1xuICAgICAgICAvL1dlYkFzc2VtYmx5Lmluc3RhbnRpYXRlU3RyZWFtaW5nKGZldGNoKFxuICAgICAgICB0aGlzLndvcmtlcnMgPSBbXTtcblxuICAgICAgICAvLyBpbml0aWFsaXplIHRocmVhZHNcbiAgICAgICAgbGV0IGJsb2IgPSBudWxsLCB1cmwgPSBcIlwiO1xuICAgICAgICBpZiAodHlwZW9mIEJsb2IgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgYmxvYiA9IG5ldyBCbG9iKFtUaHJlYWRDb2RlKHN1cHBvcnRDb2RlKV0se3R5cGU6XCJ0ZXh0L2phdmFzY3JpcHRcIn0pLCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgICAgZm9yIChsZXQgaT0wO2k8dGhyZWFkcztpKyspIHsgdGhpcy53b3JrZXJzLnB1c2gobmV3IFdvcmtlcih1cmwpKTsgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdXJsID0gVGhyZWFkQ29kZShzdXBwb3J0Q29kZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBcbiAgICAgICAgdGhpcy5yZXBvbnNlSW5kZXggPSAwLCB0aGlzLnJlc3BvbnNlcyA9IHt9O1xuXG4gICAgICAgIC8vIFxuICAgICAgICBsZXQgcmVzcCA9IHRoaXMucmVwb25zZUluZGV4Kys7XG4gICAgICAgIHRoaXMucmVzcG9uc2VzW3Jlc3BdID0gW107XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB3b3JrZXJzXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGZldGNoICE9IFwidW5kZWZpbmVkXCIpIHRoaXMubW9kdWxlRmV0Y2ggPSBhd2FpdCAoYXdhaXQgZmV0Y2gobW9kdWxlKSkuYXJyYXlCdWZmZXIoKTtcbiAgICAgICAgICAgIC8vaWYgKHR5cGVvZiBmZXRjaCA9PSBcInVuZGVmaW5lZFwiKSB0aGlzLm1vZHVsZUZldGNoID0gZnMucmVhZEZpbGVTeW5jKG1vZHVsZSkuYnVmZmVyO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5tb2R1bGUgPSBhd2FpdCBXZWJBc3NlbWJseS5jb21waWxlKHRoaXMubW9kdWxlRmV0Y2gpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjcmVhdGUgc2hhcmVkIG1lbW9yeSBtb2RlbFxuICAgICAgICB0aGlzLm1lbW9yeSA9IG5ldyBXZWJBc3NlbWJseS5NZW1vcnkoe2luaXRpYWw6IDEsIG1heGltdW06IDY1NTM2LCBzaGFyZWQ6IHRydWV9KTtcbiAgICAgICAgLy90aGlzLnRhYmxlID0gbmV3IFdlYkFzc2VtYmx5LlRhYmxlKHtpbml0aWFsOiAxLCBtYXhpbXVtOiA2NTUzNiwgc2hhcmVkOiB0cnVlLCBlbGVtZW50OiBcImFueWZ1bmNcIn0pO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBob3N0L21hbmFnZXIgaW5zdGFuY2VcbiAgICAgICAgKHRoaXMuaW5zdGFuY2UgPSBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZSh0aGlzLm1vZHVsZSwgeyBlbnY6IHtcbiAgICAgICAgICAgIG1lbW9yeTogdGhpcy5tZW1vcnksXG4gICAgICAgICAgICBhYm9ydDogZnVuY3Rpb24oKSB7IHRocm93IEVycm9yKFwiYWJvcnQgY2FsbGVkXCIpOyB9XG4gICAgICAgIH19KSkuZXhwb3J0cy5pbml0KHRocmVhZHMpO1xuXG4gICAgICAgIC8vIFxuICAgICAgICB0aGlzLndvcmtlcnMuZXZlcnkoYXN5bmMgKHcsaSk9PntcbiAgICAgICAgICAgIHcucmVzcG9uc2VzID0ge307XG4gICAgICAgICAgICB3Lm9ubWVzc2FnZSA9IChlKT0+eyB3LnJlc3BvbnNlc1tlLmRhdGEucmVzcG9uc2VdLnJlc29sdmVkID0gZS5kYXRhOyB9O1xuXG4gICAgICAgICAgICAvLyBhZGQgbmV3IHRhc2sgaW50byB3b3JrZXJcbiAgICAgICAgICAgIGxldCByZXNwb25zZSA9IHt9OyB3LnJlc3BvbnNlc1tyZXNwXSA9IHJlc3BvbnNlOyAvLyBpbml0aWFsaXplIHJlc29sdmVyXG4gICAgICAgICAgICB0aGlzLnJlc3BvbnNlc1tyZXNwXVtpXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PnsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlc3BvbnNlLCBcInJlc29sdmVkXCIsIHtzZXQ6IHZhbHVlID0+IHsgdmFsdWU/cmVzb2x2ZSh2YWx1ZSk6cmVqZWN0KCk7IH19KTsgfSk7XG5cbiAgICAgICAgICAgIC8vIHNlbmQgY29tbWFuZCBpbnRvIHdvcmtlclxuICAgICAgICAgICAgdy5wb3N0TWVzc2FnZSh7IHJlc3BvbnNlOiByZXNwLCB0eXBlOiBcImluaXRcIiwgbW9kdWxlOiB0aGlzLm1vZHVsZSwgbWVtb3J5OiB0aGlzLm1lbW9yeSwgdGhyZWFkcywgaWQ6IGkgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGF3YWl0IGluaXRpYWxpemF0aW9uIG9mIHdvcmtlcnNcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodGhpcy5yZXNwb25zZXNbcmVzcF0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHdhaXQgdGFzayBieSBJRFxuICAgIGFzeW5jIHdhaXQocmVzcCl7XG4gICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLnJlc3BvbnNlc1tyZXNwXSk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJlc3BvbnNlc1tyZXNwXTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgXG4gICAgLy8gY3JlYXRlIHdvcmsgdGFzayBcbiAgICB0YXNrKHtuYW1lPVwibWFpblwiLGFyZ3M9W119KXtcbiAgICAgICAgLy8gXG4gICAgICAgIGxldCByZXNwID0gdGhpcy5yZXBvbnNlSW5kZXgrKztcbiAgICAgICAgdGhpcy5yZXNwb25zZXNbcmVzcF0gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIGFkZCBuZXcgdGFzayBpbnRvIHdvcmtlclxuICAgICAgICB0aGlzLndvcmtlcnMuZXZlcnkoYXN5bmMgKHcsaSk9PntcbiAgICAgICAgICAgIGxldCByZXNwb25zZSA9IHt9OyB3LnJlc3BvbnNlc1tyZXNwXSA9IHJlc3BvbnNlOyAvLyBpbml0aWFsaXplIHJlc29sdmVyXG4gICAgICAgICAgICB0aGlzLnJlc3BvbnNlc1tyZXNwXVtpXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PnsgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlc3BvbnNlLCBcInJlc29sdmVkXCIsIHtzZXQ6IHZhbHVlID0+IHsgdmFsdWU/cmVzb2x2ZSh2YWx1ZSk6cmVqZWN0KCk7IH19KTsgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBuZXcgV29ya3Rhc2soe25hbWUsYXJncyxyZXNwLHdvcmtncm91cDp0aGlzfSk7XG4gICAgfVxuICAgIFxuICAgIC8vIGFsbG9jYXRlIG1lbW9yeSBmb3Igd29ya1xuICAgIGFsbG9jYXRlKHNpemUgPSA0KXtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UuZXhwb3J0cy5hbGxvY2F0ZShzaXplKTtcbiAgICB9XG5cbiAgICAvLyBmcmVlIG1lbW9yeSBwb2ludGVyXG4gICAgZnJlZShwb2ludGVyKXtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2UuZXhwb3J0cy5mcmVlKHBvaW50ZXIpO1xuICAgIH1cblxuICAgIC8vIGdldCB3b3JrZ3JvdXAgbWVtb3J5IG9iamVjdCBcbiAgICBtYXAocHRyLCByYW5nZSA9IDAsIHR5cGUgPSBVaW50OEFycmF5KXtcbiAgICAgICAgaWYgKHJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHR5cGUodGhpcy5pbnN0YW5jZS5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0ciwgcmFuZ2UpOyAvLyBSYW5nZWRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgdHlwZSh0aGlzLmluc3RhbmNlLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyKTsgLy8gV2hvbGUgU2l6ZSAobWF5IHVzZWQgZm9yIFdlYkdQVSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgV29ya3Rhc2sge1xuICAgIGNvbnN0cnVjdG9yKHtuYW1lPVwibWFpblwiLGFyZ3M9W10scmVzcD0wLHdvcmtncm91cH0pIHtcbiAgICAgICAgdGhpcy53b3JrZ3JvdXAgPSB3b3JrZ3JvdXAsIHRoaXMucmVzcCA9IHJlc3AsIHRoaXMuYXJncyA9IGFyZ3MsIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgfVxuXG4gICAgLy8gc2VuZCBjb21tYW5kIGZvciBjb21wdXRpbmdcbiAgICBhc3luYyBkaXNwYXRjaCgpIHtcbiAgICAgICAgLy8vcmV0dXJuIHRoaXMud29ya2dyb3VwLmluc3RhbmNlLmV4cG9ydHNbdGhpcy5uYW1lXSgwLCAuLi50aGlzLmFyZ3MpO1xuICAgICAgICB0aGlzLndvcmtncm91cC53b3JrZXJzLmV2ZXJ5KGFzeW5jICh3LGkpPT57XG4gICAgICAgICAgICB3LnBvc3RNZXNzYWdlKHsgdHlwZTogXCJkaXNwYXRjaFwiLCBpZDppLCByZXNwb25zZTogdGhpcy5yZXNwLCBuYW1lOiB0aGlzLm5hbWUsIGFyZ3M6IHRoaXMuYXJncyB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLndvcmtncm91cC53YWl0KHRoaXMucmVzcCk7XG4gICAgfVxuXG4gICAgLy8gc2VuZCBjb21tYW5kIGZvciBqYXZhc2NyaXB0IGhvc3QgbWFuYWdlclxuICAgIGFzeW5jIHN1cHBvcnQoKSB7XG4gICAgICAgIC8vL3JldHVybiB0aGlzLndvcmtncm91cC5pbnN0YW5jZS5leHBvcnRzW3RoaXMubmFtZV0oMCwgLi4udGhpcy5hcmdzKTtcbiAgICAgICAgdGhpcy53b3JrZ3JvdXAud29ya2Vycy5ldmVyeShhc3luYyAodyxpKT0+e1xuICAgICAgICAgICAgdy5wb3N0TWVzc2FnZSh7IHR5cGU6IFwic3VwcG9ydFwiLCBpZDppLCByZXNwb25zZTogdGhpcy5yZXNwLCBuYW1lOiB0aGlzLm5hbWUsIGFyZ3M6IHRoaXMuYXJncyB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLndvcmtncm91cC53YWl0KHRoaXMucmVzcCk7XG4gICAgfVxuXG4gICAgLy8gZ2V0IHRhc2sgSUQgKG5vdCByZWNvbW1lbmRlZClcbiAgICBnZXQgaWQoKSB7IHJldHVybiB0aGlzLnJlc3A7IH1cbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICAgIGFzeW5jIGluaXQoKSB7IHJldHVybiAwOyB9LFxuICAgIGFzeW5jIHdvcmtncm91cChtb2R1bGUsIHRocmVhZHMgPSAxLHN1cHBvcnQ9YGApIHtcbiAgICAgICAgcmV0dXJuIG5ldyBXb3JrZ3JvdXAoKS5pbml0aWF0ZShtb2R1bGUsdGhyZWFkcyxzdXBwb3J0KTtcbiAgICB9XG59O1xuIl0sInNvdXJjZVJvb3QiOiIifQ==