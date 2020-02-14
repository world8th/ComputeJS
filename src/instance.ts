/// <reference path="../build/lib/compute.d.ts" />

//import { Compute } from "../build/lib/compute.js";
import * as nvk from "nvk";
Object.assign(global, nvk);

type gptr_t = bigint;
type lptr_t = number;

(async ()=>{
    Object.assign(this, nvk);

    // load image (simpler), Node.JS doesn't support by default (but has some extensions)
    //let image = new Image();
    //let promise = new Promise((resolve,reject)=>{
    //    image.onload=resolve;
    //   image.onerror=reject;
    //});
    //image.src = "assets/images/test.png";
    //await promise;


    // ONLY TEST COMPUTE, CURRENTLY
    // import compute library 
    /*
    let compute: Compute.Module = (await import("./build/lib/compute.js")).default; // Required Type Conversion
    
    // create wasm workgroup (4 threads) with module
    let workgroup = await compute.workgroup("./build/assembly/optimized.wasm", 6, `
        await (async (data)=>{
            return instance.exports[data.name](id, ...data.args);
        })`);
    console.log("created workers!");

    // allocate shared memory for work
    const size = 1024;
    const buffer = workgroup.allocate(size); // just number pointer

    // make typed array and set with image data 
    let map = workgroup.map<Uint8ClampedArray>(buffer,size,Uint8ClampedArray);
    console.log("allocation of shared memory complete!");

    // Run "support" task (can run "main" without input data)
    await workgroup.task({name: "main", args: [size, buffer]}).support();
    console.log("compute done!");
*/

    // Used for INPUT to GPU's processing 
    let globalify = (memory: ArrayBufferLike, offset: bigint): bigint => {
        return eval("memory.getAddress()") + (new BigUint64Array(memory, Number(offset), 1))[0];
    };

    // Used for READ from GPU's processing 
    let localify = (memory: ArrayBufferLike, address: bigint): number => {
        return Number(address - eval("memory.getAddress()"));
    };

    // 
    let memory: WebAssembly.Memory = eval("new WebAssembly.Memory({initial: 1, maximum: 65536, shared: true})"); // Avoid TypeScript issues

    // safer import (try use Vulkan bindings in WebAssembly with AssemblyScript)
    const VK = {
        mUSizePtr: (localAddress: number): bigint => {
            return globalify(memory.buffer, BigInt(localAddress));
        },

        mInt64Ptr: (localAddress: bigint): bigint => {
            return globalify(memory.buffer, localAddress);
        },

        vkCreateInstance: (instanceCreateInfoAddress: lptr_t, allocatorAddress: gptr_t, instancePointerAddress: gptr_t): number => { // will skipe pointer instance directly into...
            console.log(`vkCreateInstance(${instanceCreateInfoAddress}, ${allocatorAddress}, ${instancePointerAddress})`);
            
            let createInfo: nvk.VkInstanceCreateInfo = new nvk.VkInstanceCreateInfo({$memoryBuffer:memory.buffer, $memoryOffset:instanceCreateInfoAddress});
            
            console.log(`VkInstanceCreateInfo {
                sType: ${createInfo.sType};
                pNext: ${createInfo.pNext};
                flags: ${createInfo.flags};
                pApplicationInfo: ${createInfo.pApplicationInfo};
                enabledLayerCount: ${createInfo.enabledLayerCount};
                ppEnabledLayerNames: ${createInfo.ppEnabledLayerNames};
                enabledExtensionCount: ${createInfo.enabledExtensionCount};
                ppEnabledExtensionNames: ${createInfo.ppEnabledExtensionNames};
            };`);

            /*console.log(`VkInstanceCreateInfo {
                sType: ${createInfo.sType};
                pNext: ${createInfo.pNext};
                flags: ${createInfo.flags};
                pApplicationName: ${createInfo.pApplicationInfo};
            };`);*/

            return nvk.vkCreateInstance(new nvk.VkInstanceCreateInfo({$memoryBuffer:memory.buffer, $memoryOffset:instanceCreateInfoAddress}), allocatorAddress, new nvk.VkInstance({$memoryBuffer:memory.buffer, $memoryOffset:instancePointerAddress}));
        },
        
        vkEnumerateInstanceLayerProperties: (amountOfLayersAddress: gptr_t, layerPropertiesAddress: gptr_t): number =>{
            return 0;
            //return nvk.vkEnumerateInstanceLayerProperties({$:new Uint32Array(memory.buffer,amountOfLayersAddress,1)}, nvk.VkLayerProperties({$memoryBuffer:memory.buffer, $memoryOffset:layerPropertiesAddress}));
        }
    };

    // oh, sh&t
    const fs = require("fs"), code = fs.readFileSync("./build/assembly/pukan-unt.wasm"); 
    //console.log(code ? "Has Module" : "Something Wrong (Oh, SH&T!)"); if (code) console.log(code);
    
    // 
    let module = null;
    try { module = await WebAssembly.compile(code); } catch(e) { console.error(e); }

    // 
    let pukan = {}, env = Object.assign(
        { memory, abort: function() { throw Error("abort called"); }, ...VK }, 
    );

    // create host/manager instance
    //const vmodule = await WebAssembly.instantiate(module, imports as Record<string, Record<string, WebAssembly.ImportValue>>);
    let cmodule = null, vmodule = null;
    try { cmodule = WebAssembly.instantiate(module, {env}); } catch(e) { console.error(e); };
    try { vmodule = module ? (await cmodule) : { exports: {} }; } catch(e) { console.error(e); };

})();
