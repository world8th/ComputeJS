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

let ThreadCode = (support = ``)=>{ return `
let instance = null, threads = 1, id = 0;
//let table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

// thread native dispatcher 
onmessage = async (e)=>{
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

    postMessage(Object.assign(e.data, {result}));
}
`};

class Workgroup {
    constructor(){
        
    }
    
    async initiate(module, threads = 1, supportCode = ``){
        //WebAssembly.instantiateStreaming(fetch(
        this.workers = [];

        // initialize threads
        let blob = new Blob([ThreadCode(supportCode)],{type:"text/javascript"}), url = URL.createObjectURL(blob);
        for (let i=0;i<threads;i++) { this.workers.push(new Worker(url)); }

        // 
        this.reponseIndex = 0, this.responses = {};

        // 
        let resp = this.reponseIndex++;
        this.responses[resp] = [];

        // initialize workers
        this.moduleFetch = (await fetch(module)).arrayBuffer();
        this.module = await WebAssembly.compile(await this.moduleFetch);

        // create shared memory model
        this.memory = new WebAssembly.Memory({initial: 1, maximum: 65536, shared: true});
        //this.table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

        // create host/manager instance
        this.instance = await WebAssembly.instantiate(this.module, { env: {
            memory: this.memory,
            abort: function() { throw Error("abort called"); }
        }});
        this.instance.exports.init(threads);

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
    ctx.drawImage(image, 0, 0);
    let imageData = ctx.getImageData(0, 0, 640, 480);
    let size = Math.min(imageData.width * imageData.height * 4, 1024 * 1024 * 1024);
    let buffer = workgroup.allocate(size);
    let map = workgroup.map(buffer, size, Uint8Array);
    map.set(imageData.data);
    console.log("allocation of shared memory complete!");
    await workgroup.task({ name: "main", args: [imageData.width, imageData.height, buffer] }).support();
    console.log("compute done!");
    imageData.data.set(map);
    console.log(`copied back data with ${size} bytes!`);
    ctx.putImageData(imageData, 0, 0);
})();


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4uL2J1aWxkL2xpYi9jb21wdXRlLmpzIiwid2VicGFjazovLy8uL2dyYXlzY2FsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO1FBQUE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7OztRQUdBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwwQ0FBMEMsZ0NBQWdDO1FBQzFFO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0Esd0RBQXdELGtCQUFrQjtRQUMxRTtRQUNBLGlEQUFpRCxjQUFjO1FBQy9EOztRQUVBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQSx5Q0FBeUMsaUNBQWlDO1FBQzFFLGdIQUFnSCxtQkFBbUIsRUFBRTtRQUNySTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDJCQUEyQiwwQkFBMEIsRUFBRTtRQUN2RCxpQ0FBaUMsZUFBZTtRQUNoRDtRQUNBO1FBQ0E7O1FBRUE7UUFDQSxzREFBc0QsK0RBQStEOztRQUVySDtRQUNBOzs7UUFHQTtRQUNBOzs7Ozs7Ozs7Ozs7Ozs7QUNqRkEsa0NBQWtDO0FBQ2xDO0FBQ0EscUNBQXFDLDZEQUE2RDs7QUFFbEc7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsaUVBQWlFO0FBQ2pFLCtCQUErQiw2QkFBNkIsRUFBRTtBQUM5RCxVQUFVOztBQUVWO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0EsbUJBQW1CLFFBQVE7QUFDM0I7O0FBRUEsdUNBQXVDLE9BQU87QUFDOUM7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLHVEQUF1RCx1QkFBdUI7QUFDOUUs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Q0FBQztJQUd0QyxJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFhLE1BQU0sRUFBQyxJQUFJLEVBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0lBR3JELE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNsRyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRzdCLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLElBQUksU0FBUyxDQUFDLENBQUM7SUFHcEQsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiZ3JheXNjYWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZ2V0dGVyIH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gXHRcdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuIFx0XHR9XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4gXHR9O1xuXG4gXHQvLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3RcbiBcdC8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuIFx0Ly8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4gXHQvLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3RcbiBcdC8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbiBcdF9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG4gXHRcdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IF9fd2VicGFja19yZXF1aXJlX18odmFsdWUpO1xuIFx0XHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuIFx0XHRpZigobW9kZSAmIDQpICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgJiYgdmFsdWUuX19lc01vZHVsZSkgcmV0dXJuIHZhbHVlO1xuIFx0XHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobnMsICdkZWZhdWx0JywgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdmFsdWUgfSk7XG4gXHRcdGlmKG1vZGUgJiAyICYmIHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgZm9yKHZhciBrZXkgaW4gdmFsdWUpIF9fd2VicGFja19yZXF1aXJlX18uZChucywga2V5LCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHZhbHVlW2tleV07IH0uYmluZChudWxsLCBrZXkpKTtcbiBcdFx0cmV0dXJuIG5zO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IFwiLi9ncmF5c2NhbGUudHNcIik7XG4iLCJcbmxldCBUaHJlYWRDb2RlID0gKHN1cHBvcnQgPSBgYCk9PnsgcmV0dXJuIGBcbmxldCBpbnN0YW5jZSA9IG51bGwsIHRocmVhZHMgPSAxLCBpZCA9IDA7XG4vL2xldCB0YWJsZSA9IG5ldyBXZWJBc3NlbWJseS5UYWJsZSh7aW5pdGlhbDogMSwgbWF4aW11bTogNjU1MzYsIHNoYXJlZDogdHJ1ZSwgZWxlbWVudDogXCJhbnlmdW5jXCJ9KTtcblxuLy8gdGhyZWFkIG5hdGl2ZSBkaXNwYXRjaGVyIFxub25tZXNzYWdlID0gYXN5bmMgKGUpPT57XG4gICAgbGV0IHJlc3VsdCA9IG51bGw7XG4gICAgXG4gICAgaWYgKGUuZGF0YS50eXBlID09IFwiaW5pdFwiKSB7XG4gICAgICAgIHRocmVhZHMgPSBlLmRhdGEudGhyZWFkcywgaWQgPSBlLmRhdGEuaWQ7XG5cbiAgICAgICAgaW5zdGFuY2UgPSBhd2FpdCBXZWJBc3NlbWJseS5pbnN0YW50aWF0ZShlLmRhdGEubW9kdWxlLCB7IGVudjoge1xuICAgICAgICAgICAgYWJvcnQ6IGZ1bmN0aW9uKCkgeyB0aHJvdyBFcnJvcihcImFib3J0IGNhbGxlZFwiKTsgfSwgbWVtb3J5OiBlLmRhdGEubWVtb3J5XG4gICAgICAgIH19KTtcblxuICAgICAgICByZXN1bHQgPSBhd2FpdCBpbnN0YW5jZS5leHBvcnRzLmluaXQodGhyZWFkcyk7XG4gICAgfVxuICAgIFxuICAgIGlmIChlLmRhdGEudHlwZSA9PSBcImRpc3BhdGNoXCIpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgaW5zdGFuY2UuZXhwb3J0c1tlLmRhdGEubmFtZV0oaWQsIC4uLmUuZGF0YS5hcmdzKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKGUuZGF0YS50eXBlID09IFwic3VwcG9ydFwiKSB7XG4gICAgICAgIHJlc3VsdCA9ICR7c3VwcG9ydH0oZS5kYXRhKTtcbiAgICB9XG5cbiAgICBwb3N0TWVzc2FnZShPYmplY3QuYXNzaWduKGUuZGF0YSwge3Jlc3VsdH0pKTtcbn1cbmB9O1xuXG5jbGFzcyBXb3JrZ3JvdXAge1xuICAgIGNvbnN0cnVjdG9yKCl7XG4gICAgICAgIFxuICAgIH1cbiAgICBcbiAgICBhc3luYyBpbml0aWF0ZShtb2R1bGUsIHRocmVhZHMgPSAxLCBzdXBwb3J0Q29kZSA9IGBgKXtcbiAgICAgICAgLy9XZWJBc3NlbWJseS5pbnN0YW50aWF0ZVN0cmVhbWluZyhmZXRjaChcbiAgICAgICAgdGhpcy53b3JrZXJzID0gW107XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB0aHJlYWRzXG4gICAgICAgIGxldCBibG9iID0gbmV3IEJsb2IoW1RocmVhZENvZGUoc3VwcG9ydENvZGUpXSx7dHlwZTpcInRleHQvamF2YXNjcmlwdFwifSksIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgIGZvciAobGV0IGk9MDtpPHRocmVhZHM7aSsrKSB7IHRoaXMud29ya2Vycy5wdXNoKG5ldyBXb3JrZXIodXJsKSk7IH1cblxuICAgICAgICAvLyBcbiAgICAgICAgdGhpcy5yZXBvbnNlSW5kZXggPSAwLCB0aGlzLnJlc3BvbnNlcyA9IHt9O1xuXG4gICAgICAgIC8vIFxuICAgICAgICBsZXQgcmVzcCA9IHRoaXMucmVwb25zZUluZGV4Kys7XG4gICAgICAgIHRoaXMucmVzcG9uc2VzW3Jlc3BdID0gW107XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZSB3b3JrZXJzXG4gICAgICAgIHRoaXMubW9kdWxlRmV0Y2ggPSAoYXdhaXQgZmV0Y2gobW9kdWxlKSkuYXJyYXlCdWZmZXIoKTtcbiAgICAgICAgdGhpcy5tb2R1bGUgPSBhd2FpdCBXZWJBc3NlbWJseS5jb21waWxlKGF3YWl0IHRoaXMubW9kdWxlRmV0Y2gpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBzaGFyZWQgbWVtb3J5IG1vZGVsXG4gICAgICAgIHRoaXMubWVtb3J5ID0gbmV3IFdlYkFzc2VtYmx5Lk1lbW9yeSh7aW5pdGlhbDogMSwgbWF4aW11bTogNjU1MzYsIHNoYXJlZDogdHJ1ZX0pO1xuICAgICAgICAvL3RoaXMudGFibGUgPSBuZXcgV2ViQXNzZW1ibHkuVGFibGUoe2luaXRpYWw6IDEsIG1heGltdW06IDY1NTM2LCBzaGFyZWQ6IHRydWUsIGVsZW1lbnQ6IFwiYW55ZnVuY1wifSk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGhvc3QvbWFuYWdlciBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlID0gYXdhaXQgV2ViQXNzZW1ibHkuaW5zdGFudGlhdGUodGhpcy5tb2R1bGUsIHsgZW52OiB7XG4gICAgICAgICAgICBtZW1vcnk6IHRoaXMubWVtb3J5LFxuICAgICAgICAgICAgYWJvcnQ6IGZ1bmN0aW9uKCkgeyB0aHJvdyBFcnJvcihcImFib3J0IGNhbGxlZFwiKTsgfVxuICAgICAgICB9fSk7XG4gICAgICAgIHRoaXMuaW5zdGFuY2UuZXhwb3J0cy5pbml0KHRocmVhZHMpO1xuXG4gICAgICAgIHRoaXMud29ya2Vycy5ldmVyeShhc3luYyAodyxpKT0+e1xuICAgICAgICAgICAgdy5yZXNwb25zZXMgPSB7fTtcbiAgICAgICAgICAgIHcub25tZXNzYWdlID0gKGUpPT57IHcucmVzcG9uc2VzW2UuZGF0YS5yZXNwb25zZV0ucmVzb2x2ZWQgPSBlLmRhdGE7IH07XG5cbiAgICAgICAgICAgIC8vIGFkZCBuZXcgdGFzayBpbnRvIHdvcmtlclxuICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0ge307IHcucmVzcG9uc2VzW3Jlc3BdID0gcmVzcG9uc2U7IC8vIGluaXRpYWxpemUgcmVzb2x2ZXJcbiAgICAgICAgICAgIHRoaXMucmVzcG9uc2VzW3Jlc3BdW2ldID0gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+eyBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVzcG9uc2UsIFwicmVzb2x2ZWRcIiwge3NldDogdmFsdWUgPT4geyB2YWx1ZT9yZXNvbHZlKHZhbHVlKTpyZWplY3QoKTsgfX0pOyB9KTtcblxuICAgICAgICAgICAgLy8gc2VuZCBjb21tYW5kIGludG8gd29ya2VyXG4gICAgICAgICAgICB3LnBvc3RNZXNzYWdlKHsgcmVzcG9uc2U6IHJlc3AsIHR5cGU6IFwiaW5pdFwiLCBtb2R1bGU6IHRoaXMubW9kdWxlLCBtZW1vcnk6IHRoaXMubWVtb3J5LCB0aHJlYWRzLCBpZDogaSB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYXdhaXQgaW5pdGlhbGl6YXRpb24gb2Ygd29ya2Vyc1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLnJlc3BvbnNlc1tyZXNwXSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gd2FpdCB0YXNrIGJ5IElEXG4gICAgYXN5bmMgd2FpdChyZXNwKXtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IFByb21pc2UuYWxsKHRoaXMucmVzcG9uc2VzW3Jlc3BdKTtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVzcG9uc2VzW3Jlc3BdO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvLyBjcmVhdGUgd29yayB0YXNrIFxuICAgIHRhc2soe25hbWU9XCJtYWluXCIsYXJncz1bXX0pe1xuICAgICAgICAvLyBcbiAgICAgICAgbGV0IHJlc3AgPSB0aGlzLnJlcG9uc2VJbmRleCsrO1xuICAgICAgICB0aGlzLnJlc3BvbnNlc1tyZXNwXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gYWRkIG5ldyB0YXNrIGludG8gd29ya2VyXG4gICAgICAgIHRoaXMud29ya2Vycy5ldmVyeShhc3luYyAodyxpKT0+e1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0ge307IHcucmVzcG9uc2VzW3Jlc3BdID0gcmVzcG9uc2U7IC8vIGluaXRpYWxpemUgcmVzb2x2ZXJcbiAgICAgICAgICAgIHRoaXMucmVzcG9uc2VzW3Jlc3BdW2ldID0gbmV3IFByb21pc2UoKHJlc29sdmUscmVqZWN0KT0+eyBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVzcG9uc2UsIFwicmVzb2x2ZWRcIiwge3NldDogdmFsdWUgPT4geyB2YWx1ZT9yZXNvbHZlKHZhbHVlKTpyZWplY3QoKTsgfX0pOyB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBXb3JrdGFzayh7bmFtZSxhcmdzLHJlc3Asd29ya2dyb3VwOnRoaXN9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gYWxsb2NhdGUgbWVtb3J5IGZvciB3b3JrXG4gICAgYWxsb2NhdGUoc2l6ZSA9IDQpe1xuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5leHBvcnRzLmFsbG9jYXRlKHNpemUpO1xuICAgIH1cblxuICAgIC8vIGZyZWUgbWVtb3J5IHBvaW50ZXJcbiAgICBmcmVlKHBvaW50ZXIpe1xuICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZS5leHBvcnRzLmZyZWUocG9pbnRlcik7XG4gICAgfVxuXG4gICAgLy8gZ2V0IHdvcmtncm91cCBtZW1vcnkgb2JqZWN0IFxuICAgIG1hcChwdHIsIHJhbmdlID0gMCwgdHlwZSA9IFVpbnQ4QXJyYXkpe1xuICAgICAgICBpZiAocmFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgdHlwZSh0aGlzLmluc3RhbmNlLmV4cG9ydHMubWVtb3J5LmJ1ZmZlciwgcHRyLCByYW5nZSk7IC8vIFJhbmdlZFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0eXBlKHRoaXMuaW5zdGFuY2UuZXhwb3J0cy5tZW1vcnkuYnVmZmVyLCBwdHIpOyAvLyBXaG9sZSBTaXplIChtYXkgdXNlZCBmb3IgV2ViR1BVKVxuICAgICAgICB9XG4gICAgfVxufVxuXG5jbGFzcyBXb3JrdGFzayB7XG4gICAgY29uc3RydWN0b3Ioe25hbWU9XCJtYWluXCIsYXJncz1bXSxyZXNwPTAsd29ya2dyb3VwfSkge1xuICAgICAgICB0aGlzLndvcmtncm91cCA9IHdvcmtncm91cCwgdGhpcy5yZXNwID0gcmVzcCwgdGhpcy5hcmdzID0gYXJncywgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB9XG5cbiAgICAvLyBzZW5kIGNvbW1hbmQgZm9yIGNvbXB1dGluZ1xuICAgIGFzeW5jIGRpc3BhdGNoKCkge1xuICAgICAgICAvLy9yZXR1cm4gdGhpcy53b3JrZ3JvdXAuaW5zdGFuY2UuZXhwb3J0c1t0aGlzLm5hbWVdKDAsIC4uLnRoaXMuYXJncyk7XG4gICAgICAgIHRoaXMud29ya2dyb3VwLndvcmtlcnMuZXZlcnkoYXN5bmMgKHcsaSk9PntcbiAgICAgICAgICAgIHcucG9zdE1lc3NhZ2UoeyB0eXBlOiBcImRpc3BhdGNoXCIsIGlkOmksIHJlc3BvbnNlOiB0aGlzLnJlc3AsIG5hbWU6IHRoaXMubmFtZSwgYXJnczogdGhpcy5hcmdzIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMud29ya2dyb3VwLndhaXQodGhpcy5yZXNwKTtcbiAgICB9XG5cbiAgICAvLyBzZW5kIGNvbW1hbmQgZm9yIGphdmFzY3JpcHQgaG9zdCBtYW5hZ2VyXG4gICAgYXN5bmMgc3VwcG9ydCgpIHtcbiAgICAgICAgLy8vcmV0dXJuIHRoaXMud29ya2dyb3VwLmluc3RhbmNlLmV4cG9ydHNbdGhpcy5uYW1lXSgwLCAuLi50aGlzLmFyZ3MpO1xuICAgICAgICB0aGlzLndvcmtncm91cC53b3JrZXJzLmV2ZXJ5KGFzeW5jICh3LGkpPT57XG4gICAgICAgICAgICB3LnBvc3RNZXNzYWdlKHsgdHlwZTogXCJzdXBwb3J0XCIsIGlkOmksIHJlc3BvbnNlOiB0aGlzLnJlc3AsIG5hbWU6IHRoaXMubmFtZSwgYXJnczogdGhpcy5hcmdzIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXMud29ya2dyb3VwLndhaXQodGhpcy5yZXNwKTtcbiAgICB9XG5cbiAgICAvLyBnZXQgdGFzayBJRCAobm90IHJlY29tbWVuZGVkKVxuICAgIGdldCBpZCgpIHsgcmV0dXJuIHRoaXMucmVzcDsgfVxufVxuXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgYXN5bmMgaW5pdCgpIHsgcmV0dXJuIDA7IH0sXG4gICAgYXN5bmMgd29ya2dyb3VwKG1vZHVsZSwgdGhyZWFkcyA9IDEsc3VwcG9ydD1gYCkge1xuICAgICAgICByZXR1cm4gbmV3IFdvcmtncm91cCgpLmluaXRpYXRlKG1vZHVsZSx0aHJlYWRzLHN1cHBvcnQpO1xuICAgIH1cbn07XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vYnVpbGQvbGliL2NvbXB1dGUuZC50c1wiIC8+XHJcblxyXG5pbXBvcnQgeyBDb21wdXRlIH0gZnJvbSBcIi4uL2J1aWxkL2xpYi9jb21wdXRlLmpzXCI7XHJcblxyXG4oYXN5bmMgKCk9PntcclxuICAgIGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNjYW52YXNcIik7XHJcbiAgICBsZXQgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgICAvLyBsb2FkIGltYWdlIChzaW1wbGVyKVxyXG4gICAgbGV0IGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICBpbWFnZS5vbmxvYWQ9cmVzb2x2ZTtcclxuICAgICAgICBpbWFnZS5vbmVycm9yPXJlamVjdDtcclxuICAgIH0pO1xyXG4gICAgaW1hZ2Uuc3JjID0gXCJhc3NldHMvaW1hZ2VzL3Rlc3QucG5nXCI7XHJcbiAgICBhd2FpdCBwcm9taXNlO1xyXG5cclxuICAgIC8vIGltcG9ydCBjb21wdXRlIGxpYnJhcnkgXHJcbiAgICBsZXQgY29tcHV0ZTogQ29tcHV0ZS5Nb2R1bGUgPSAoYXdhaXQgaW1wb3J0KFwiLi9idWlsZC9saWIvY29tcHV0ZS5qc1wiKSkuZGVmYXVsdDsgLy8gUmVxdWlyZWQgVHlwZSBDb252ZXJzaW9uXHJcbiAgICBcclxuICAgIC8vIGNyZWF0ZSB3YXNtIHdvcmtncm91cCAoNCB0aHJlYWRzKSB3aXRoIG1vZHVsZVxyXG4gICAgbGV0IHdvcmtncm91cCA9IGF3YWl0IGNvbXB1dGUud29ya2dyb3VwKFwiLi9idWlsZC9hc3NlbWJseS9vcHRpbWl6ZWQud2FzbVwiLCA2LCBgXHJcbiAgICAgICAgYXdhaXQgKGFzeW5jIChkYXRhKT0+e1xyXG4gICAgICAgICAgICByZXR1cm4gaW5zdGFuY2UuZXhwb3J0c1tkYXRhLm5hbWVdKGlkLCAuLi5kYXRhLmFyZ3MpO1xyXG4gICAgICAgIH0pYCk7XHJcbiAgICBjb25zb2xlLmxvZyhcImNyZWF0ZWQgd29ya2VycyFcIik7XHJcblxyXG4gICAgLy8gXHJcbiAgICBjdHguZHJhd0ltYWdlKGltYWdlLDAsMCk7XHJcblxyXG4gICAgLy9cclxuICAgIGxldCBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsMCw2NDAsNDgwKTtcclxuICAgIGxldCBzaXplID0gTWF0aC5taW4oaW1hZ2VEYXRhLndpZHRoKmltYWdlRGF0YS5oZWlnaHQqNCwxMDI0KjEwMjQqMTAyNCk7XHJcblxyXG4gICAgLy8gYWxsb2NhdGUgc2hhcmVkIG1lbW9yeSBmb3Igd29ya1xyXG4gICAgbGV0IGJ1ZmZlciA9IHdvcmtncm91cC5hbGxvY2F0ZShzaXplKTsgLy8ganVzdCBudW1iZXIgcG9pbnRlclxyXG5cclxuICAgIC8vIG1ha2UgdHlwZWQgYXJyYXkgYW5kIHNldCB3aXRoIGltYWdlIGRhdGEgXHJcbiAgICBsZXQgbWFwID0gd29ya2dyb3VwLm1hcDxVaW50OEFycmF5PihidWZmZXIsc2l6ZSxVaW50OEFycmF5KTtcclxuICAgIG1hcC5zZXQoaW1hZ2VEYXRhLmRhdGEpOyAvLyBzZXQgYnkgbWFwcGVkIHJhbmdlXHJcbiAgICBjb25zb2xlLmxvZyhcImFsbG9jYXRpb24gb2Ygc2hhcmVkIG1lbW9yeSBjb21wbGV0ZSFcIik7XHJcblxyXG4gICAgLy8gUnVuIFwic3VwcG9ydFwiIHRhc2sgKGNhbiBydW4gXCJtYWluXCIgd2l0aG91dCBpbnB1dCBkYXRhKVxyXG4gICAgYXdhaXQgd29ya2dyb3VwLnRhc2soe25hbWU6IFwibWFpblwiLCBhcmdzOiBbaW1hZ2VEYXRhLndpZHRoLCBpbWFnZURhdGEuaGVpZ2h0LCBidWZmZXJdfSkuc3VwcG9ydCgpO1xyXG4gICAgY29uc29sZS5sb2coXCJjb21wdXRlIGRvbmUhXCIpO1xyXG5cclxuICAgIC8vIHNldCBpbWFnZURhdGEgYnkgbWFwcGVkIG1lbW9yeVxyXG4gICAgaW1hZ2VEYXRhLmRhdGEuc2V0KG1hcCk7XHJcbiAgICBjb25zb2xlLmxvZyhgY29waWVkIGJhY2sgZGF0YSB3aXRoICR7c2l6ZX0gYnl0ZXMhYCk7XHJcblxyXG4gICAgLy8gcHV0IGltYWdlRGF0YVxyXG4gICAgY3R4LnB1dEltYWdlRGF0YShpbWFnZURhdGEsMCwwKTtcclxufSkoKTtcclxuIl0sInNvdXJjZVJvb3QiOiIifQ==