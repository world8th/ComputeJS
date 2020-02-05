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
/******/ 	return __webpack_require__(__webpack_require__.s = "./grayscaleWG.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./grayscaleWG.ts":
/*!************************!*\
  !*** ./grayscaleWG.ts ***!
  \************************/
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
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    console.log("Creating Pipeline");
    const bindGroupLayout = device.createBindGroupLayout({
        bindings: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer" }
        ]
    });
    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
        computeStage: { entryPoint: "main", module: device.createShaderModule({ code: new Uint32Array(await (await fetch("./build/shaders/grayscale.comp.spv")).arrayBuffer()) }) }
    });
    console.log("Compute Ready");
    const size = Math.min(canvas.width * canvas.height * 4, 1024 * 1024 * 1024);
    const gpuBuffer = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        bindings: [
            { binding: 0, resource: { buffer: gpuBuffer } }
        ]
    });
    const dataBuffer = device.createBuffer({ size, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE });
    const readBuffer = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const mapData = dataBuffer.mapWriteAsync();
    ctx.drawImage(image, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    new Uint8Array(await mapData).set(imgData);
    dataBuffer.unmap();
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(dataBuffer, 0, gpuBuffer, 0, size);
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatch(size >> 9, 1, 1);
    passEncoder.endPass();
    commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, size);
    console.log("Command Submission");
    device.defaultQueue.submit([commandEncoder.finish()]);
    console.log("Copying from GPU");
    ctx.putImageData(new ImageData(new Uint8ClampedArray(await readBuffer.mapReadAsync(), 0, size), canvas.width, canvas.height), 0, 0);
    console.log("Sot ImageData");
    readBuffer.unmap();
})();


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vZ3JheXNjYWxlV0cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtRQUFBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBOzs7UUFHQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMENBQTBDLGdDQUFnQztRQUMxRTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLHdEQUF3RCxrQkFBa0I7UUFDMUU7UUFDQSxpREFBaUQsY0FBYztRQUMvRDs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0EseUNBQXlDLGlDQUFpQztRQUMxRSxnSEFBZ0gsbUJBQW1CLEVBQUU7UUFDckk7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSwyQkFBMkIsMEJBQTBCLEVBQUU7UUFDdkQsaUNBQWlDLGVBQWU7UUFDaEQ7UUFDQTtRQUNBOztRQUVBO1FBQ0Esc0RBQXNELCtEQUErRDs7UUFFckg7UUFDQTs7O1FBR0E7UUFDQTs7Ozs7Ozs7Ozs7Ozs7O0FDOUVBLENBQUMsS0FBSyxJQUFHLEVBQUU7SUFDUCxJQUFJLE1BQU0sR0FBc0IsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNsRSxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBR2xDLElBQUksS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7SUFDeEIsSUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUMsTUFBTSxFQUFDLEVBQUU7UUFDeEMsS0FBSyxDQUFDLE1BQU0sR0FBQyxPQUFPLENBQUM7UUFDckIsS0FBSyxDQUFDLE9B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LyBUaGUgbW9kdWxlIGNhY2hlXG4gXHR2YXIgaW5zdGFsbGVkTW9kdWxlcyA9IHt9O1xuXG4gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXG4gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuIFx0XHRpZihpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSkge1xuIFx0XHRcdHJldHVybiBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXS5leHBvcnRzO1xuIFx0XHR9XG4gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4gXHRcdHZhciBtb2R1bGUgPSBpbnN0YWxsZWRNb2R1bGVzW21vZHVsZUlkXSA9IHtcbiBcdFx0XHRpOiBtb2R1bGVJZCxcbiBcdFx0XHRsOiBmYWxzZSxcbiBcdFx0XHRleHBvcnRzOiB7fVxuIFx0XHR9O1xuXG4gXHRcdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuIFx0XHRtb2R1bGVzW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuIFx0XHQvLyBGbGFnIHRoZSBtb2R1bGUgYXMgbG9hZGVkXG4gXHRcdG1vZHVsZS5sID0gdHJ1ZTtcblxuIFx0XHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gXHR9XG5cblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubSA9IG1vZHVsZXM7XG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlIGNhY2hlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmMgPSBpbnN0YWxsZWRNb2R1bGVzO1xuXG4gXHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9uIGZvciBoYXJtb255IGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IGZ1bmN0aW9uKGV4cG9ydHMsIG5hbWUsIGdldHRlcikge1xuIFx0XHRpZighX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIG5hbWUpKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIG5hbWUsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBnZXR0ZXIgfSk7XG4gXHRcdH1cbiBcdH07XG5cbiBcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbiBcdF9fd2VicGFja19yZXF1aXJlX18uciA9IGZ1bmN0aW9uKGV4cG9ydHMpIHtcbiBcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG4gXHRcdH1cbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbiBcdH07XG5cbiBcdC8vIGNyZWF0ZSBhIGZha2UgbmFtZXNwYWNlIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDE6IHZhbHVlIGlzIGEgbW9kdWxlIGlkLCByZXF1aXJlIGl0XG4gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbiBcdC8vIG1vZGUgJiA0OiByZXR1cm4gdmFsdWUgd2hlbiBhbHJlYWR5IG5zIG9iamVjdFxuIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy50ID0gZnVuY3Rpb24odmFsdWUsIG1vZGUpIHtcbiBcdFx0aWYobW9kZSAmIDEpIHZhbHVlID0gX193ZWJwYWNrX3JlcXVpcmVfXyh2YWx1ZSk7XG4gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4gXHRcdGlmKChtb2RlICYgNCkgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4gXHRcdHZhciBucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShucywgJ2RlZmF1bHQnLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiBcdFx0aWYobW9kZSAmIDIgJiYgdHlwZW9mIHZhbHVlICE9ICdzdHJpbmcnKSBmb3IodmFyIGtleSBpbiB2YWx1ZSkgX193ZWJwYWNrX3JlcXVpcmVfXy5kKG5zLCBrZXksIGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdmFsdWVba2V5XTsgfS5iaW5kKG51bGwsIGtleSkpO1xuIFx0XHRyZXR1cm4gbnM7XG4gXHR9O1xuXG4gXHQvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5uID0gZnVuY3Rpb24obW9kdWxlKSB7XG4gXHRcdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuIFx0XHRcdGZ1bmN0aW9uIGdldERlZmF1bHQoKSB7IHJldHVybiBtb2R1bGVbJ2RlZmF1bHQnXTsgfSA6XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0TW9kdWxlRXhwb3J0cygpIHsgcmV0dXJuIG1vZHVsZTsgfTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgJ2EnLCBnZXR0ZXIpO1xuIFx0XHRyZXR1cm4gZ2V0dGVyO1xuIFx0fTtcblxuIFx0Ly8gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7IHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSk7IH07XG5cbiBcdC8vIF9fd2VicGFja19wdWJsaWNfcGF0aF9fXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnAgPSBcIlwiO1xuXG5cbiBcdC8vIExvYWQgZW50cnkgbW9kdWxlIGFuZCByZXR1cm4gZXhwb3J0c1xuIFx0cmV0dXJuIF9fd2VicGFja19yZXF1aXJlX18oX193ZWJwYWNrX3JlcXVpcmVfXy5zID0gXCIuL2dyYXlzY2FsZVdHLnRzXCIpO1xuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL2J1aWxkL2xpYi9jb21wdXRlLmQudHNcIiAvPlxyXG5cclxuaW1wb3J0IHsgQ29tcHV0ZSB9IGZyb20gXCIuLi9idWlsZC9saWIvY29tcHV0ZS5qc1wiO1xyXG5cclxuKGFzeW5jICgpPT57XHJcbiAgICBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjY2FudmFzXCIpO1xyXG4gICAgbGV0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG4gICAgLy8gbG9hZCBpbWFnZSAoc2ltcGxlcilcclxuICAgIGxldCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xyXG4gICAgbGV0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSxyZWplY3QpPT57XHJcbiAgICAgICAgaW1hZ2Uub25sb2FkPXJlc29sdmU7XHJcbiAgICAgICAgaW1hZ2Uub25lcnJvcj1yZWplY3Q7XHJcbiAgICB9KTtcclxuICAgIGltYWdlLnNyYyA9IFwiYXNzZXRzL2ltYWdlcy90ZXN0LnBuZ1wiO1xyXG4gICAgYXdhaXQgcHJvbWlzZTtcclxuXHJcbiAgICAvLyBcclxuICAgIGNvbnN0IGFkYXB0ZXIgPSBhd2FpdCBuYXZpZ2F0b3IuZ3B1LnJlcXVlc3RBZGFwdGVyKCk7XHJcbiAgICBjb25zdCBkZXZpY2UgPSBhd2FpdCBhZGFwdGVyLnJlcXVlc3REZXZpY2UoKTtcclxuXHJcbiAgICAvLyBcclxuICAgIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgUGlwZWxpbmVcIik7XHJcblxyXG4gICAgLy8gXHJcbiAgICBjb25zdCBiaW5kR3JvdXBMYXlvdXQgPSBkZXZpY2UuY3JlYXRlQmluZEdyb3VwTGF5b3V0KHtcclxuICAgICAgICBiaW5kaW5nczogWyBcclxuICAgICAgICAgICAgeyBiaW5kaW5nOiAwLCB2aXNpYmlsaXR5OiBHUFVTaGFkZXJTdGFnZS5DT01QVVRFLCB0eXBlOiBcInN0b3JhZ2UtYnVmZmVyXCIgfSBcclxuICAgICAgICBdXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBncmF5c2NhbGUgY29tcHV0ZSBzaGFkZXJcclxuICAgIGNvbnN0IGNvbXB1dGVQaXBlbGluZSA9IGRldmljZS5jcmVhdGVDb21wdXRlUGlwZWxpbmUoe1xyXG4gICAgICAgIGxheW91dDogZGV2aWNlLmNyZWF0ZVBpcGVsaW5lTGF5b3V0KHsgYmluZEdyb3VwTGF5b3V0czogW2JpbmRHcm91cExheW91dF0gfSksXHJcbiAgICAgICAgY29tcHV0ZVN0YWdlOiB7IGVudHJ5UG9pbnQ6IFwibWFpblwiLCBtb2R1bGU6IGRldmljZS5jcmVhdGVTaGFkZXJNb2R1bGUoeyBjb2RlOiBuZXcgVWludDMyQXJyYXkoYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9idWlsZC9zaGFkZXJzL2dyYXlzY2FsZS5jb21wLnNwdlwiKSkuYXJyYXlCdWZmZXIoKSkgfSkgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gXHJcbiAgICBjb25zb2xlLmxvZyhcIkNvbXB1dGUgUmVhZHlcIik7XHJcblxyXG4gICAgLy9jb25zdCBzaXplID0gTWF0aC5taW4oaW1hZ2VEYXRhLndpZHRoKmltYWdlRGF0YS5oZWlnaHQqNCwxMDI0KjEwMjQqMTAyNCk7XHJcbiAgICBjb25zdCBzaXplID0gTWF0aC5taW4oY2FudmFzLndpZHRoKmNhbnZhcy5oZWlnaHQqNCwxMDI0KjEwMjQqMTAyNCk7XHJcbiAgICBjb25zdCBncHVCdWZmZXIgPSBkZXZpY2UuY3JlYXRlQnVmZmVyKHsgc2l6ZSwgdXNhZ2U6IEdQVUJ1ZmZlclVzYWdlLlNUT1JBR0UgfCBHUFVCdWZmZXJVc2FnZS5DT1BZX1NSQyB8IEdQVUJ1ZmZlclVzYWdlLkNPUFlfRFNUIH0pO1xyXG4gICAgY29uc3QgYmluZEdyb3VwID0gZGV2aWNlLmNyZWF0ZUJpbmRHcm91cCh7XHJcbiAgICAgICAgbGF5b3V0OiBiaW5kR3JvdXBMYXlvdXQsXHJcbiAgICAgICAgYmluZGluZ3M6IFtcclxuICAgICAgICAgICAgeyBiaW5kaW5nOiAwLCByZXNvdXJjZTogeyBidWZmZXI6IGdwdUJ1ZmZlciB9IH1cclxuICAgICAgICBdXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb21wdXRlIE9OTFkgdGVzdCwgd2l0aG91dCBzd2FwY2hhaW4gY29udGV4dFxyXG4gICAgLy8gQ2hyb21lIFN0YWJsZSwgcGxhbm5lZCBmb3IgTm9kZUpTXHJcbiAgICBjb25zdCBkYXRhQnVmZmVyID0gZGV2aWNlLmNyZWF0ZUJ1ZmZlcih7IHNpemUsIHVzYWdlOiBHUFVCdWZmZXJVc2FnZS5DT1BZX1NSQyB8IEdQVUJ1ZmZlclVzYWdlLk1BUF9XUklURSB9KTtcclxuICAgIGNvbnN0IHJlYWRCdWZmZXIgPSBkZXZpY2UuY3JlYXRlQnVmZmVyKHsgc2l6ZSwgdXNhZ2U6IEdQVUJ1ZmZlclVzYWdlLkNPUFlfRFNUIHwgR1BVQnVmZmVyVXNhZ2UuTUFQX1JFQUQgfSk7XHJcbiAgICBjb25zdCBtYXBEYXRhID0gZGF0YUJ1ZmZlci5tYXBXcml0ZUFzeW5jKCk7IC8vIGdldCBsYXp5IHByb21pc2VcclxuXHJcbiAgICAvLyBcclxuICAgIGN0eC5kcmF3SW1hZ2UoaW1hZ2UsMCwwKTsgLy8gZHJhdyBpbWFnZSB3aGlsZSBtYXBwaW5nIGluIHByb2dyZXNzXHJcblxyXG4gICAgLy8gXHJcbiAgICBjb25zdCBpbWdEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLDAsY2FudmFzLndpZHRoLGNhbnZhcy5oZWlnaHQpLmRhdGE7IC8vIHdoaWxlIG1hcHBpbmcgaW4gcHJvZ3Jlc3NcclxuICAgIG5ldyBVaW50OEFycmF5KGF3YWl0IG1hcERhdGEpLnNldChpbWdEYXRhKTtcclxuICAgIGRhdGFCdWZmZXIudW5tYXAoKTtcclxuXHJcbiAgICAvLyBcclxuICAgIGNvbnN0IGNvbW1hbmRFbmNvZGVyID0gZGV2aWNlLmNyZWF0ZUNvbW1hbmRFbmNvZGVyKCk7XHJcbiAgICBjb21tYW5kRW5jb2Rlci5jb3B5QnVmZmVyVG9CdWZmZXIoZGF0YUJ1ZmZlciwgMCwgZ3B1QnVmZmVyLCAwLCBzaXplKTtcclxuXHJcbiAgICAvLyBjcmVhdGUgY29tcHV0ZSBjb21tYW5kXHJcbiAgICBjb25zdCBwYXNzRW5jb2RlciA9IGNvbW1hbmRFbmNvZGVyLmJlZ2luQ29tcHV0ZVBhc3MoKTtcclxuICAgIHBhc3NFbmNvZGVyLnNldFBpcGVsaW5lKGNvbXB1dGVQaXBlbGluZSk7XHJcbiAgICBwYXNzRW5jb2Rlci5zZXRCaW5kR3JvdXAoMCwgYmluZEdyb3VwKTtcclxuICAgIHBhc3NFbmNvZGVyLmRpc3BhdGNoKHNpemU+PjksMSwxKTtcclxuICAgIHBhc3NFbmNvZGVyLmVuZFBhc3MoKTtcclxuXHJcbiAgICAvLyByZWFkIGZyb20gR1BVIHRvIGNhY2hlXHJcbiAgICBjb21tYW5kRW5jb2Rlci5jb3B5QnVmZmVyVG9CdWZmZXIoZ3B1QnVmZmVyLCAwLCByZWFkQnVmZmVyLCAwLCBzaXplKTtcclxuXHJcbiAgICAvLyBcclxuICAgIGNvbnNvbGUubG9nKFwiQ29tbWFuZCBTdWJtaXNzaW9uXCIpO1xyXG5cclxuICAgIC8vIHN1Ym1pdCBjb21tYW5kXHJcbiAgICBkZXZpY2UuZGVmYXVsdFF1ZXVlLnN1Ym1pdChbY29tbWFuZEVuY29kZXIuZmluaXNoKCldKTtcclxuXHJcbiAgICAvLyBcclxuICAgIGNvbnNvbGUubG9nKFwiQ29weWluZyBmcm9tIEdQVVwiKTtcclxuXHJcbiAgICAvLyBwdXQgaW1hZ2VEYXRhIGludG8gY2FudmFzXHJcbiAgICBjdHgucHV0SW1hZ2VEYXRhKG5ldyBJbWFnZURhdGEobmV3IFVpbnQ4Q2xhbXBlZEFycmF5KGF3YWl0IHJlYWRCdWZmZXIubWFwUmVhZEFzeW5jKCksMCxzaXplKSwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KSwwLDApO1xyXG4gICAgY29uc29sZS5sb2coXCJTb3QgSW1hZ2VEYXRhXCIpO1xyXG4gICAgcmVhZEJ1ZmZlci51bm1hcCgpO1xyXG59KSgpO1xyXG4iXSwic291cmNlUm9vdCI6IiJ9