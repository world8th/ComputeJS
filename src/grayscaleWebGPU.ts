/// <reference path="../build/lib/compute.d.ts" />

import { Compute } from "../build/lib/compute.js";

(async ()=>{
    let canvas: HTMLCanvasElement = document.querySelector("#canvas");
    let ctx = canvas.getContext("2d");

    // load image (simpler)
    let image = new Image();
    let promise = new Promise((resolve,reject)=>{
        image.onload=resolve;
        image.onerror=reject;
    });
    image.src = "assets/images/test.png";
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
        computeStage: { entryPoint: "main", module: device.createShaderModule({ code: new Uint32Array(await (await fetch("./build/shaders/grayscale.comp.spv")).arrayBuffer()) }) }
    });

    // 
    console.log("Compute Ready");

    // 
    ctx.drawImage(image,0,0);

    // Compute ONLY test, without swapchain context
    let imageData = ctx.getImageData(0,0,640,480);
    let size = Math.min(imageData.width*imageData.height*4,1024*1024*1024);

    // Firefox supported
    //const [dataBuffer, dataMap] = device.createBufferMapped({ size, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE });
    //new Uint8Array(dataMap).set(imageData.data);

    // Chrome Stable, planned for NodeJS
    const dataBuffer = device.createBuffer({ size, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE });
    const readBuffer = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    new Uint8Array(await dataBuffer.mapWriteAsync()).set(imageData.data);
    dataBuffer.unmap();

    // 
    const gpuBuffer = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });

    // 
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        bindings: [
            { binding: 0, resource: { buffer: gpuBuffer } }
        ]
    });

    // 
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(dataBuffer, 0, gpuBuffer, 0, size);

    // create compute command
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatch(size>>2>>7,1,1);
    passEncoder.endPass();
    
    // read from GPU to cache
    commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, size);

    // 
    console.log("Command Submission");

    // submit command
    device.defaultQueue.submit([commandEncoder.finish()]);

    // 
    console.log("Copying from GPU");
    imageData.data.set(new Uint8Array(await readBuffer.mapReadAsync(), 0, size));
    readBuffer.unmap();

    // 
    console.log("Sot ImageData");

    // put imageData
    ctx.putImageData(imageData,0,0);
})();
