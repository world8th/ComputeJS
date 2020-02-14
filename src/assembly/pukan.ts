//import * as nvk from "nvk";

/*
Object.assign(global, nvk);

let win = new VulkanWindow({
  width: 480,
  height: 320,
  title: "typescript-example"
});
*/

//export declare namespace VK {
    export declare function vkCreateInstance(instanceInfo:usize, allocator:u64, pointerToInstance:u64): u32;
    export declare function vkEnumerateInstanceLayerProperties(amount:u64,layerProperties:u64): u32;
    export declare function mUSizePtr(local: usize): u64;
    export declare function mInt64Ptr(local: u64  ): u64;
//};

function ptr(local: usize): u64 { return mUSizePtr(local); }

function VK_MAKE_VERSION(major:u32, minor:u32, patch:u32): u32 { return (((major) << 22) | ((minor) << 12) | (patch)); };
let VK_API_VERSION_1_0: u32 = VK_MAKE_VERSION(1, 0, 0);
let VK_API_VERSION_1_1: u32 = VK_MAKE_VERSION(1, 1, 0);

class VkInstance { handle: u64; }; // XPEH-TB
class VkApplicationInfo {
    sType: u32;
    pNext: u64;
    pApplicationName: u64;
    applicationVersion: u32;
    pEngineName: u64;
    engineVersion: u32;
    apiVersion: u32;
};

class VkInstanceCreateInfo {
    sType: u32;
    pNext: u64;
    flags: u32;
    pApplicationInfo: u64;
    enabledLayerCount: u32;
    ppEnabledLayerNames: u64;
    enabledExtensionCount: u32;
    ppEnabledExtensionNames: u64;
};

class VkLayerProperties {
    layerName: u64;
    specVersion: u32;
    implementationVersion: u32;
    description: u64;
};

let instance = new VkInstance();
let appInfo: VkApplicationInfo = {
    sType: 0,
    pNext: 0,
    pApplicationName: ptr(changetype<usize>(String.UTF8.encode("Hello!"))),
    applicationVersion: VK_MAKE_VERSION(1, 0, 0),
    pEngineName: ptr(changetype<usize>(String.UTF8.encode("No Engine"))),
    engineVersion: VK_MAKE_VERSION(1, 0, 0),
    apiVersion: VK_API_VERSION_1_0
};

let validationLayers: u64[] = [];
let instanceExtensions: u64[] = [];
let instanceInfo: VkInstanceCreateInfo = {
    sType: 1,
    pNext: 0,
    pApplicationInfo: 0,//changetype<usize>(appInfo),
    enabledLayerCount: validationLayers.length,
    ppEnabledLayerNames: ptr(changetype<usize>(validationLayers)),
    enabledExtensionCount: instanceExtensions.length,
    ppEnabledExtensionNames: ptr(changetype<usize>(instanceExtensions))
};

let result = vkCreateInstance(changetype<usize>(instanceInfo), 0, ptr(changetype<usize>(instance)));
if (result !== 0) throw `Failed to create VkInstance!`;


let amountOfLayers: u32 = 0;
vkEnumerateInstanceLayerProperties(ptr(changetype<usize>(amountOfLayers)), 0);
let layers: VkLayerProperties[] = new Array<VkLayerProperties>(amountOfLayers);
vkEnumerateInstanceLayerProperties(ptr(changetype<usize>(amountOfLayers)), ptr(changetype<usize>(layers)));
