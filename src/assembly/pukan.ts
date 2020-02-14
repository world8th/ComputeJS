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
    export declare function vkCreateInstance(instanceInfo:usize,allocator:usize,pointerToInstance:usize): u32;
    export declare function vkEnumerateInstanceLayerProperties(amount:usize,layerProperties:usize): u32;
    export declare function vhHardPtr(local: usize): usize;
//};

function VK_MAKE_VERSION(major:u32, minor:u32, patch:u32): u32 { return (((major) << 22) | ((minor) << 12) | (patch)); };
let VK_API_VERSION_1_0: u32 = VK_MAKE_VERSION(1, 0, 0);
let VK_API_VERSION_1_1: u32 = VK_MAKE_VERSION(1, 1, 0);

class VkInstance { handle: u64; }; // XPEH-TB
class VkApplicationInfo {
    sType: u32;
    pNext: usize;
    pApplicationName: usize;
    applicationVersion: u32;
    pEngineName: usize;
    engineVersion: u32;
    apiVersion: u32;
};

class VkInstanceCreateInfo {
    sType: u32;
    pNext: usize;
    flags: u32;
    pApplicationInfo: usize;
    enabledLayerCount: u32;
    ppEnabledLayerNames: usize;
    enabledExtensionCount: u32;
    ppEnabledExtensionNames: usize;
};

class VkLayerProperties {
    layerName: usize;
    specVersion: u32;
    implementationVersion: u32;
    description: usize;
};

let instance = new VkInstance();
let appInfo: VkApplicationInfo = {
    sType: 0,
    pNext: 0,
    pApplicationName: vhHardPtr(changetype<usize>(String.UTF8.encode("Hello!"))),
    applicationVersion: VK_MAKE_VERSION(1, 0, 0),
    pEngineName: vhHardPtr(changetype<usize>(String.UTF8.encode("No Engine"))),
    engineVersion: VK_MAKE_VERSION(1, 0, 0),
    apiVersion: VK_API_VERSION_1_0
}

let validationLayers: usize[] = [];
let instanceExtensions: usize[] = [];
let instanceInfo: VkInstanceCreateInfo = {
    sType: 1,
    pNext: 0,
    pApplicationInfo: 0,//changetype<usize>(appInfo),
    enabledLayerCount: validationLayers.length,
    ppEnabledLayerNames: vhHardPtr(changetype<usize>(validationLayers)),
    enabledExtensionCount: instanceExtensions.length,
    ppEnabledExtensionNames: vhHardPtr(changetype<usize>(instanceExtensions))
};

let result = vkCreateInstance(changetype<usize>(instanceInfo), 0, vhHardPtr(changetype<usize>(instance)));
if (result !== 0) throw `Failed to create VkInstance!`;


let amountOfLayers: u32 = 0;
vkEnumerateInstanceLayerProperties(vhHardPtr(changetype<usize>(amountOfLayers)), 0);
let layers: VkLayerProperties[] = new Array<VkLayerProperties>(amountOfLayers);
vkEnumerateInstanceLayerProperties(vhHardPtr(changetype<usize>(amountOfLayers)), vhHardPtr(changetype<usize>(layers)));
