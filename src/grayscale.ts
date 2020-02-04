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

    // import compute library 
    let compute: Compute.Module = (await import("./build/lib/compute.js")).default; // Required Type Conversion
    
    // create wasm workgroup (4 threads) with module
    let workgroup = await compute.workgroup("./build/assembly/optimized.wasm", 6, `
        await (async (data)=>{
            return instance.exports[data.name](id, ...data.args);
        })`);
    console.log("created workers!");

    // 
    ctx.drawImage(image,0,0);

    //
    let imageData = ctx.getImageData(0,0,640,480);
    let size = Math.min(imageData.width*imageData.height*4,1024*1024*1024);

    // allocate shared memory for work
    let buffer = workgroup.allocate(size); // just number pointer

    // make typed array and set with image data 
    let map = workgroup.map<Uint8Array>(buffer,size,Uint8Array);
    map.set(imageData.data); // set by mapped range
    console.log("allocation of shared memory complete!");

    // Run "support" task (can run "main" without input data)
    await workgroup.task({name: "main", args: [imageData.width, imageData.height, buffer]}).support();
    console.log("compute done!");

    // set imageData by mapped memory
    imageData.data.set(map);
    console.log(`copied back data with ${size} bytes!`);

    // put imageData
    ctx.putImageData(imageData,0,0);
})();
