const { Worker, isMainThread, parentPort, workerData } = typeof require != "undefined" ? require('worker_threads') : { Worker: global.Worker, isMainThread: true, parentPort: this, workerData: {} };
//const fetch = typeof require != "undefined" ? require('node-fetch') : global.fetch;
//const Blob  = typeof require != "undefined" ? require('cross-blob') : global.Blob;
let fs;
if (typeof require != "undefined") fs = require("fs");

let ThreadCode = (support = ``)=>{ return `
let instance = null, threads = 1, id = 0;
//let table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

// thread native dispatcher 
this.onmessage = async (e)=>{
    const { Worker, isMainThread, parentPort, workerData} = typeof require != "undefined" ? require('worker_threads') : { Worker, isMainThread: false, parentPort: this, workerData: {} };
    
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
    
    if (e.data.type == "support") {
        result = ${support}(e.data);
    }

    this.postMessage(Object.assign(e.data, {result}));
}
`};

class Workgroup {
    constructor(){
        
    }
    
    async initiate(module, threads = 1, supportCode = ``){
        //WebAssembly.instantiateStreaming(fetch(
        this.workers = [];

        // initialize threads
        let blob = null, url = "";
        if (typeof Blob != "undefined") {
            blob = new Blob([ThreadCode(supportCode)],{type:"text/javascript"}), url = URL.createObjectURL(blob);
            for (let i=0;i<threads;i++) { this.workers.push(new Worker(url)); }
        } else {
            url = ThreadCode(supportCode);
        }

        // 
        this.reponseIndex = 0, this.responses = {};

        // 
        let resp = this.reponseIndex++;
        this.responses[resp] = [];

        // initialize workers
        try {
            if (typeof fetch != "undefined") this.moduleFetch = await (await fetch(module)).arrayBuffer();
            if (typeof fetch == "undefined") this.moduleFetch = fs.readFileSync(module).buffer;
        } catch(e) {
            console.error(e);
        }

        try {
            this.module = await WebAssembly.compile(this.moduleFetch);
        } catch(e) {
            console.error(e);
        }

        // create shared memory model
        this.memory = new WebAssembly.Memory({initial: 1, maximum: 65536, shared: true});
        //this.table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

        // create host/manager instance
        (this.instance = await WebAssembly.instantiate(this.module, { env: {
            memory: this.memory,
            abort: function() { throw Error("abort called"); }
        }})).exports.init(threads);

        // 
        this.workers.every(async (w,i)=>{
            w.responses = {};
            w.onmessage = (e)=>{ w.responses[e.data.response].resolved = e.data; };

            // add new task into worker
            let response = {}; w.responses[resp] = response; // initialize resolver
            this.responses[resp][i] = new Promise((resolve,reject)=>{ Object.defineProperty(response, "resolved", {set: value => { value?resolve(value):reject(); }}); });

            // send command into worker
            w.postMessage({ response: resp, type: "init", module: this.module, memory: this.memory, threads, id: i });
        });

        // await initialization of workers
        await Promise.all(this.responses[resp]);

        return this;
    }

    // wait task by ID
    async wait(resp){
        let result = await Promise.all(this.responses[resp]);
        delete this.responses[resp];
        return result;
    }
    
    // create work task 
    task({name="main",args=[]}){
        // 
        let resp = this.reponseIndex++;
        this.responses[resp] = [];
        
        // add new task into worker
        this.workers.every(async (w,i)=>{
            let response = {}; w.responses[resp] = response; // initialize resolver
            this.responses[resp][i] = new Promise((resolve,reject)=>{ Object.defineProperty(response, "resolved", {set: value => { value?resolve(value):reject(); }}); });
        });

        return new Worktask({name,args,resp,workgroup:this});
    }
    
    // allocate memory for work
    allocate(size = 4){
        return this.instance.exports.allocate(size);
    }

    // free memory pointer
    free(pointer){
        return this.instance.exports.free(pointer);
    }

    // get workgroup memory object 
    map(ptr, range = 0, type = Uint8Array){
        if (range) {
            return new type(this.instance.exports.memory.buffer, ptr, range); // Ranged
        } else {
            return new type(this.instance.exports.memory.buffer, ptr); // Whole Size (may used for WebGPU)
        }
    }
}

class Worktask {
    constructor({name="main",args=[],resp=0,workgroup}) {
        this.workgroup = workgroup, this.resp = resp, this.args = args, this.name = name;
    }

    // send command for computing
    async dispatch() {
        ///return this.workgroup.instance.exports[this.name](0, ...this.args);
        this.workgroup.workers.every(async (w,i)=>{
            w.postMessage({ type: "dispatch", id:i, response: this.resp, name: this.name, args: this.args });
        });
        return this.workgroup.wait(this.resp);
    }

    // send command for javascript host manager
    async support() {
        ///return this.workgroup.instance.exports[this.name](0, ...this.args);
        this.workgroup.workers.every(async (w,i)=>{
            w.postMessage({ type: "support", id:i, response: this.resp, name: this.name, args: this.args });
        });
        return this.workgroup.wait(this.resp);
    }

    // get task ID (not recommended)
    get id() { return this.resp; }
}

export default {
    async init() { return 0; },
    async workgroup(module, threads = 1,support=``) {
        return new Workgroup().initiate(module,threads,support);
    }
};
