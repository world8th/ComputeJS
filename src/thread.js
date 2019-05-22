let instance = null, threads = 1, id = 0;
//let table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

// thread native dispatcher 
onmessage = async (e)=>{
    let result = null;
    
    if (e.data.type == "init") {
        threads = e.data.threads, id = e.data.id;

        instance = await WebAssembly.instantiate(e.data.module, { env: {
            abort: function() { throw Error("abort called"); }, memory: e.data.memory
        }});

        result = await instance.exports.init(threads);
    }
    if (e.data.type == "dispatch") {
        result = await instance.exports[e.data.name](id, ...e.data.args);
    }

    postMessage(Object.assign(e.data, {result}));
}
