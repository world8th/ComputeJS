/// <reference path="../build/lib/compute.d.ts" />

//import { Compute } from "../build/lib/compute.js";
//import * as nvk from "nvk";
//Object.assign(global, nvk);

//type gptr_t = bigint;
//type lptr_t = number;

(async ()=>{
    Object.assign(global, require("nvk"));
    Object.assign(this, require("nvk"));

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
    let globalify = (memory, offset) => {
        return (memory.getAddress() + BigInt(offset))[0];
    };

    // Used for READ from GPU's processing 
    let localify = (memory, address) => {
        return Number(BigInt(address) - memory.getAddress());
    };

    // 
    let memory = new WebAssembly.Memory({initial: 1, maximum: 65536, shared: true}); // Avoid TypeScript issues

    // safer import (try use Vulkan bindings in WebAssembly with AssemblyScript)
    const VK = {
        mInt64Ptr: (localAddress) => {
            return globalify(memory.buffer, localAddress);
        },

        mUSizePtr: (localAddress) => {
            return globalify(memory.buffer, BigInt(localAddress));
        },

        showNumber: (size) => {
            console.log("DEBUG:" + size);
        },

        vkCreateInstance: (instanceCreateInfoAddress, allocatorAddress, instanceAddress) => { // will skipe pointer instance directly into...
            console.log(`vkCreateInstance(${instanceCreateInfoAddress}, ${allocatorAddress}, ${instanceAddress})`);
            
            // 
            console.log("sizeof(VkInstanceCreateInfo) = ", VkInstanceCreateInfo.byteLength);
            console.log("sizeof(VkApplicationInfo) = ", VkApplicationInfo.byteLength);

            let createInfo = new VkInstanceCreateInfo({$memoryBuffer: memory.buffer, $memoryOffset:instanceCreateInfoAddress});
            //let createInfo = new VkInstanceCreateInfo(); // Directly Still UNABLE

            let appInfo = createInfo.pApplicationInfo;
            //appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
            //appInfo.pApplicationName = "App";
            //appInfo.applicationVersion = VK_MAKE_VERSION(1, 1, 0);
            //appInfo.pEngineName = "Engine";
            //appInfo.engineVersion = VK_MAKE_VERSION(1, 1, 0);
            //appInfo.apiVersion = VK_API_VERSION_1_1;
            
            let validationLayers = [
                "VK_LAYER_LUNARG_standard_validation",
                "VK_LAYER_KHRONOS_validation"
            ];
            //createInfo.sType = originInfo.sType;//VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
            //createInfo.pApplicationInfo = originInfo.pApplicationInfo;//appInfo;
            //createInfo.ppEnabledLayerNames = originInfo.ppEnabledLayerNames;
            //createInfo.enabledLayerCount = 0;//originInfo.enabledLayerCount;
            //createInfo.ppEnabledExtensionNames = originInfo.ppEnabledExtensionNames;
            //createInfo.enabledExtensionCount = 0;//originInfo.enabledExtensionCount;
            
// Currently, NVK working WRONG (I even Attemped to use global address hack)
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

// Currently, NVK working WRONG (I even Attemped to use global address hack)
console.log(`VkApplicationInfo {
    sType: ${appInfo.sType};
    pNext: ${appInfo.pNext};
    pApplicationName: ${appInfo.pApplicationInfo};
    applicationVersion: ${appInfo.pApplicationName};
    pEngineName: ${appInfo.pEngineName};
    engineVersion: ${appInfo.engineVersion};
    apiVersion: ${appInfo.apiVersion};
};`);
            
            let instance = new VkInstance({ $memoryOffset: instanceAddress, $memoryBuffer: memory.buffer });
            return vkCreateInstance(createInfo, allocatorAddress, instance);
        },
        
        vkEnumerateInstanceLayerProperties: (amountOfLayersAddress, layerPropertiesAddress) =>{
            return 0;
            //return vkEnumerateInstanceLayerProperties({$:new Uint32Array(memory.buffer,amountOfLayersAddress,1)}, VkLayerProperties({$memoryBuffer:memory.buffer, $memoryOffset:layerPropertiesAddress}));
        }
    };

    /*
    // oh, sh&t
    const fs = require("fs"), code = fs.readFileSync("./build/assembly/pukan-opt.wasm"); 
    //console.log(code ? "Has Module" : "Something Wrong (Oh, SH&T!)"); if (code) console.log(code);
    
    // 
    let module = null;
    try { module = await WebAssembly.compile(code); } catch(e) { console.error(e); }

    // 
    const imports = {
        pukan: VK, env: Object.assign({ memory, abort: function() { throw Error("abort called"); } })
    };

    // create host/manager instance
    //const vmodule = await WebAssembly.instantiate(module, imports as Record<string, Record<string, WebAssembly.ImportValue>>);
    let cmodule = null, vmodule = null;
    try { cmodule = WebAssembly.instantiate(module, imports); } catch(e) { console.error(e); };
    try { vmodule = module ? (await cmodule) : { exports: {} }; } catch(e) { console.error(e); };

*/

    // oh, sh&t
    const fs = require("fs"), code = fs.readFileSync("./build/assembly/pukan-opt.wasm"); 
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
    try { cmodule = WebAssembly.instantiate(module, {env, pukan}); } catch(e) { console.error(e); };
    try { vmodule = module ? (await cmodule) : { exports: {} }; } catch(e) { console.error(e); };

    // 
    let address = memory.buffer.getAddress();
    vmodule.exports.setMemAddress( Number((address>>BigInt(0))&BigInt(0xFFFFFFFF)), Number((address>>BigInt(32))&BigInt(0xFFFFFFFF)) ); // drobly 
    vmodule.exports.start();

})();
