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

// 
class u32x2 { a: u32; b: u32; };
class u64x1 { a: u64 };
let memAddress32x2: u32x2 = { a: 0, b: 0 };
let memAddress64x1: u64x1 = { a: 0 };

// 
@external("env", "vkCreateInstance")
declare function vkCreateInstance(instanceInfo: lptr_t, allocator: lptr_t, pointerToInstance: lptr_t): VkResult;

// 
@external("env", "vkEnumerateInstanceLayerProperties")
declare function vkEnumerateInstanceLayerProperties(amount: lptr_t, layerProperties: lptr_t): VkResult;

// 
@external("env", "showNumber")
declare function showNumber(size: u32): void;

//
@external("env", "globalify")
declare function globalify(local: usize, pt64: usize): usize; // pt64 is output with global pointer 

// 
let last64: u64[] = [0];

// 
function ptr(local: usize): u64 {
    globalify(local, changetype<usize>(last64)); return last64[0];
}

// 
@unmanaged class VkInstance { handle: u64; }; // XPEH-TB

// 
@unmanaged class VkApplicationInfo {
    @offset(0x0) sType: u32;
    @offset(0x8) pNext: gptr_t;
    @offset(0x10) pApplicationName: gptr_t;
    @offset(0x18) applicationVersion: u32;
    @offset(0x20) pEngineName: gptr_t;
    @offset(0x28) engineVersion: u32;
    @offset(0x2C) apiVersion: u32;
};

// 
@unmanaged class VkInstanceCreateInfo {
    @offset(0x0) sType: u32;
    @offset(0x8) pNext: gptr_t;
    @offset(0x10) flags: u32;
    @offset(0x18) pApplicationInfo: gptr_t;
    @offset(0x20) enabledLayerCount: u32;
    @offset(0x28) ppEnabledLayerNames: gptr_t;
    @offset(0x30) enabledExtensionCount: u32;
    @offset(0x38) ppEnabledExtensionNames: gptr_t;
};

// 
class VkLayerProperties {
    layerName: gptr_t;
    specVersion: u32;
    implementationVersion: u32;
    description: u64;
};

// 
function mUSizePtr(local: usize): gptr_t {
    //return memAddress64x1.a + <u64>local;
    return ptr(local);
};

// 
export function allocate(m: u32): ArrayBuffer {
    return new ArrayBuffer(m);
}

// 
export function setMemAddress(a: u32, b: u32): void {
    memAddress32x2.a = a, memAddress32x2.b = b;
    store<u64>(changetype<lptr_t>(memAddress64x1), load<u64>(changetype<lptr_t>(memAddress32x2)));
};

// 
export function start(): void {
    showNumber(offsetof<VkInstanceCreateInfo>());
    showNumber(offsetof<VkApplicationInfo>());
    

    // 
    let extensions: gptr_t[] = [ mUSizePtr(changetype<lptr_t>(Uint8Array.wrap(String.UTF8.encode("VK_KHR_get_physical_device_properties2")))) ];
    let instlayers: gptr_t[] = [ mUSizePtr(changetype<lptr_t>(Uint8Array.wrap(String.UTF8.encode("VK_LAYER_KHRONOS_validation")))) ];
    
    // 
    let instance: VkInstance = {handle: 0};
    let applicationName = Uint8Array.wrap(String.UTF8.encode("App Game"));
    let engineName = Uint8Array.wrap(String.UTF8.encode("No Engine"));

    // 
    let appPtr: ArrayBuffer = new ArrayBuffer(offsetof<VkApplicationInfo>());
    let appInfo: VkApplicationInfo = changetype<VkApplicationInfo>(appPtr);/*{
        sType: 0,
        pNext: 0,
        pApplicationName: mUSizePtr(changetype<lptr_t>(applicationName)),
        applicationVersion: VK_MAKE_VERSION(1, 0, 0),
        pEngineName: mUSizePtr(changetype<lptr_t>(engineName)),
        engineVersion: VK_MAKE_VERSION(1, 0, 0),
        apiVersion: VK_API_VERSION_1_1
    };*/
    appInfo.sType = 0;
    appInfo.pNext = 0;
    appInfo.pApplicationName = mUSizePtr(changetype<lptr_t>(applicationName));
    appInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.pEngineName = mUSizePtr(changetype<lptr_t>(engineName));
    appInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
    appInfo.apiVersion = VK_API_VERSION_1_1;

    // 
    let validationLayers   : u32x2 = { a: 0, b: 0 };
    let instanceExtensions : u32x2 = { a: 0, b: 0 };
    let instancePtr: ArrayBuffer = new ArrayBuffer(offsetof<VkInstanceCreateInfo>());
    let instanceInfo: VkInstanceCreateInfo = changetype<VkInstanceCreateInfo>(instancePtr);/*{
        sType: 1, pNext: 0, flags: 0, 
        pApplicationInfo: mUSizePtr(changetype<lptr_t>(appInfo)),
        enabledLayerCount: instlayers.length,
        ppEnabledLayerNames: mUSizePtr(changetype<lptr_t>(instlayers)),
        enabledExtensionCount: extensions.length,
        ppEnabledExtensionNames: mUSizePtr(changetype<lptr_t>(extensions))
    };*/

    instanceInfo.sType = 1;
    instanceInfo.pNext = 0;
    instanceInfo.flags = 0;
    instanceInfo.pApplicationInfo = mUSizePtr(changetype<lptr_t>(appInfo));
    instanceInfo.enabledLayerCount = instlayers.length;
    instanceInfo.ppEnabledLayerNames = mUSizePtr(changetype<lptr_t>(instlayers));
    instanceInfo.enabledExtensionCount = extensions.length;
    instanceInfo.ppEnabledExtensionNames = mUSizePtr(changetype<lptr_t>(extensions));

    // 
    let result = vkCreateInstance(changetype<lptr_t>(instanceInfo), 0, changetype<lptr_t>(instance));
    if (result !== 0) throw `Failed to create VkInstance!`;
    
    // 
    //let amountOfLayers: u32 = 0;
    //vkEnumerateInstanceLayerProperties(changetype<lptr_t>(amountOfLayers), 0);
    //let layers: VkLayerProperties[] = new Array<VkLayerProperties>(amountOfLayers);
    //vkEnumerateInstanceLayerProperties(changetype<lptr_t>(amountOfLayers), changetype<lptr_t>(layers));

};
