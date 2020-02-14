//import * as nvk from "nvk";

/*
Object.assign(global, nvk);

let win = new VulkanWindow({
  width: 480,
  height: 320,
  title: "typescript-example"
});
*/

// 
function VK_MAKE_VERSION(major:u32, minor:u32, patch:u32): u32 { return (((major) << 22) | ((minor) << 12) | (patch)); };
let VK_API_VERSION_1_0: u32 = VK_MAKE_VERSION(1, 0, 0);
let VK_API_VERSION_1_1: u32 = VK_MAKE_VERSION(1, 1, 0);

// 
type gptr_t = u64;
type lptr_t = usize;
type VkResult = u32;


@external("env", "vkCreateInstance")
declare function vkCreateInstance(instanceInfo: lptr_t, allocator: lptr_t, pointerToInstance: lptr_t): VkResult;

@external("env", "vkEnumerateInstanceLayerProperties")
declare function vkEnumerateInstanceLayerProperties(amount: lptr_t, layerProperties: lptr_t): VkResult;

//@external("env", "mUSizePtr")
//declare function mUSizePtr(local: usize): gptr_t;

//@external("env", "mInt64Ptr")
//declare function mInt64Ptr(local: u64): gptr_t;

@external("env", "memoryAddress")
declare var memoryAddress: usize;

// 
function mUSizePtr(local: usize): gptr_t {
    return memoryAddress + <u64>local;
};

// 
//function ptr(local: usize): gptr_t { return mUSizePtr(local); }
//function ptr(local: usize): lptr_t { return local; }


// 
class VkInstance { handle: u64; }; // XPEH-TB

// 
class VkApplicationInfo {
    sType: u32;
    pNext: gptr_t;
    pApplicationName: gptr_t;
    applicationVersion: u32;
    pEngineName: gptr_t;
    engineVersion: u32;
    apiVersion: u32;
};

// 
class VkInstanceCreateInfo {
    sType: u32;
    pNext: gptr_t;
    flags: u32;
    pApplicationInfo: gptr_t;
    enabledLayerCount: u32;
    ppEnabledLayerNames: gptr_t;
    enabledExtensionCount: u32;
    ppEnabledExtensionNames: gptr_t;
};

// 
class VkLayerProperties {
    layerName: gptr_t;
    specVersion: u32;
    implementationVersion: u32;
    description: u64;
};

// 
let instance: VkInstance = {handle: 0};
let applicationName = Uint8Array.wrap(String.UTF8.encode("App Game"));
let engineName = Uint8Array.wrap(String.UTF8.encode("No Engine"));

// 
let appInfo: VkApplicationInfo = {
    sType: 0,
    pNext: 0,
    pApplicationName: mUSizePtr(changetype<lptr_t>(applicationName)),
    applicationVersion: VK_MAKE_VERSION(1, 0, 0),
    pEngineName: mUSizePtr(changetype<lptr_t>(engineName)),
    engineVersion: VK_MAKE_VERSION(1, 0, 0),
    apiVersion: VK_API_VERSION_1_0
};

// 
let validationLayers  : Array<gptr_t> = [ <gptr_t>changetype<lptr_t>(Uint8Array.wrap(String.UTF8.encode("VK_LAYER_KHRONOS_validation"))) ];
let instanceExtensions: Array<gptr_t> = [ ];
let instanceInfo: VkInstanceCreateInfo = {
    sType: 1,
    pNext: 0,
    flags: 0,
    pApplicationInfo: mUSizePtr(changetype<lptr_t>(appInfo)),
    enabledLayerCount: validationLayers.length,
    ppEnabledLayerNames: mUSizePtr(changetype<lptr_t>(validationLayers)),
    enabledExtensionCount: instanceExtensions.length,
    ppEnabledExtensionNames: mUSizePtr(changetype<lptr_t>(instanceExtensions))
};


let result = vkCreateInstance(changetype<lptr_t>(instanceInfo), 0, changetype<lptr_t>(instance));
if (result !== 0) throw `Failed to create VkInstance!`;


/*
let amountOfLayers: u32 = 0;
vkEnumerateInstanceLayerProperties(changetype<lptr_t>(amountOfLayers), 0);
let layers: VkLayerProperties[] = new Array<VkLayerProperties>(amountOfLayers);
vkEnumerateInstanceLayerProperties(changetype<lptr_t>(amountOfLayers), changetype<lptr_t>(layers));
*/