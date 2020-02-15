/// <reference path="./lib/compute.d.ts" />

import { Compute } from "./lib/compute.js";

(async ()=>{
    let canvas: HTMLCanvasElement = document.querySelector("#canvas");
    let ctx = canvas.getContext("2d");

    // load image (simpler)
    let image = new Image();
    let promise = new Promise((resolve,reject)=>{
        image.onload=resolve;
        image.onerror=reject;
    });
    image.src = "images/test.png";
    await promise;

    // 
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    // 
    console.log("Creating Pipeline");

    // 
    const bindGroupLayout = device.createBindGroupLayout({
        bindings: [ 
            { binding: 0, visibility: GPUShaderStage.COMPUTE, type: "storage-buffer" } 
        ]
    });

    // grayscale compute shader
    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
        computeStage: { entryPoint: "main", module: device.createShaderModule({ code: new Uint32Array(await (await fetch("./shaders/grayscale.comp.spv")).arrayBuffer()) }) }
    });

    // 
    console.log("Compute Ready");

    //const size = Math.min(imageData.width*imageData.height*4,1024*1024*1024);
    const size = Math.min(canvas.width*canvas.height*4,1024*1024*1024);
    const gpuBuffer = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        bindings: [
            { binding: 0, resource: { buffer: gpuBuffer } }
        ]
    });

    // Compute ONLY test, without swapchain context
    // Chrome Stable, planned for NodeJS
    const dataBuffer = device.createBuffer({ size, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE });
    const readBuffer = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const mapData = dataBuffer.mapWriteAsync(); // get lazy promise

    // 
    ctx.drawImage(image,0,0); // draw image while mapping in progress

    // 
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height).data; // while mapping in progress
    new Uint8Array(await mapData).set(imgData);
    dataBuffer.unmap();

    // 
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(dataBuffer, 0, gpuBuffer, 0, size);

    // create compute command
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatch(size>>9,1,1);
    passEncoder.endPass();

    // read from GPU to cache
    commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, size);

    // 
    console.log("Command Submission");

    // submit command
    device.defaultQueue.submit([commandEncoder.finish()]);

    // 
    console.log("Copying from GPU");

    // put imageData into canvas
    ctx.putImageData(new ImageData(new Uint8ClampedArray(await readBuffer.mapReadAsync(),0,size), canvas.width, canvas.height),0,0);
    console.log("Sot ImageData");
    readBuffer.unmap();
})();
