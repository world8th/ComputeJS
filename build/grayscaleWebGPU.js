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
/******/ 	return __webpack_require__(__webpack_require__.s = "./grayscaleWebGPU.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./grayscaleWebGPU.ts":
/*!****************************!*\
  !*** ./grayscaleWebGPU.ts ***!
  \****************************/
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
    ctx.drawImage(image, 0, 0);
    let imageData = ctx.getImageData(0, 0, 640, 480);
    let size = Math.min(imageData.width * imageData.height * 4, 1024 * 1024 * 1024);
    const dataBuffer = device.createBuffer({ size, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE });
    const readBuffer = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    new Uint8Array(await dataBuffer.mapWriteAsync()).set(imageData.data);
    dataBuffer.unmap();
    const gpuBuffer = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        bindings: [
            { binding: 0, resource: { buffer: gpuBuffer } }
        ]
    });
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(dataBuffer, 0, gpuBuffer, 0, size);
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatch(size >> 2 >> 7, 1, 1);
    passEncoder.endPass();
    commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, size);
    console.log("Command Submission");
    device.defaultQueue.submit([commandEncoder.finish()]);
    console.log("Copying from GPU");
    imageData.data.set(new Uint8Array(await readBuffer.mapReadAsync(), 0, size));
    readBuffer.unmap();
    console.log("Sot ImageData");
    ctx.putImageData(imageData, 0, 0);
})();


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vZ3JheXNjYWxlV2ViR1BVLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7UUFBQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTs7O1FBR0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDBDQUEwQyxnQ0FBZ0M7UUFDMUU7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSx3REFBd0Qsa0JBQWtCO1FBQzFFO1FBQ0EsaURBQWlELGNBQWM7UUFDL0Q7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBLHlDQUF5QyxpQ0FBaUM7UUFDMUUsZ0hBQWdILG1CQUFtQixFQUFFO1FBQ3JJO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMkJBQTJCLDBCQUEwQixFQUFFO1FBQ3ZELGlDQUFpQyxlQUFlO1FBQ2hEO1FBQ0E7UUFDQTs7UUFFQTtRQUNBLHNEQUFzRCwrREFBK0Q7O1FBRXJIO1FBQ0E7OztRQUdBO1FBQ0E7Ozs7Ozs7Ozs7Ozs7OztBQzlFQSxDQUFDLEtBQUssSUFBRyxFQUFFO0lBQ1AsSUFBSSxNQUFNLEdBQXNCLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEUsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUdsQyxJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO0lBQ3hCLElBQUksT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFDLE1BQU0sRUFBQyxFQUFFO1FBQ3hDLEtBQUssQ0FBQyxNQUFNLEdBQUMsT0FBTyxDQUFDO1FBQ3JCLEtBQUssQ0FB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RSxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBR3JFLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3RELFdBQVcsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDekMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdkMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUUsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBR3RCLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFHckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBR2xDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUd0RCxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDaEMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDN0UsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBR25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7SUFHN0IsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJmaWxlIjoiZ3JheXNjYWxlV2ViR1BVLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZ2V0dGVyIH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gXHRcdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuIFx0XHR9XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4gXHR9O1xuXG4gXHQvLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3RcbiBcdC8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuIFx0Ly8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4gXHQvLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3RcbiBcdC8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbiBcdF9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG4gXHRcdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IF9fd2VicGFja19yZXF1aXJlX18odmFsdWUpO1xuIFx0XHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuIFx0XHRpZigobW9kZSAmIDQpICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgJiYgdmFsdWUuX19lc01vZHVsZSkgcmV0dXJuIHZhbHVlO1xuIFx0XHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobnMsICdkZWZhdWx0JywgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdmFsdWUgfSk7XG4gXHRcdGlmKG1vZGUgJiAyICYmIHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgZm9yKHZhciBrZXkgaW4gdmFsdWUpIF9fd2VicGFja19yZXF1aXJlX18uZChucywga2V5LCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHZhbHVlW2tleV07IH0uYmluZChudWxsLCBrZXkpKTtcbiBcdFx0cmV0dXJuIG5zO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IFwiLi9ncmF5c2NhbGVXZWJHUFUudHNcIik7XG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vYnVpbGQvbGliL2NvbXB1dGUuZC50c1wiIC8+XHJcblxyXG5pbXBvcnQgeyBDb21wdXRlIH0gZnJvbSBcIi4uL2J1aWxkL2xpYi9jb21wdXRlLmpzXCI7XHJcblxyXG4oYXN5bmMgKCk9PntcclxuICAgIGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNjYW52YXNcIik7XHJcbiAgICBsZXQgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgICAvLyBsb2FkIGltYWdlIChzaW1wbGVyKVxyXG4gICAgbGV0IGltYWdlID0gbmV3IEltYWdlKCk7XHJcbiAgICBsZXQgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PntcclxuICAgICAgICBpbWFnZS5vbmxvYWQ9cmVzb2x2ZTtcclxuICAgICAgICBpbWFnZS5vbmVycm9yPXJlamVjdDtcclxuICAgIH0pO1xyXG4gICAgaW1hZ2Uuc3JjID0gXCJhc3NldHMvaW1hZ2VzL3Rlc3QucG5nXCI7XHJcbiAgICBhd2FpdCBwcm9taXNlO1xyXG5cclxuICAgIC8vIFxyXG4gICAgY29uc3QgYWRhcHRlciA9IGF3YWl0IG5hdmlnYXRvci5ncHUucmVxdWVzdEFkYXB0ZXIoKTtcclxuICAgIGNvbnN0IGRldmljZSA9IGF3YWl0IGFkYXB0ZXIucmVxdWVzdERldmljZSgpO1xyXG5cclxuICAgIC8vIFxyXG4gICAgY29uc29sZS5sb2coXCJDcmVhdGluZyBQaXBlbGluZVwiKTtcclxuXHJcbiAgICAvLyBcclxuICAgIGNvbnN0IGJpbmRHcm91cExheW91dCA9IGRldmljZS5jcmVhdGVCaW5kR3JvdXBMYXlvdXQoe1xyXG4gICAgICAgIGJpbmRpbmdzOiBbIFxyXG4gICAgICAgICAgICB7IGJpbmRpbmc6IDAsIHZpc2liaWxpdHk6IEdQVVNoYWRlclN0YWdlLkNPTVBVVEUsIHR5cGU6IFwic3RvcmFnZS1idWZmZXJcIiB9IFxyXG4gICAgICAgIF1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGdyYXlzY2FsZSBjb21wdXRlIHNoYWRlclxyXG4gICAgY29uc3QgY29tcHV0ZVBpcGVsaW5lID0gZGV2aWNlLmNyZWF0ZUNvbXB1dGVQaXBlbGluZSh7XHJcbiAgICAgICAgbGF5b3V0OiBkZXZpY2UuY3JlYXRlUGlwZWxpbmVMYXlvdXQoeyBiaW5kR3JvdXBMYXlvdXRzOiBbYmluZEdyb3VwTGF5b3V0XSB9KSxcclxuICAgICAgICBjb21wdXRlU3RhZ2U6IHsgZW50cnlQb2ludDogXCJtYWluXCIsIG1vZHVsZTogZGV2aWNlLmNyZWF0ZVNoYWRlck1vZHVsZSh7IGNvZGU6IG5ldyBVaW50MzJBcnJheShhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL2J1aWxkL3NoYWRlcnMvZ3JheXNjYWxlLmNvbXAuc3B2XCIpKS5hcnJheUJ1ZmZlcigpKSB9KSB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBcclxuICAgIGNvbnNvbGUubG9nKFwiQ29tcHV0ZSBSZWFkeVwiKTtcclxuXHJcbiAgICAvLyBcclxuICAgIGN0eC5kcmF3SW1hZ2UoaW1hZ2UsMCwwKTtcclxuXHJcbiAgICAvLyBDb21wdXRlIE9OTFkgdGVzdCwgd2l0aG91dCBzd2FwY2hhaW4gY29udGV4dFxyXG4gICAgbGV0IGltYWdlRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwwLDY0MCw0ODApO1xyXG4gICAgbGV0IHNpemUgPSBNYXRoLm1pbihpbWFnZURhdGEud2lkdGgqaW1hZ2VEYXRhLmhlaWdodCo0LDEwMjQqMTAyNCoxMDI0KTtcclxuXHJcbiAgICAvLyBGaXJlZm94IHN1cHBvcnRlZFxyXG4gICAgLy9jb25zdCBbZGF0YUJ1ZmZlciwgZGF0YU1hcF0gPSBkZXZpY2UuY3JlYXRlQnVmZmVyTWFwcGVkKHsgc2l6ZSwgdXNhZ2U6IEdQVUJ1ZmZlclVzYWdlLkNPUFlfU1JDIHwgR1BVQnVmZmVyVXNhZ2UuTUFQX1dSSVRFIH0pO1xyXG4gICAgLy9uZXcgVWludDhBcnJheShkYXRhTWFwKS5zZXQoaW1hZ2VEYXRhLmRhdGEpO1xyXG5cclxuICAgIC8vIENocm9tZSBTdGFibGUsIHBsYW5uZWQgZm9yIE5vZGVKU1xyXG4gICAgY29uc3QgZGF0YUJ1ZmZlciA9IGRldmljZS5jcmVhdGVCdWZmZXIoeyBzaXplLCB1c2FnZTogR1BVQnVmZmVyVXNhZ2UuQ09QWV9TUkMgfCBHUFVCdWZmZXJVc2FnZS5NQVBfV1JJVEUgfSk7XHJcbiAgICBjb25zdCByZWFkQnVmZmVyID0gZGV2aWNlLmNyZWF0ZUJ1ZmZlcih7IHNpemUsIHVzYWdlOiBHUFVCdWZmZXJVc2FnZS5DT1BZX0RTVCB8IEdQVUJ1ZmZlclVzYWdlLk1BUF9SRUFEIH0pO1xyXG4gICAgbmV3IFVpbnQ4QXJyYXkoYXdhaXQgZGF0YUJ1ZmZlci5tYXBXcml0ZUFzeW5jKCkpLnNldChpbWFnZURhdGEuZGF0YSk7XHJcbiAgICBkYXRhQnVmZmVyLnVubWFwKCk7XHJcblxyXG4gICAgLy8gXHJcbiAgICBjb25zdCBncHVCdWZmZXIgPSBkZXZpY2UuY3JlYXRlQnVmZmVyKHsgc2l6ZSwgdXNhZ2U6IEdQVUJ1ZmZlclVzYWdlLlNUT1JBR0UgfCBHUFVCdWZmZXJVc2FnZS5DT1BZX1NSQyB8IEdQVUJ1ZmZlclVzYWdlLkNPUFlfRFNUIH0pO1xyXG5cclxuICAgIC8vIFxyXG4gICAgY29uc3QgYmluZEdyb3VwID0gZGV2aWNlLmNyZWF0ZUJpbmRHcm91cCh7XHJcbiAgICAgICAgbGF5b3V0OiBiaW5kR3JvdXBMYXlvdXQsXHJcbiAgICAgICAgYmluZGluZ3M6IFtcclxuICAgICAgICAgICAgeyBiaW5kaW5nOiAwLCByZXNvdXJjZTogeyBidWZmZXI6IGdwdUJ1ZmZlciB9IH1cclxuICAgICAgICBdXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBcclxuICAgIGNvbnN0IGNvbW1hbmRFbmNvZGVyID0gZGV2aWNlLmNyZWF0ZUNvbW1hbmRFbmNvZGVyKCk7XHJcbiAgICBjb21tYW5kRW5jb2Rlci5jb3B5QnVmZmVyVG9CdWZmZXIoZGF0YUJ1ZmZlciwgMCwgZ3B1QnVmZmVyLCAwLCBzaXplKTtcclxuXHJcbiAgICAvLyBjcmVhdGUgY29tcHV0ZSBjb21tYW5kXHJcbiAgICBjb25zdCBwYXNzRW5jb2RlciA9IGNvbW1hbmRFbmNvZGVyLmJlZ2luQ29tcHV0ZVBhc3MoKTtcclxuICAgIHBhc3NFbmNvZGVyLnNldFBpcGVsaW5lKGNvbXB1dGVQaXBlbGluZSk7XHJcbiAgICBwYXNzRW5jb2Rlci5zZXRCaW5kR3JvdXAoMCwgYmluZEdyb3VwKTtcclxuICAgIHBhc3NFbmNvZGVyLmRpc3BhdGNoKHNpemU+PjI+PjcsMSwxKTtcclxuICAgIHBhc3NFbmNvZGVyLmVuZFBhc3MoKTtcclxuICAgIFxyXG4gICAgLy8gcmVhZCBmcm9tIEdQVSB0byBjYWNoZVxyXG4gICAgY29tbWFuZEVuY29kZXIuY29weUJ1ZmZlclRvQnVmZmVyKGdwdUJ1ZmZlciwgMCwgcmVhZEJ1ZmZlciwgMCwgc2l6ZSk7XHJcblxyXG4gICAgLy8gXHJcbiAgICBjb25zb2xlLmxvZyhcIkNvbW1hbmQgU3VibWlzc2lvblwiKTtcclxuXHJcbiAgICAvLyBzdWJtaXQgY29tbWFuZFxyXG4gICAgZGV2aWNlLmRlZmF1bHRRdWV1ZS5zdWJtaXQoW2NvbW1hbmRFbmNvZGVyLmZpbmlzaCgpXSk7XHJcblxyXG4gICAgLy8gXHJcbiAgICBjb25zb2xlLmxvZyhcIkNvcHlpbmcgZnJvbSBHUFVcIik7XHJcbiAgICBpbWFnZURhdGEuZGF0YS5zZXQobmV3IFVpbnQ4QXJyYXkoYXdhaXQgcmVhZEJ1ZmZlci5tYXBSZWFkQXN5bmMoKSwgMCwgc2l6ZSkpO1xyXG4gICAgcmVhZEJ1ZmZlci51bm1hcCgpO1xyXG5cclxuICAgIC8vIFxyXG4gICAgY29uc29sZS5sb2coXCJTb3QgSW1hZ2VEYXRhXCIpO1xyXG5cclxuICAgIC8vIHB1dCBpbWFnZURhdGFcclxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLDAsMCk7XHJcbn0pKCk7XHJcbiJdLCJzb3VyY2VSb290IjoiIn0=