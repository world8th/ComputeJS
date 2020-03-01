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

    let u64g = (num) => {
        return new BigUint64Array([BigInt(num)])[0];
    };

    let u64p = (mem, adr) => {
        return new DataView(mem, adr, 8).getBigUint64(0, true);
    };

    let u64s = (mem, adr, num) => {
        new DataView(mem, adr, 8).setBigUint64(0, BigInt(num), true);
    };

    // Used for INPUT to GPU's processing 
    let globalify = (memory, offset) => {
        let gMem = memory.getAddress() + BigInt(offset); 
        console.log(`memoryAddress:${memory.getAddress()} + localAddress:${offset} = ${gMem}`);
        return gMem;
    };

    // Used for READ from GPU's processing 
    let localify = (memory, address) => {
        let lMem = u64g(address) - u64g(memory.getAddress());
        console.log(`nativeAddress:${u64g(address)} - memoryAddress:${u64g(memory.getAddress())} = ${lMem}`);
        return lMem;
    };

    // 
    let memory = new WebAssembly.Memory({initial: 1, maximum: 65536, shared: true}); // Avoid TypeScript issues
    let minsta = {};
    let local64Ptr = 0;

    // safer import (try use Vulkan bindings in WebAssembly with AssemblyScript)
    const VK = {
        globalify: (localAddressA, pointerToU64) => {
            let localAddress = 0; // UN-PREFER
            //let U64 = new BigUint64Array(memory.buffer,pointerToU64,1);
            //U64[0] = BigInt(localAddress) + memory.buffer.getAddress(); // make application pointer (un-safe)
            u64s(memory.buffer, local64Ptr = pointerToU64, u64g(localAddress) + memory.buffer.getAddress());
            console.log(`memoryAddress:${memory.buffer.getAddress()} + localAddress:${u64g(localAddressA)} = ${u64p(memory.buffer, pointerToU64)}`);
            return localAddress;
        },

        showValue: (size) => {
            console.log("DEBUG: " + size);
        },

        showNumber64: (lptr) => {
            console.log("ADDRESS: " + u64p(memory.buffer, lptr));
        },

        vkCreateInstance: (instanceCreateInfoAddress, allocatorAddress, instanceAddress) => { // will skipe pointer instance directly into...
            console.log(`vkCreateInstance(${instanceCreateInfoAddress}, ${allocatorAddress}, ${instanceAddress})`);
            
            // 
            console.log("sizeof(VkInstanceCreateInfo) = ", VkInstanceCreateInfo.byteLength);
            console.log("sizeof(VkApplicationInfo) = ", VkApplicationInfo.byteLength);

            let createInfo = new VkInstanceCreateInfo({$memoryBuffer: memory.buffer, $memoryOffset:instanceCreateInfoAddress});
            createInfo.reflect();

            //let appInfo = createInfo.pApplicationInfo;
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

            // DEBUG
            //VK.globalify(instanceCreateInfoAddress, local64Ptr);
            console.log(`Attemp to restore original memory Address: ${ u64p(memory.buffer, local64Ptr) }`);

            // 
            //console.log(toHexString(new Uint8Array(memory.buffer, instanceCreateInfoAddress+24, 8)));
            let uptr64 = u64p(memory.buffer, instanceCreateInfoAddress+24); console.log(uptr64);
            createInfo.pApplicationInfo = new VkApplicationInfo({$memoryBuffer: memory.buffer, $memoryOffset: Number(localify(memory.buffer, uptr64))});
            
            // Currently, NVK working WRONG (I even Attemped to use global address hack)
            console.log(`VkInstanceCreateInfo {`);
            console.log(`   sType: ${createInfo.sType};`);
            console.log(`   pNext: ${createInfo.pNext};`);
            console.log(`   flags: ${createInfo.flags};`);
            console.log(`   pApplicationInfo: ${createInfo.pApplicationInfo};`);
            console.log(`   enabledLayerCount: ${createInfo.enabledLayerCount};`);
            console.log(`   ppEnabledLayerNames: ${createInfo.ppEnabledLayerNames};`);
            console.log(`   enabledExtensionCount: ${createInfo.enabledExtensionCount};`);
            console.log(`   ppEnabledExtensionNames: ${createInfo.ppEnabledExtensionNames};`);
            console.log(`};`);

            // 
            let appInfo = createInfo.pApplicationInfo;
            appInfo.reflect();

            // Currently, NVK working WRONG (I even Attemped to use global address hack)
            console.log(`VkApplicationInfo {`);
            console.log(`   sType: ${appInfo.sType};`);
            console.log(`   pNext: ${appInfo.pNext};`);
            console.log(`   pApplicationName: ${appInfo.pApplicationInfo};`);
            console.log(`   applicationVersion: ${appInfo.applicationVersion};`);
            console.log(`   pEngineName: ${appInfo.pEngineName};`);
            console.log(`   engineVersion: ${appInfo.engineVersion};`);
            console.log(`   apiVersion: ${appInfo.apiVersion};`);
            console.log(`};`);

            let instance = new VkInstance({ $memoryOffset: instanceAddress, $memoryBuffer: memory.buffer });
            return vkCreateInstance(createInfo, allocatorAddress, instance);
        },
        
        vkEnumerateInstanceLayerProperties: (amountOfLayersAddress, layerPropertiesAddress) => {
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
    const fs = require("fs"), code = fs.readFileSync("./public/assembly/pukan-opt.wasm"); 
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
    minsta = vmodule;

    // 
    let address = memory.buffer.getAddress();
    vmodule.exports.setMemAddress( Number((address>>BigInt(0))&BigInt(0xFFFFFFFF)), Number((address>>BigInt(32))&BigInt(0xFFFFFFFF)) ); // drobly 
    vmodule.exports.start();

})();
