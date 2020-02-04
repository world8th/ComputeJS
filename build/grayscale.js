(async ()=>{
    let canvas = document.querySelector("#canvas");
    let ctx = canvas.getContext("2d");
    
    let image = new Image();
    let promise = new Promise((resolve,reject)=>{
        image.onload=resolve;
        image.onerror=reject;
    });
    image.src = "assets/images/test.png";
    await promise;

    //let computeSource = URL.createObjectURL(await (await fetch("./src/compute.js")).blob());

    // import compute library 
    //let compute = (await import(computeSource)).default;
    let compute = (await import("./lib/compute.js")).default;

    // initialize compute framework
    //await compute.init();

    // create wasm workgroup (4 threads) with module
    let workgroup = await compute.workgroup("./build/assembly/optimized.wasm", 6, `
        await (async (data)=>{
            return instance.exports[data.name](id, ...data.args);
        })`);
    console.log("created workers!");

    ctx.drawImage(image,0,0);
    let imageData = ctx.getImageData(0,0,640,480);
    let size = Math.min(imageData.width*imageData.height*4,1024*1024*1024);
    
    // allocate shared memory for work
    let buffer = workgroup.allocate(size); console.log(buffer);
    let map = workgroup.map(buffer);
    console.log("allocation of shared memory complete!");

    // set mapped memory by imagedata
    for (let i=0;i<size;i++) { map[i] = imageData.data[i]; };
    
    // create work task
    //let task = workgroup.task({name: "main", args: [imageData.width, imageData.height, buffer]});
    //console.log("compute task created!");

    // dispatch compute for buffer
    //await task.dispatch();

    // Run "support" task (can run "main" without input data)
    await workgroup.task({name: "main", args: [imageData.width, imageData.height, buffer]}).support();
    console.log("compute done!");

    // set imageData by mapped memory
    for (let i=0;i<size;i++) { imageData.data[i] = map[i]; };
    console.log(`copied back data with ${size} bytes!`);
    

    // put imageData
    ctx.putImageData(imageData,0,0);

})();