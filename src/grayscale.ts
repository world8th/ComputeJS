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

    // allocate shared memory for work
    const size = Math.min(canvas.width*canvas.height*4,1024*1024*1024);
    const buffer = workgroup.allocate(size); // just number pointer

    // 
    ctx.drawImage(image,0,0);

    // make typed array and set with image data 
    let map = workgroup.map<Uint8ClampedArray>(buffer,size,Uint8ClampedArray);
    let img = ctx.getImageData(0,0,canvas.width,canvas.height);
    map.set(img.data); // set by mapped range
    console.log("allocation of shared memory complete!");

    // Run "support" task (can run "main" without input data)
    await workgroup.task({name: "main", args: [canvas.width, canvas.height, buffer]}).support();
    console.log("compute done!");

    // put imageData
    img.data.set(map);
    ctx.putImageData(img,0,0);
})();
