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

/***/ "../build/lib/compute.js":
/*!*******************************!*\
  !*** ../build/lib/compute.js ***!
  \*******************************/
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
let instance = null, threads = 1, id = 0;
//let table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

// thread native dispatcher 
this.onmessage = async (e)=>{
    const { Worker, isMainThread, parentPort, workerData} = typeof require != "undefined" ? require('worker_threads') : { Worker, isMainThread: false, parentPort: this, workerData: {} };
    
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


/***/ }),

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
    image.src = "assets/images/test.png";
    await promise;
    let compute = (await Promise.resolve().then(() => __webpack_require__(/*! ./build/lib/compute.js */ "../build/lib/compute.js"))).default;
    let workgroup = await compute.workgroup("./build/assembly/optimized.wasm", 6, `
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


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4uL2J1aWxkL2xpYi9jb21wdXRlLmpzIiwid2VicGFjazovLy8uL2dyYXlzY2FsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO1FBQUE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7OztRQUdBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwwQ0FBMEMsZ0NBQWdDO1FBQzFFO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0Esd0RBQXdELGtCQUFrQjtRQUMxRTtRQUNBLGlEQUFpRCxjQUFjO1FBQy9EOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQSx5Q0FBeUMsaUNBQWlDO1FBQzFFLGdIQUFnSCxtQkFBbUIsRUFBRTtRQUNySTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDJCQUEyQiwwQkFBMEIsRUFBRTtRQUN2RCxpQ0FBaUMsZUFBZTtRQUNoRDtRQUNBO1FBQ0E7O1FBRUE7UUFDQSxzREFBc0QsK0RBQStEOztRQUVySDtRQUNBOzs7UUFHQTtRQUNBOzs7Ozs7Ozs7Ozs7O0FDbEZBO0FBQUEsU0FBUywrQ0FBK0MsZ0VBQWdFLDRFQUE0RTtBQUNwTTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxrQ0FBa0M7QUFDbEM7QUFDQSxxQ0FBcUMsNkRBQTZEOztBQUVsRztBQUNBO0FBQ0EsV0FBVyw4Q0FBOEMsZ0VBQWdFLDhEQUE4RDs7QUFFdkw7O0FBRUE7QUFDQTs7QUFFQSxpRUFBaUU7QUFDakUsK0JBQStCLDZCQUE2QixFQUFFO0FBQzlELFVBQVU7O0FBRVY7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxtQkFBbUIsUUFBUTtBQUMzQjs7QUFF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QVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7SUFHeEMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBR3pCLElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQW9CLE1BQU0sRUFBQyxJQUFJLEVBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMxRSxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsTUFBTSxDQUFDLEtBQUssRUFBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDM0QsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0lBR3JELE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM1RixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsRUFBRSxDQUFDIiwiZmlsZSI6ImdyYXlzY2FsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSBcIi4vZ3JheXNjYWxlLnRzXCIpO1xuIiwiLy9jb25zdCB7IFdvcmtlciwgaXNNYWluVGhyZWFkLCBwYXJlbnRQb3J0LCB3b3JrZXJEYXRhIH0gPSB0eXBlb2YgcmVxdWlyZSAhPSBcInVuZGVmaW5lZFwiID8gcmVxdWlyZSgnd29ya2VyX3RocmVhZHMnKSA6IHsgV29ya2VyOiBnbG9iYWwuV29ya2VyLCBpc01haW5UaHJlYWQ6IHRydWUsIHBhcmVudFBvcnQ6IHRoaXMsIHdvcmtlckRhdGE6IHt9IH07XG4vL2NvbnN0IGZldGNoID0gdHlwZW9mIHJlcXVpcmUgIT0gXCJ1bmRlZmluZWRcIiA/IHJlcXVpcmUoJ25vZGUtZmV0Y2gnKSA6IGdsb2JhbC5mZXRjaDtcbi8vY29uc3QgQmxvYiAgPSB0eXBlb2YgcmVxdWlyZSAhPSBcInVuZGVmaW5lZFwiID8gcmVxdWlyZSgnY3Jvc3MtYmxvYicpIDogZ2xvYmFsLkJsb2I7XG4vL2xldCBmcztcbi8vaWYgKHR5cGVvZiByZXF1aXJlICE9IFwidW5kZWZpbmVkXCIpIGZzID0gcmVxdWlyZShcImZzXCIpO1xuXG5sZXQgVGhyZWFkQ29kZSA9IChzdXBwb3J0ID0gYGApPT57IHJldHVybiBgXG5sZXQgaW5zdGFuY2UgPSBudWxsLCB0aHJlYWRzID0gMSwgaWQgPSAwO1xuLy9sZXQgdGFibGUgPSBuZXcgV2ViQXNzZW1ibHkuVGFibGUoe2luaXRpYWw6IDEsIG1heGltdW06IDY1NTM2LCBzaGFyZWQ6IHRydWUsIGVsZW1lbnQ6IFwiYW55ZnVuY1wifSk7XG5cbi8vIHRocmVhZCBuYXRpdmUgZGlzcGF0Y2hlciBcbnRoaXMub25tZXNzYWdlID0gYXN5bmMgKGUpPT57XG4gICAgY29uc3QgeyBXb3JrZXIsIGlzTWFpblRocmVhZCwgcGFyZW50UG9ydCwgd29ya2VyRGF0YX0gPSB0eXBlb2YgcmVxdWlyZSAhPSBcInVuZGVmaW5lZFwiID8gcmVxdWlyZSgnd29ya2VyX3RocmVhZHMnKSA6IHsgV29ya2VyLCBpc01haW5UaHJlYWQ6IGZhbHNlLCBwYXJlbnRQb3J0OiB0aGlzLCB3b3JrZXJEYXRhOiB7fSB9O1xuICAgIFxuICAgIGxldCByZXN1bHQgPSBudWxsO1xuICAgIFxuICAgIGlmIChlLmRhdGEudHlwZSA9PSBcImluaXRcIikge1xuICAgICAgICB0aHJlYWRzID0gZS5kYXRhLnRocmVhZHMsIGlkID0gZS5kYXRhLmlkO1xuXG4gICAgICAgIGluc3RhbmNlID0gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUoZS5kYXRhLm1vZHVsZSwgeyBlbnY6IHtcbiAgICAgICAgICAgIGFib3J0OiBmdW5jdGlvbigpIHsgdGhyb3cgRXJyb3IoXCJhYm9ydCBjYWxsZWRcIik7IH0sIG1lbW9yeTogZS5kYXRhLm1lbW9yeVxuICAgICAgICB9fSk7XG5cbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgaW5zdGFuY2UuZXhwb3J0cy5pbml0KHRocmVhZHMpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZS5kYXRhLnR5cGUgPT0gXCJkaXNwYXRjaFwiKSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IGluc3RhbmNlLmV4cG9ydHNbZS5kYXRhLm5hbWVdKGlkLCAuLi5lLmRhdGEuYXJncyk7XG4gICAgfVxuICAgIFxuICAgIGlmIChlLmRhdGEudHlwZSA9PSBcInN1cHBvcnRcIikge1xuICAgICAgICByZXN1bHQgPSAke3N1cHBvcnR9KGUuZGF0YSk7XG4gICAgfVxuXG4gICAgdGhpcy5wb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKGUuZGF0YSwge3Jlc3VsdH0pKTtcbn1cbmB9O1xuXG5jbGFzcyBXb3JrZ3JvdXAge1xuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIFxuICAgIH1cbiAgICBcbiAgICBhc3luYyBpbml0aWF0ZShtb2R1bGUsIHRocmVhZHMgPSAxLCBzdXBwb3J0Q29kZSA9IGBgKXtcbiAgICAgICAgLy9XZWJBc3NlbWJseS5pbnN0YW50aWF0ZVN0cmVhbWluZyhmZXRjaChcbiAgICAgICAgdGhpcy53b3JrZXJzID0gW107XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB0aHJlYWRzXG4gICAgICAgIGxldCBibG9iID0gbnVsbCwgdXJsID0gXCJcIjtcbiAgICAgICAgaWYgKHR5cGVvZiBCbG9iICE9IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgIGJsb2IgPSBuZXcgQmxvYihbVGhyZWFkQ29kZShzdXBwb3J0Q29kZSldLHt0eXBlOlwidGV4dC9qYXZhc2NyaXB0XCJ9KSwgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgIGZvciAobGV0IGk9MDtpPHRocmVhZHM7aSsrKSB7IHRoaXMud29ya2Vycy5wdXNoKG5ldyBXb3JrZXIodXJsKSk7IH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybCA9IFRocmVhZENvZGUoc3VwcG9ydENvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gXG4gICAgICAgIHRoaXMucmVwb25zZUluZGV4ID0gMCwgdGhpcy5yZXNwb25zZXMgPSB7fTtcblxuICAgICAgICAvLyBcbiAgICAgICAgbGV0IHJlc3AgPSB0aGlzLnJlcG9uc2VJbmRleCsrO1xuICAgICAgICB0aGlzLnJlc3BvbnNlc1tyZXNwXSA9IFtdO1xuXG4gICAgICAgIC8vIGluaXRpYWxpemUgd29ya2Vyc1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBmZXRjaCAhPSBcInVuZGVmaW5lZFwiKSB0aGlzLm1vZHVsZUZldGNoID0gYXdhaXQgKGF3YWl0IGZldGNoKG1vZHVsZSkpLmFycmF5QnVmZmVyKCk7XG4gICAgICAgICAgICAvL2lmICh0eXBlb2YgZmV0Y2ggPT0gXCJ1bmRlZmluZWRcIikgdGhpcy5tb2R1bGVGZXRjaCA9IGZzLnJlYWRGaWxlU3luYyhtb2R1bGUpLmJ1ZmZlcjtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMubW9kdWxlID0gYXdhaXQgV2ViQXNzZW1ibHkuY29tcGlsZSh0aGlzLm1vZHVsZUZldGNoKTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY3JlYXRlIHNoYXJlZCBtZW1vcnkgbW9kZWxcbiAgICAgICAgdGhpcy5tZW1vcnkgPSBuZXcgV2ViQXNzZW1ibHkuTWVtb3J5KHtpbml0aWFsOiAxLCBtYXhpbXVtOiA2NTUzNiwgc2hhcmVkOiB0cnVlfSk7XG4gICAgICAgIC8vdGhpcy50YWJsZSA9IG5ldyBXZWJBc3NlbWJseS5UYWJsZSh7aW5pdGlhbDogMSwgbWF4aW11bTogNjU1MzYsIHNoYXJlZDogdHJ1ZSwgZWxlbWVudDogXCJhbnlmdW5jXCJ9KTtcblxuICAgICAgICAvLyBjcmVhdGUgaG9zdC9tYW5hZ2VyIGluc3RhbmNlXG4gICAgICAgICh0aGlzLmluc3RhbmNlID0gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUodGhpcy5tb2R1bGUsIHsgZW52OiB7XG4gICAgICAgICAgICBtZW1vcnk6IHRoaXMubWVtb3J5LFxuICAgICAgICAgICAgYWJvcnQ6IGZ1bmN0aW9uKCkgeyB0aHJvdyBFcnJvcihcImFib3J0IGNhbGxlZFwiKTsgfVxuICAgICAgICB9fSkpLmV4cG9ydHMuaW5pdCh0aHJlYWRzKTtcblxuICAgICAgICAvLyBcbiAgICAgICAgdGhpcy53b3JrZXJzLmV2ZXJ5KGFzeW5jICh3LGkpPT57XG4gICAgICAgICAgICB3LnJlc3BvbnNlcyA9IHt9O1xuICAgICAgICAgICAgdy5vbm1lc3NhZ2UgPSAoZSk9Pnsgdy5yZXNwb25zZXNbZS5kYXRhLnJlc3BvbnNlXS5yZXNvbHZlZCA9IGUuZGF0YTsgfTtcblxuICAgICAgICAgICAgLy8gYWRkIG5ldyB0YXNrIGludG8gd29ya2VyXG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSB7fTsgdy5yZXNwb25zZXNbcmVzcF0gPSByZXNwb25zZTsgLy8gaW5pdGlhbGl6ZSByZXNvbHZlclxuICAgICAgICAgICAgdGhpcy5yZXNwb25zZXNbcmVzcF1baV0gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXNwb25zZSwgXCJyZXNvbHZlZFwiLCB7c2V0OiB2YWx1ZSA9PiB7IHZhbHVlP3Jlc29sdmUodmFsdWUpOnJlamVjdCgpOyB9fSk7IH0pO1xuXG4gICAgICAgICAgICAvLyBzZW5kIGNvbW1hbmQgaW50byB3b3JrZXJcbiAgICAgICAgICAgIHcucG9zdE1lc3NhZ2UoeyByZXNwb25zZTogcmVzcCwgdHlwZTogXCJpbml0XCIsIG1vZHVsZTogdGhpcy5tb2R1bGUsIG1lbW9yeTogdGhpcy5tZW1vcnksIHRocmVhZHMsIGlkOiBpIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBhd2FpdCBpbml0aWFsaXphdGlvbiBvZiB3b3JrZXJzXG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKHRoaXMucmVzcG9uc2VzW3Jlc3BdKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyB3YWl0IHRhc2sgYnkgSURcbiAgICBhc3luYyB3YWl0KHJlc3Ape1xuICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgUHJvbWlzZS5hbGwodGhpcy5yZXNwb25zZXNbcmVzcF0pO1xuICAgICAgICBkZWxldGUgdGhpcy5yZXNwb25zZXNbcmVzcF07XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIFxuICAgIC8vIGNyZWF0ZSB3b3JrIHRhc2sgXG4gICAgdGFzayh7bmFtZT1cIm1haW5cIixhcmdzPVtdfSl7XG4gICAgICAgIC8vIFxuICAgICAgICBsZXQgcmVzcCA9IHRoaXMucmVwb25zZUluZGV4Kys7XG4gICAgICAgIHRoaXMucmVzcG9uc2VzW3Jlc3BdID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBhZGQgbmV3IHRhc2sgaW50byB3b3JrZXJcbiAgICAgICAgdGhpcy53b3JrZXJzLmV2ZXJ5KGFzeW5jICh3LGkpPT57XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSB7fTsgdy5yZXNwb25zZXNbcmVzcF0gPSByZXNwb25zZTsgLy8gaW5pdGlhbGl6ZSByZXNvbHZlclxuICAgICAgICAgICAgdGhpcy5yZXNwb25zZXNbcmVzcF1baV0gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXNwb25zZSwgXCJyZXNvbHZlZFwiLCB7c2V0OiB2YWx1ZSA9PiB7IHZhbHVlP3Jlc29sdmUodmFsdWUpOnJlamVjdCgpOyB9fSk7IH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gbmV3IFdvcmt0YXNrKHtuYW1lLGFyZ3MscmVzcCx3b3JrZ3JvdXA6dGhpc30pO1xuICAgIH1cbiAgICBcbiAgICAvLyBhbGxvY2F0ZSBtZW1vcnkgZm9yIHdvcmtcbiAgICBhbGxvY2F0ZShzaXplID0gNCl7XG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlLmV4cG9ydHMuYWxsb2NhdGUoc2l6ZSk7XG4gICAgfVxuXG4gICAgLy8gZnJlZSBtZW1vcnkgcG9pbnRlclxuICAgIGZyZWUocG9pbnRlcil7XG4gICAgICAgIHJldHVybiB0aGlzLmluc3RhbmNlLmV4cG9ydHMuZnJlZShwb2ludGVyKTtcbiAgICB9XG5cbiAgICAvLyBnZXQgd29ya2dyb3VwIG1lbW9yeSBvYmplY3QgXG4gICAgbWFwKHB0ciwgcmFuZ2UgPSAwLCB0eXBlID0gVWludDhBcnJheSl7XG4gICAgICAgIGlmIChyYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0eXBlKHRoaXMuaW5zdGFuY2UuZXhwb3J0cy5tZW1vcnkuYnVmZmVyLCBwdHIsIHJhbmdlKTsgLy8gUmFuZ2VkXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHR5cGUodGhpcy5pbnN0YW5jZS5leHBvcnRzLm1lbW9yeS5idWZmZXIsIHB0cik7IC8vIFdob2xlIFNpemUgKG1heSB1c2VkIGZvciBXZWJHUFUpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNsYXNzIFdvcmt0YXNrIHtcbiAgICBjb25zdHJ1Y3Rvcih7bmFtZT1cIm1haW5cIixhcmdzPVtdLHJlc3A9MCx3b3JrZ3JvdXB9KSB7XG4gICAgICAgIHRoaXMud29ya2dyb3VwID0gd29ya2dyb3VwLCB0aGlzLnJlc3AgPSByZXNwLCB0aGlzLmFyZ3MgPSBhcmdzLCB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIH1cblxuICAgIC8vIHNlbmQgY29tbWFuZCBmb3IgY29tcHV0aW5nXG4gICAgYXN5bmMgZGlzcGF0Y2goKSB7XG4gICAgICAgIC8vL3JldHVybiB0aGlzLndvcmtncm91cC5pbnN0YW5jZS5leHBvcnRzW3RoaXMubmFtZV0oMCwgLi4udGhpcy5hcmdzKTtcbiAgICAgICAgdGhpcy53b3JrZ3JvdXAud29ya2Vycy5ldmVyeShhc3luYyAodyxpKT0+e1xuICAgICAgICAgICAgdy5wb3N0TWVzc2FnZSh7IHR5cGU6IFwiZGlzcGF0Y2hcIiwgaWQ6aSwgcmVzcG9uc2U6IHRoaXMucmVzcCwgbmFtZTogdGhpcy5uYW1lLCBhcmdzOiB0aGlzLmFyZ3MgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy53b3JrZ3JvdXAud2FpdCh0aGlzLnJlc3ApO1xuICAgIH1cblxuICAgIC8vIHNlbmQgY29tbWFuZCBmb3IgamF2YXNjcmlwdCBob3N0IG1hbmFnZXJcbiAgICBhc3luYyBzdXBwb3J0KCkge1xuICAgICAgICAvLy9yZXR1cm4gdGhpcy53b3JrZ3JvdXAuaW5zdGFuY2UuZXhwb3J0c1t0aGlzLm5hbWVdKDAsIC4uLnRoaXMuYXJncyk7XG4gICAgICAgIHRoaXMud29ya2dyb3VwLndvcmtlcnMuZXZlcnkoYXN5bmMgKHcsaSk9PntcbiAgICAgICAgICAgIHcucG9zdE1lc3NhZ2UoeyB0eXBlOiBcInN1cHBvcnRcIiwgaWQ6aSwgcmVzcG9uc2U6IHRoaXMucmVzcCwgbmFtZTogdGhpcy5uYW1lLCBhcmdzOiB0aGlzLmFyZ3MgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy53b3JrZ3JvdXAud2FpdCh0aGlzLnJlc3ApO1xuICAgIH1cblxuICAgIC8vIGdldCB0YXNrIElEIChub3QgcmVjb21tZW5kZWQpXG4gICAgZ2V0IGlkKCkgeyByZXR1cm4gdGhpcy5yZXNwOyB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgICBhc3luYyBpbml0KCkgeyByZXR1cm4gMDsgfSxcbiAgICBhc3luYyB3b3JrZ3JvdXAobW9kdWxlLCB0aHJlYWRzID0gMSxzdXBwb3J0PWBgKSB7XG4gICAgICAgIHJldHVybiBuZXcgV29ya2dyb3VwKCkuaW5pdGlhdGUobW9kdWxlLHRocmVhZHMsc3VwcG9ydCk7XG4gICAgfVxufTtcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9idWlsZC9saWIvY29tcHV0ZS5kLnRzXCIgLz5cclxuXHJcbmltcG9ydCB7IENvbXB1dGUgfSBmcm9tIFwiLi4vYnVpbGQvbGliL2NvbXB1dGUuanNcIjtcclxuXHJcbihhc3luYyAoKT0+e1xyXG4gICAgbGV0IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NhbnZhc1wiKTtcclxuICAgIGxldCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxuICAgIC8vIGxvYWQgaW1hZ2UgKHNpbXBsZXIpXHJcbiAgICBsZXQgaW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuICAgIGxldCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+e1xyXG4gICAgICAgIGltYWdlLm9ubG9hZD1yZXNvbHZlO1xyXG4gICAgICAgIGltYWdlLm9uZXJyb3I9cmVqZWN0O1xyXG4gICAgfSk7XHJcbiAgICBpbWFnZS5zcmMgPSBcImFzc2V0cy9pbWFnZXMvdGVzdC5wbmdcIjtcclxuICAgIGF3YWl0IHByb21pc2U7XHJcblxyXG4gICAgLy8gaW1wb3J0IGNvbXB1dGUgbGlicmFyeSBcclxuICAgIGxldCBjb21wdXRlOiBDb21wdXRlLk1vZHVsZSA9IChhd2FpdCBpbXBvcnQoXCIuL2J1aWxkL2xpYi9jb21wdXRlLmpzXCIpKS5kZWZhdWx0OyAvLyBSZXF1aXJlZCBUeXBlIENvbnZlcnNpb25cclxuICAgIFxyXG4gICAgLy8gY3JlYXRlIHdhc20gd29ya2dyb3VwICg0IHRocmVhZHMpIHdpdGggbW9kdWxlXHJcbiAgICBsZXQgd29ya2dyb3VwID0gYXdhaXQgY29tcHV0ZS53b3JrZ3JvdXAoXCIuL2J1aWxkL2Fzc2VtYmx5L29wdGltaXplZC53YXNtXCIsIDYsIGBcclxuICAgICAgICBhd2FpdCAoYXN5bmMgKGRhdGEpPT57XHJcbiAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZS5leHBvcnRzW2RhdGEubmFtZV0oaWQsIC4uLmRhdGEuYXJncyk7XHJcbiAgICAgICAgfSlgKTtcclxuICAgIGNvbnNvbGUubG9nKFwiY3JlYXRlZCB3b3JrZXJzIVwiKTtcclxuXHJcbiAgICAvLyBhbGxvY2F0ZSBzaGFyZWQgbWVtb3J5IGZvciB3b3JrXHJcbiAgICBjb25zdCBzaXplID0gTWF0aC5taW4oY2FudmFzLndpZHRoKmNhbnZhcy5oZWlnaHQqNCwxMDI0KjEwMjQqMTAyNCk7XHJcbiAgICBjb25zdCBidWZmZXIgPSB3b3JrZ3JvdXAuYWxsb2NhdGUoc2l6ZSk7IC8vIGp1c3QgbnVtYmVyIHBvaW50ZXJcclxuXHJcbiAgICAvLyBcclxuICAgIGN0eC5kcmF3SW1hZ2UoaW1hZ2UsMCwwKTtcclxuXHJcbiAgICAvLyBtYWtlIHR5cGVkIGFycmF5IGFuZCBzZXQgd2l0aCBpbWFnZSBkYXRhIFxyXG4gICAgbGV0IG1hcCA9IHdvcmtncm91cC5tYXA8VWludDhDbGFtcGVkQXJyYXk+KGJ1ZmZlcixzaXplLFVpbnQ4Q2xhbXBlZEFycmF5KTtcclxuICAgIGxldCBpbWcgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsMCxjYW52YXMud2lkdGgsY2FudmFzLmhlaWdodCk7XHJcbiAgICBtYXAuc2V0KGltZy5kYXRhKTsgLy8gc2V0IGJ5IG1hcHBlZCByYW5nZVxyXG4gICAgY29uc29sZS5sb2coXCJhbGxvY2F0aW9uIG9mIHNoYXJlZCBtZW1vcnkgY29tcGxldGUhXCIpO1xyXG5cclxuICAgIC8vIFJ1biBcInN1cHBvcnRcIiB0YXNrIChjYW4gcnVuIFwibWFpblwiIHdpdGhvdXQgaW5wdXQgZGF0YSlcclxuICAgIGF3YWl0IHdvcmtncm91cC50YXNrKHtuYW1lOiBcIm1haW5cIiwgYXJnczogW2NhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCwgYnVmZmVyXX0pLnN1cHBvcnQoKTtcclxuICAgIGNvbnNvbGUubG9nKFwiY29tcHV0ZSBkb25lIVwiKTtcclxuXHJcbiAgICAvLyBwdXQgaW1hZ2VEYXRhXHJcbiAgICBpbWcuZGF0YS5zZXQobWFwKTtcclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1nLDAsMCk7XHJcbn0pKCk7XHJcbiJdLCJzb3VyY2VSb290IjoiIn0=