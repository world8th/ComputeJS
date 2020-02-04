// The entry file of your WebAssembly module.
import "rt/index-full";

const sh: i32[] = [0,8,16,24];
const byteSize: u32 = 16;
//const byteSize: u32 = 4;
let threadCount: u32 = 1;

//export function barrier(): void {}
export function init(c: u32): void { threadCount = c; }
export function allocate(m: u32): ArrayBuffer {
    return new ArrayBuffer(m);
}
export function free(buffer: usize): void { ; }

//export function setU8(ptr: usize, data: u8): void { store<u8>(ptr,data); };
//export function getU8(ptr: usize): u8 { return load<u8>(ptr); };

// TODO: WebGPU version of grayscale program
export function main(threadID: u32, width: u32, height: u32, buffer: usize): usize {
    let size: u32 = (width*height)/(4*threadCount);
    //let size: u32 = (width*height)/(threadCount);
    let offset: usize = 0;
    let pixel: u32 = 0x00000000;
    let fr: f32 = 0.0, fg: f32 = 0.0, fb: f32 = 0.0, fa: f32 = 0.0;
    let fG: f32 = 0.0;

    for (let I: u32 = 0; I < size; I++) 
    //let I: u32 = 0;
    {
/*
        offset = (threadID*size+I)*byteSize; //(threadCount*I + threadID)*byteSize;
        pixel = load<u32>(buffer+offset);

        // Get RGBA in Float32 format
        fr = (<f32>((pixel&0x000000FF)>>sh[0]))*<f32>(1.0/255.0);
        fg = (<f32>((pixel&0x0000FF00)>>sh[1]))*<f32>(1.0/255.0);
        fb = (<f32>((pixel&0x00FF0000)>>sh[2]))*<f32>(1.0/255.0);
        fa = (<f32>((pixel&0xFF000000)>>sh[3]))*<f32>(1.0/255.0);

        // Compute Grayscale value
        fG = (fr+fg+fb)*<f32>(1.0/3.0);
        
        // Change pixel value (ARGB order)
        pixel  = (<u32>(fa*<f32>(255.0)))<<sh[3];
        pixel |= (<u32>(fG*<f32>(255.0)))<<sh[0];
        pixel |= (<u32>(fG*<f32>(255.0)))<<sh[1];
        pixel |= (<u32>(fG*<f32>(255.0)))<<sh[2];

        // Store that pixel
        store<u32>(buffer+offset, pixel);
*/
        
        // load by SIMD WARP
        let offset: usize = (threadCount*I + threadID)*byteSize;
        let pixel: v128 = v128.load(buffer+offset); // 4x pixels (32-bit of RGBA8)

        // Get RGBA8 Unorm
        let fr: v128 = v128.mul<f32>(v128.convert<u32>(              v128.and(pixel, v128.splat<u32>(0x000000FF))        ), v128.splat<f32>(1.0/255.0));
        let fg: v128 = v128.mul<f32>(v128.convert<u32>(v128.shr<u32>(v128.and(pixel, v128.splat<u32>(0x0000FF00)), sh[1])), v128.splat<f32>(1.0/255.0));
        let fb: v128 = v128.mul<f32>(v128.convert<u32>(v128.shr<u32>(v128.and(pixel, v128.splat<u32>(0x00FF0000)), sh[2])), v128.splat<f32>(1.0/255.0));
        let fa: v128 = v128.mul<f32>(v128.convert<u32>(v128.shr<u32>(v128.and(pixel, v128.splat<u32>(0xFF000000)), sh[3])), v128.splat<f32>(1.0/255.0));

        // Compute Grayscale value
        let fG: v128 = v128.mul<f32>(v128.add<f32>(fr, v128.add<f32>(fg, fb)), v128.splat<f32>(1.0/3.0));
        
        // Re-construct pixel (ARGB order)
        pixel =                v128.shl<u32>(v128.trunc_sat<u32>(v128.mul<f32>(fa,v128.splat<f32>(255.0))), sh[3]);  // begin from unchanged alpha (but shift)
        pixel = v128.or(pixel, v128.shl<u32>(v128.trunc_sat<u32>(v128.mul<f32>(fG,v128.splat<f32>(255.0))), sh[0])); // `or` operator required
        pixel = v128.or(pixel, v128.shl<u32>(v128.trunc_sat<u32>(v128.mul<f32>(fG,v128.splat<f32>(255.0))), sh[1])); // `or` operator required
        pixel = v128.or(pixel, v128.shl<u32>(v128.trunc_sat<u32>(v128.mul<f32>(fG,v128.splat<f32>(255.0))), sh[2])); // `or` operator required

        // 
        v128.store(buffer+offset, pixel);
    };
    return buffer;
}
