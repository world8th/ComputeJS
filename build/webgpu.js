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
/******/ 	return __webpack_require__(__webpack_require__.s = "./webgpu.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./renderer.ts":
/*!*********************!*\
  !*** ./renderer.ts ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const positions = new Float32Array([
    1.0, -1.0, 0.0,
    -1.0, -1.0, 0.0,
    0.0, 1.0, 0.0
]);
const colors = new Float32Array([
    1.0, 0.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 0.0, 1.0
]);
const indices = new Uint16Array([0, 1, 2]);
class Renderer {
    constructor(canvas) {
        this.render = () => {
            this.colorTexture = this.swapchain.getCurrentTexture();
            this.colorTextureView = this.colorTexture.createView();
            this.encodeCommands();
            requestAnimationFrame(this.render);
        };
        this.canvas = canvas;
    }
    async start() {
        if (await this.initializeAPI()) {
            this.resizeBackings();
            await this.initializeResources();
            this.render();
        }
    }
    async initializeAPI() {
        try {
            const entry = navigator.gpu;
            if (!entry) {
                return false;
            }
            this.adapter = await entry.requestAdapter();
            this.device = await this.adapter.requestDevice();
            this.queue = this.device.defaultQueue;
        }
        catch (e) {
            console.error(e);
            return false;
        }
        return true;
    }
    async initializeResources() {
        let createBuffer = (arr, usage) => {
            let desc = { size: arr.byteLength, usage };
            let [buffer, bufferMapped] = this.device.createBufferMapped(desc);
            ``;
            const writeArray = arr instanceof Uint16Array ? new Uint16Array(bufferMapped) : new Float32Array(bufferMapped);
            writeArray.set(arr);
            buffer.unmap();
            return buffer;
        };
        this.positionBuffer = createBuffer(positions, GPUBufferUsage.VERTEX);
        this.colorBuffer = createBuffer(colors, GPUBufferUsage.VERTEX);
        this.indexBuffer = createBuffer(indices, GPUBufferUsage.INDEX);
        let loadShader = (shaderPath) => fetch(new Request(shaderPath), { method: 'GET', mode: 'cors' }).then((res) => res.arrayBuffer().then((arr) => new Uint32Array(arr)));
        const vsmDesc = { code: await loadShader('/assets/shaders/triangle.vert.spv') };
        this.vertModule = this.device.createShaderModule(vsmDesc);
        const fsmDesc = { code: await loadShader('/assets/shaders/triangle.frag.spv') };
        this.fragModule = this.device.createShaderModule(fsmDesc);
        const positionAttribDesc = {
            shaderLocation: 0,
            offset: 0,
            format: 'float3'
        };
        const colorAttribDesc = {
            shaderLocation: 1,
            offset: 0,
            format: 'float3'
        };
        const positionBufferDesc = {
            attributes: [positionAttribDesc],
            arrayStride: 4 * 3,
            stepMode: 'vertex'
        };
        const colorBufferDesc = {
            attributes: [colorAttribDesc],
            arrayStride: 4 * 3,
            stepMode: 'vertex'
        };
        const vertexState = {
            indexFormat: 'uint16',
            vertexBuffers: [positionBufferDesc, colorBufferDesc]
        };
        const depthStencilState = {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8'
        };
        const pipelineLayoutDesc = { bindGroupLayouts: [] };
        const layout = this.device.createPipelineLayout(pipelineLayoutDesc);
        const vertexStage = {
            module: this.vertModule,
            entryPoint: 'main'
        };
        const fragmentStage = {
            module: this.fragModule,
            entryPoint: 'main'
        };
        const colorState = {
            format: 'bgra8unorm',
            alphaBlend: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
            },
            colorBlend: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
            },
            writeMask: GPUColorWrite.ALL
        };
        const rasterizationState = {
            frontFace: 'cw',
            cullMode: 'none'
        };
        const pipelineDesc = {
            layout,
            vertexStage,
            fragmentStage,
            primitiveTopology: 'triangle-list',
            colorStates: [colorState],
            depthStencilState,
            vertexState,
            rasterizationState
        };
        this.pipeline = this.device.createRenderPipeline(pipelineDesc);
    }
    resizeBackings() {
        if (!this.swapchain) {
            const context = this.canvas.getContext('gpupresent');
            const swapChainDesc = {
                device: this.device,
                format: 'bgra8unorm',
                usage: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.COPY_SRC
            };
            this.swapchain = context.configureSwapChain(swapChainDesc);
        }
        const depthSize = {
            width: this.canvas.width,
            height: this.canvas.height,
            depth: 1
        };
        const depthTextureDesc = {
            size: depthSize,
            arrayLayerCount: 1,
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: '2d',
            format: 'depth24plus-stencil8',
            usage: GPUTextureUsage.OUTPUT_ATTACHMENT | GPUTextureUsage.COPY_SRC
        };
        this.depthTexture = this.device.createTexture(depthTextureDesc);
        this.depthTextureView = this.depthTexture.createView();
    }
    encodeCommands() {
        let colorAttachment = {
            attachment: this.colorTextureView,
            loadValue: { r: 0, g: 0, b: 0, a: 1 },
            storeOp: 'store'
        };
        const depthAttachment = {
            attachment: this.depthTextureView,
            depthLoadValue: 1,
            depthStoreOp: 'store',
            stencilLoadValue: 'load',
            stencilStoreOp: 'store'
        };
        const renderPassDesc = {
            colorAttachments: [colorAttachment],
            depthStencilAttachment: depthAttachment
        };
        this.commandEncoder = this.device.createCommandEncoder();
        this.passEncoder = this.commandEncoder.beginRenderPass(renderPassDesc);
        this.passEncoder.setPipeline(this.pipeline);
        this.passEncoder.setViewport(0, 0, this.canvas.width, this.canvas.height, 0, 1);
        this.passEncoder.setScissorRect(0, 0, this.canvas.width, this.canvas.height);
        this.passEncoder.setVertexBuffer(0, this.positionBuffer);
        this.passEncoder.setVertexBuffer(1, this.colorBuffer);
        this.passEncoder.setIndexBuffer(this.indexBuffer);
        this.passEncoder.drawIndexed(3, 1, 0, 0, 0);
        this.passEncoder.endPass();
        this.queue.submit([this.commandEncoder.finish()]);
    }
}
exports.default = Renderer;


/***/ }),

/***/ "./webgpu.ts":
/*!*******************!*\
  !*** ./webgpu.ts ***!
  \*******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const renderer_1 = __webpack_require__(/*! ./renderer */ "./renderer.ts");
const canvas = document.getElementById('gfx');
canvas.width = canvas.height = 640;
const renderer = new renderer_1.default(canvas);
renderer.start();


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vcmVuZGVyZXIudHMiLCJ3ZWJwYWNrOi8vLy4vd2ViZ3B1LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7UUFBQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTs7O1FBR0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDBDQUEwQyxnQ0FBZ0M7UUFDMUU7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSx3REFBd0Qsa0JBQWtCO1FBQzFFO1FBQ0EsaURBQWlELGNBQWM7UUFDL0Q7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBLHlDQUF5QyxpQ0FBaUM7UUFDMUUsZ0hBQWdILG1CQUFtQixFQUFFO1FBQ3JJO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMkJBQTJCLDBCQUEwQixFQUFFO1FBQ3ZELGlDQUFpQyxlQUFlO1FBQ2hEO1FBQ0E7UUFDQTs7UUFFQTtRQUNBLHNEQUFzRCwrREFBK0Q7O1FBRXJIO1FBQ0E7OztRQUdBO1FBQ0E7Ozs7Ozs7Ozs7Ozs7OztBQy9FQSxNQUFNLFNBQVMsR0FBRyxJQUFJLFlBQVksQ0FBQztJQUMvQixHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRztJQUNmLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUc7SUFDZCxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7Q0FDaEIsQ0FBQyxDQUFDO0FBR0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUM7SUFDNUIsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO0lBQ2IsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO0lBQ2IsR0FBRyxFQUFFLEdBQUcsRUFB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QyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0UsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUUzQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7Q0FhSjtBQXZRRCwyQkF1UUM7Ozs7Ozs7Ozs7Ozs7OztBQzFSRCwwRUFBa0M7QUFFbEMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQXNCLENBQUM7QUFDbkUsTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztBQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGtCQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDIiwiZmlsZSI6IndlYmdwdS5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSBcIi4vd2ViZ3B1LnRzXCIpO1xuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9Ad2ViZ3B1L3R5cGVzL2luZGV4LmQudHNcIiAvPlxuXG4vLyDwn5OIIFBvc2l0aW9uIFZlcnRleCBCdWZmZXIgRGF0YVxuY29uc3QgcG9zaXRpb25zID0gbmV3IEZsb2F0MzJBcnJheShbXG4gICAgMS4wLCAtMS4wLCAwLjAsXG4gICAtMS4wLCAtMS4wLCAwLjAsXG4gICAgMC4wLCAxLjAsIDAuMFxuXSk7XG5cbi8vIPCfjqggQ29sb3IgVmVydGV4IEJ1ZmZlciBEYXRhXG5jb25zdCBjb2xvcnMgPSBuZXcgRmxvYXQzMkFycmF5KFtcbiAgICAxLjAsIDAuMCwgMC4wLCAvLyDwn5S0XG4gICAgMC4wLCAxLjAsIDAuMCwgLy8g8J+folxuICAgIDAuMCwgMC4wLCAxLjAgIC8vIPCflLVcbl0pO1xuXG4vLyDwn5eE77iPIEluZGV4IEJ1ZmZlciBEYXRhXG5jb25zdCBpbmRpY2VzID0gbmV3IFVpbnQxNkFycmF5KFsgMCwgMSwgMiBdKTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVuZGVyZXIge1xuICAgIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQ7XG5cbiAgICAvLyDimpnvuI8gQVBJIERhdGEgU3RydWN0dXJlc1xuICAgIGFkYXB0ZXI6IEdQVUFkYXB0ZXI7XG4gICAgZGV2aWNlOiBHUFVEZXZpY2U7XG4gICAgcXVldWU6IEdQVVF1ZXVlO1xuXG4gICAgLy8g8J+Onu+4jyBGcmFtZSBCYWNraW5nc1xuICAgIHN3YXBjaGFpbjogR1BVU3dhcENoYWluO1xuICAgIGNvbG9yVGV4dHVyZTogR1BVVGV4dHVyZTtcbiAgICBjb2xvclRleHR1cmVWaWV3OiBHUFVUZXh0dXJlVmlldztcbiAgICBkZXB0aFRleHR1cmU6IEdQVVRleHR1cmU7XG4gICAgZGVwdGhUZXh0dXJlVmlldzogR1BVVGV4dHVyZVZpZXc7XG5cbiAgICAvLyDwn5S6IFJlc291cmNlc1xuICAgIHBvc2l0aW9uQnVmZmVyOiBHUFVCdWZmZXI7XG4gICAgY29sb3JCdWZmZXI6IEdQVUJ1ZmZlcjtcbiAgICBpbmRleEJ1ZmZlcjogR1BVQnVmZmVyO1xuICAgIHZlcnRNb2R1bGU6IEdQVVNoYWRlck1vZHVsZTtcbiAgICBmcmFnTW9kdWxlOiBHUFVTaGFkZXJNb2R1bGU7XG4gICAgcGlwZWxpbmU6IEdQVVJlbmRlclBpcGVsaW5lO1xuXG4gICAgY29tbWFuZEVuY29kZXI6IEdQVUNvbW1hbmRFbmNvZGVyO1xuICAgIHBhc3NFbmNvZGVyOiBHUFVSZW5kZXJQYXNzRW5jb2RlcjtcblxuICAgIGNvbnN0cnVjdG9yKGNhbnZhcykge1xuICAgICAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICB9XG5cbiAgICAvLyDwn4+O77iPIFN0YXJ0IHRoZSByZW5kZXJpbmcgZW5naW5lXG4gICAgYXN5bmMgc3RhcnQoKSB7XG4gICAgICAgIGlmIChhd2FpdCB0aGlzLmluaXRpYWxpemVBUEkoKSkge1xuICAgICAgICAgICAgdGhpcy5yZXNpemVCYWNraW5ncygpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbml0aWFsaXplUmVzb3VyY2VzKCk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8g8J+MnyBJbml0aWFsaXplIFdlYkdQVVxuICAgIGFzeW5jIGluaXRpYWxpemVBUEkoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDwn4+tIEVudHJ5IHRvIFdlYkdQVVxuICAgICAgICAgICAgY29uc3QgZW50cnk6IEdQVSA9IG5hdmlnYXRvci5ncHU7XG4gICAgICAgICAgICBpZiAoIWVudHJ5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDwn5SMIFBoeXNpY2FsIERldmljZSBBZGFwdGVyXG4gICAgICAgICAgICB0aGlzLmFkYXB0ZXIgPSBhd2FpdCBlbnRyeS5yZXF1ZXN0QWRhcHRlcigpO1xuXG4gICAgICAgICAgICAvLyDwn5K7IExvZ2ljYWwgRGV2aWNlXG4gICAgICAgICAgICB0aGlzLmRldmljZSA9IGF3YWl0IHRoaXMuYWRhcHRlci5yZXF1ZXN0RGV2aWNlKCk7XG5cbiAgICAgICAgICAgIC8vIPCfk6YgUXVldWVcbiAgICAgICAgICAgIHRoaXMucXVldWUgPSB0aGlzLmRldmljZS5kZWZhdWx0UXVldWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyDwn42xIEluaXRpYWxpemUgcmVzb3VyY2VzIHRvIHJlbmRlciB0cmlhbmdsZSAoYnVmZmVycywgc2hhZGVycywgcGlwZWxpbmUpXG4gICAgYXN5bmMgaW5pdGlhbGl6ZVJlc291cmNlcygpIHtcbiAgICAgICAgLy8g8J+UuiBCdWZmZXJzXG4gICAgICAgIGxldCBjcmVhdGVCdWZmZXIgPSAoYXJyOiBGbG9hdDMyQXJyYXkgfCBVaW50MTZBcnJheSwgdXNhZ2U6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgbGV0IGRlc2MgPSB7IHNpemU6IGFyci5ieXRlTGVuZ3RoLCB1c2FnZSB9O1xuICAgICAgICAgICAgbGV0IFsgYnVmZmVyLCBidWZmZXJNYXBwZWQgXSA9IHRoaXMuZGV2aWNlLmNyZWF0ZUJ1ZmZlck1hcHBlZChkZXNjKTtcbiAgICAgICAgICAgIGBgO1xuICAgICAgICAgICAgY29uc3Qgd3JpdGVBcnJheSA9XG4gICAgICAgICAgICAgICAgYXJyIGluc3RhbmNlb2YgVWludDE2QXJyYXkgPyBuZXcgVWludDE2QXJyYXkoYnVmZmVyTWFwcGVkKSA6IG5ldyBGbG9hdDMyQXJyYXkoYnVmZmVyTWFwcGVkKTtcbiAgICAgICAgICAgIHdyaXRlQXJyYXkuc2V0KGFycik7XG4gICAgICAgICAgICBidWZmZXIudW5tYXAoKTtcbiAgICAgICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5wb3NpdGlvbkJ1ZmZlciA9IGNyZWF0ZUJ1ZmZlcihwb3NpdGlvbnMsIEdQVUJ1ZmZlclVzYWdlLlZFUlRFWCk7XG4gICAgICAgIHRoaXMuY29sb3JCdWZmZXIgPSBjcmVhdGVCdWZmZXIoY29sb3JzLCBHUFVCdWZmZXJVc2FnZS5WRVJURVgpO1xuICAgICAgICB0aGlzLmluZGV4QnVmZmVyID0gY3JlYXRlQnVmZmVyKGluZGljZXMsIEdQVUJ1ZmZlclVzYWdlLklOREVYKTtcblxuICAgICAgICAvLyDwn5aN77iPIFNoYWRlcnNcbiAgICAgICAgbGV0IGxvYWRTaGFkZXIgPSAoc2hhZGVyUGF0aDogc3RyaW5nKSA9PlxuICAgICAgICAgICAgZmV0Y2gobmV3IFJlcXVlc3Qoc2hhZGVyUGF0aCksIHsgbWV0aG9kOiAnR0VUJywgbW9kZTogJ2NvcnMnIH0pLnRoZW4oKHJlcykgPT5cbiAgICAgICAgICAgICAgICByZXMuYXJyYXlCdWZmZXIoKS50aGVuKChhcnIpID0+IG5ldyBVaW50MzJBcnJheShhcnIpKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBjb25zdCB2c21EZXNjOiBhbnkgPSB7IGNvZGU6IGF3YWl0IGxvYWRTaGFkZXIoJy9hc3NldHMvc2hhZGVycy90cmlhbmdsZS52ZXJ0LnNwdicpIH07XG4gICAgICAgIHRoaXMudmVydE1vZHVsZSA9IHRoaXMuZGV2aWNlLmNyZWF0ZVNoYWRlck1vZHVsZSh2c21EZXNjKTtcblxuICAgICAgICBjb25zdCBmc21EZXNjOiBhbnkgPSB7IGNvZGU6IGF3YWl0IGxvYWRTaGFkZXIoJy9hc3NldHMvc2hhZGVycy90cmlhbmdsZS5mcmFnLnNwdicpIH07XG4gICAgICAgIHRoaXMuZnJhZ01vZHVsZSA9IHRoaXMuZGV2aWNlLmNyZWF0ZVNoYWRlck1vZHVsZShmc21EZXNjKTtcblxuICAgICAgICAvLyDimpfvuI8gR3JhcGhpY3MgUGlwZWxpbmVcblxuICAgICAgICAvLyDwn5SjIElucHV0IEFzc2VtYmx5XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uQXR0cmliRGVzYzogR1BVVmVydGV4QXR0cmlidXRlRGVzY3JpcHRvciA9IHtcbiAgICAgICAgICAgIHNoYWRlckxvY2F0aW9uOiAwLCAvLyBbW2F0dHJpYnV0ZSgwKV1dXG4gICAgICAgICAgICBvZmZzZXQ6IDAsXG4gICAgICAgICAgICBmb3JtYXQ6ICdmbG9hdDMnXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGNvbG9yQXR0cmliRGVzYzogR1BVVmVydGV4QXR0cmlidXRlRGVzY3JpcHRvciA9IHtcbiAgICAgICAgICAgIHNoYWRlckxvY2F0aW9uOiAxLCAvLyBbW2F0dHJpYnV0ZSgxKV1dXG4gICAgICAgICAgICBvZmZzZXQ6IDAsXG4gICAgICAgICAgICBmb3JtYXQ6ICdmbG9hdDMnXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IHBvc2l0aW9uQnVmZmVyRGVzYzogR1BVVmVydGV4QnVmZmVyTGF5b3V0RGVzY3JpcHRvciA9IHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXM6IFsgcG9zaXRpb25BdHRyaWJEZXNjIF0sXG4gICAgICAgICAgICBhcnJheVN0cmlkZTogNCAqIDMsIC8vIHNpemVvZihmbG9hdCkgKiAzXG4gICAgICAgICAgICBzdGVwTW9kZTogJ3ZlcnRleCdcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgY29sb3JCdWZmZXJEZXNjOiBHUFVWZXJ0ZXhCdWZmZXJMYXlvdXREZXNjcmlwdG9yID0ge1xuICAgICAgICAgICAgYXR0cmlidXRlczogWyBjb2xvckF0dHJpYkRlc2MgXSxcbiAgICAgICAgICAgIGFycmF5U3RyaWRlOiA0ICogMywgLy8gc2l6ZW9mKGZsb2F0KSAqIDNcbiAgICAgICAgICAgIHN0ZXBNb2RlOiAndmVydGV4J1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHZlcnRleFN0YXRlOiBHUFVWZXJ0ZXhTdGF0ZURlc2NyaXB0b3IgPSB7XG4gICAgICAgICAgICBpbmRleEZvcm1hdDogJ3VpbnQxNicsXG4gICAgICAgICAgICB2ZXJ0ZXhCdWZmZXJzOiBbIHBvc2l0aW9uQnVmZmVyRGVzYywgY29sb3JCdWZmZXJEZXNjIF1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyDwn4yRIERlcHRoXG4gICAgICAgIGNvbnN0IGRlcHRoU3RlbmNpbFN0YXRlOiBHUFVEZXB0aFN0ZW5jaWxTdGF0ZURlc2NyaXB0b3IgPSB7XG4gICAgICAgICAgICBkZXB0aFdyaXRlRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGRlcHRoQ29tcGFyZTogJ2xlc3MnLFxuICAgICAgICAgICAgZm9ybWF0OiAnZGVwdGgyNHBsdXMtc3RlbmNpbDgnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8g8J+mhCBVbmlmb3JtIERhdGFcbiAgICAgICAgY29uc3QgcGlwZWxpbmVMYXlvdXREZXNjID0geyBiaW5kR3JvdXBMYXlvdXRzOiBbXSB9O1xuICAgICAgICBjb25zdCBsYXlvdXQgPSB0aGlzLmRldmljZS5jcmVhdGVQaXBlbGluZUxheW91dChwaXBlbGluZUxheW91dERlc2MpO1xuXG4gICAgICAgIC8vIPCfjq0gU2hhZGVyIFN0YWdlc1xuICAgICAgICBjb25zdCB2ZXJ0ZXhTdGFnZSA9IHtcbiAgICAgICAgICAgIG1vZHVsZTogdGhpcy52ZXJ0TW9kdWxlLFxuICAgICAgICAgICAgZW50cnlQb2ludDogJ21haW4nXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGZyYWdtZW50U3RhZ2UgPSB7XG4gICAgICAgICAgICBtb2R1bGU6IHRoaXMuZnJhZ01vZHVsZSxcbiAgICAgICAgICAgIGVudHJ5UG9pbnQ6ICdtYWluJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIPCfjIAgQ29sb3IvQmxlbmQgU3RhdGVcbiAgICAgICAgY29uc3QgY29sb3JTdGF0ZTogR1BVQ29sb3JTdGF0ZURlc2NyaXB0b3IgPSB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdiZ3JhOHVub3JtJyxcbiAgICAgICAgICAgIGFscGhhQmxlbmQ6IHtcbiAgICAgICAgICAgICAgICBzcmNGYWN0b3I6ICdzcmMtYWxwaGEnLFxuICAgICAgICAgICAgICAgIGRzdEZhY3RvcjogJ29uZS1taW51cy1zcmMtYWxwaGEnLFxuICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogJ2FkZCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2xvckJsZW5kOiB7XG4gICAgICAgICAgICAgICAgc3JjRmFjdG9yOiAnc3JjLWFscGhhJyxcbiAgICAgICAgICAgICAgICBkc3RGYWN0b3I6ICdvbmUtbWludXMtc3JjLWFscGhhJyxcbiAgICAgICAgICAgICAgICBvcGVyYXRpb246ICdhZGQnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd3JpdGVNYXNrOiBHUFVDb2xvcldyaXRlLkFMTFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIPCfn6ggUmFzdGVyaXphdGlvblxuICAgICAgICBjb25zdCByYXN0ZXJpemF0aW9uU3RhdGU6IEdQVVJhc3Rlcml6YXRpb25TdGF0ZURlc2NyaXB0b3IgPSB7XG4gICAgICAgICAgICBmcm9udEZhY2U6ICdjdycsXG4gICAgICAgICAgICBjdWxsTW9kZTogJ25vbmUnXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcGlwZWxpbmVEZXNjOiBHUFVSZW5kZXJQaXBlbGluZURlc2NyaXB0b3IgPSB7XG4gICAgICAgICAgICBsYXlvdXQsXG5cbiAgICAgICAgICAgIHZlcnRleFN0YWdlLFxuICAgICAgICAgICAgZnJhZ21lbnRTdGFnZSxcblxuICAgICAgICAgICAgcHJpbWl0aXZlVG9wb2xvZ3k6ICd0cmlhbmdsZS1saXN0JyxcbiAgICAgICAgICAgIGNvbG9yU3RhdGVzOiBbIGNvbG9yU3RhdGUgXSxcbiAgICAgICAgICAgIGRlcHRoU3RlbmNpbFN0YXRlLFxuICAgICAgICAgICAgdmVydGV4U3RhdGUsXG4gICAgICAgICAgICByYXN0ZXJpemF0aW9uU3RhdGVcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5waXBlbGluZSA9IHRoaXMuZGV2aWNlLmNyZWF0ZVJlbmRlclBpcGVsaW5lKHBpcGVsaW5lRGVzYyk7XG4gICAgfVxuXG4gICAgLy8g4oaZ77iPIFJlc2l6ZSBzd2FwY2hhaW4sIGZyYW1lIGJ1ZmZlciBhdHRhY2htZW50c1xuICAgIHJlc2l6ZUJhY2tpbmdzKCkge1xuICAgICAgICAvLyDim5PvuI8gU3dhcGNoYWluXG4gICAgICAgIGlmICghdGhpcy5zd2FwY2hhaW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRleHQ6IEdQVUNhbnZhc0NvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCdncHVwcmVzZW50JykgYXMgYW55O1xuICAgICAgICAgICAgY29uc3Qgc3dhcENoYWluRGVzYzogR1BVU3dhcENoYWluRGVzY3JpcHRvciA9IHtcbiAgICAgICAgICAgICAgICBkZXZpY2U6IHRoaXMuZGV2aWNlLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogJ2JncmE4dW5vcm0nLFxuICAgICAgICAgICAgICAgIHVzYWdlOiBHUFVUZXh0dXJlVXNhZ2UuT1VUUFVUX0FUVEFDSE1FTlQgfCBHUFVUZXh0dXJlVXNhZ2UuQ09QWV9TUkNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnN3YXBjaGFpbiA9IGNvbnRleHQuY29uZmlndXJlU3dhcENoYWluKHN3YXBDaGFpbkRlc2MpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8g8J+klCBEZXB0aCBCYWNraW5nXG4gICAgICAgIGNvbnN0IGRlcHRoU2l6ZSA9IHtcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLmNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy5jYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgZGVwdGg6IDFcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkZXB0aFRleHR1cmVEZXNjOiBHUFVUZXh0dXJlRGVzY3JpcHRvciA9IHtcbiAgICAgICAgICAgIHNpemU6IGRlcHRoU2l6ZSxcbiAgICAgICAgICAgIGFycmF5TGF5ZXJDb3VudDogMSxcbiAgICAgICAgICAgIG1pcExldmVsQ291bnQ6IDEsXG4gICAgICAgICAgICBzYW1wbGVDb3VudDogMSxcbiAgICAgICAgICAgIGRpbWVuc2lvbjogJzJkJyxcbiAgICAgICAgICAgIGZvcm1hdDogJ2RlcHRoMjRwbHVzLXN0ZW5jaWw4JyxcbiAgICAgICAgICAgIHVzYWdlOiBHUFVUZXh0dXJlVXNhZ2UuT1VUUFVUX0FUVEFDSE1FTlQgfCBHUFVUZXh0dXJlVXNhZ2UuQ09QWV9TUkNcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlcHRoVGV4dHVyZSA9IHRoaXMuZGV2aWNlLmNyZWF0ZVRleHR1cmUoZGVwdGhUZXh0dXJlRGVzYyk7XG4gICAgICAgIHRoaXMuZGVwdGhUZXh0dXJlVmlldyA9IHRoaXMuZGVwdGhUZXh0dXJlLmNyZWF0ZVZpZXcoKTtcbiAgICB9XG5cbiAgICAvLyDinI3vuI8gV3JpdGUgY29tbWFuZHMgdG8gc2VuZCB0byB0aGUgR1BVXG4gICAgZW5jb2RlQ29tbWFuZHMoKSB7XG4gICAgICAgIGxldCBjb2xvckF0dGFjaG1lbnQ6IEdQVVJlbmRlclBhc3NDb2xvckF0dGFjaG1lbnREZXNjcmlwdG9yID0ge1xuICAgICAgICAgICAgYXR0YWNobWVudDogdGhpcy5jb2xvclRleHR1cmVWaWV3LFxuICAgICAgICAgICAgbG9hZFZhbHVlOiB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfSxcbiAgICAgICAgICAgIHN0b3JlT3A6ICdzdG9yZSdcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkZXB0aEF0dGFjaG1lbnQ6IEdQVVJlbmRlclBhc3NEZXB0aFN0ZW5jaWxBdHRhY2htZW50RGVzY3JpcHRvciA9IHtcbiAgICAgICAgICAgIGF0dGFjaG1lbnQ6IHRoaXMuZGVwdGhUZXh0dXJlVmlldyxcbiAgICAgICAgICAgIGRlcHRoTG9hZFZhbHVlOiAxLFxuICAgICAgICAgICAgZGVwdGhTdG9yZU9wOiAnc3RvcmUnLFxuICAgICAgICAgICAgc3RlbmNpbExvYWRWYWx1ZTogJ2xvYWQnLFxuICAgICAgICAgICAgc3RlbmNpbFN0b3JlT3A6ICdzdG9yZSdcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZW5kZXJQYXNzRGVzYzogR1BVUmVuZGVyUGFzc0Rlc2NyaXB0b3IgPSB7XG4gICAgICAgICAgICBjb2xvckF0dGFjaG1lbnRzOiBbIGNvbG9yQXR0YWNobWVudCBdLFxuICAgICAgICAgICAgZGVwdGhTdGVuY2lsQXR0YWNobWVudDogZGVwdGhBdHRhY2htZW50XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jb21tYW5kRW5jb2RlciA9IHRoaXMuZGV2aWNlLmNyZWF0ZUNvbW1hbmRFbmNvZGVyKCk7XG5cbiAgICAgICAgLy8g8J+WjO+4jyBFbmNvZGUgZHJhd2luZyBjb21tYW5kc1xuICAgICAgICB0aGlzLnBhc3NFbmNvZGVyID0gdGhpcy5jb21tYW5kRW5jb2Rlci5iZWdpblJlbmRlclBhc3MocmVuZGVyUGFzc0Rlc2MpO1xuICAgICAgICB0aGlzLnBhc3NFbmNvZGVyLnNldFBpcGVsaW5lKHRoaXMucGlwZWxpbmUpO1xuICAgICAgICB0aGlzLnBhc3NFbmNvZGVyLnNldFZpZXdwb3J0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQsIDAsIDEpO1xuICAgICAgICB0aGlzLnBhc3NFbmNvZGVyLnNldFNjaXNzb3JSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuICAgICAgICB0aGlzLnBhc3NFbmNvZGVyLnNldFZlcnRleEJ1ZmZlcigwLCB0aGlzLnBvc2l0aW9uQnVmZmVyKTtcbiAgICAgICAgdGhpcy5wYXNzRW5jb2Rlci5zZXRWZXJ0ZXhCdWZmZXIoMSwgdGhpcy5jb2xvckJ1ZmZlcik7XG4gICAgICAgIHRoaXMucGFzc0VuY29kZXIuc2V0SW5kZXhCdWZmZXIodGhpcy5pbmRleEJ1ZmZlcik7XG4gICAgICAgIHRoaXMucGFzc0VuY29kZXIuZHJhd0luZGV4ZWQoMywgMSwgMCwgMCwgMCk7XG4gICAgICAgIHRoaXMucGFzc0VuY29kZXIuZW5kUGFzcygpO1xuXG4gICAgICAgIHRoaXMucXVldWUuc3VibWl0KFsgdGhpcy5jb21tYW5kRW5jb2Rlci5maW5pc2goKSBdKTtcbiAgICB9XG5cbiAgICByZW5kZXIgPSAoKSA9PiB7XG4gICAgICAgIC8vIOKPrSBBY3F1aXJlIG5leHQgaW1hZ2UgZnJvbSBzd2FwY2hhaW5cbiAgICAgICAgdGhpcy5jb2xvclRleHR1cmUgPSB0aGlzLnN3YXBjaGFpbi5nZXRDdXJyZW50VGV4dHVyZSgpO1xuICAgICAgICB0aGlzLmNvbG9yVGV4dHVyZVZpZXcgPSB0aGlzLmNvbG9yVGV4dHVyZS5jcmVhdGVWaWV3KCk7XG5cbiAgICAgICAgLy8g8J+TpiBXcml0ZSBhbmQgc3VibWl0IGNvbW1hbmRzIHRvIHF1ZXVlXG4gICAgICAgIHRoaXMuZW5jb2RlQ29tbWFuZHMoKTtcblxuICAgICAgICAvLyDinr8gUmVmcmVzaCBjYW52YXNcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMucmVuZGVyKTtcbiAgICB9O1xufVxuIiwiaW1wb3J0IFJlbmRlcmVyIGZyb20gJy4vcmVuZGVyZXInO1xuXG5jb25zdCBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2Z4JykgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG5jYW52YXMud2lkdGggPSBjYW52YXMuaGVpZ2h0ID0gNjQwO1xuY29uc3QgcmVuZGVyZXIgPSBuZXcgUmVuZGVyZXIoY2FudmFzKTtcbnJlbmRlcmVyLnN0YXJ0KCk7XG4iXSwic291cmNlUm9vdCI6IiJ9