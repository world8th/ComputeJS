
class Workgroup {
    constructor(){
        
    }
    
    async initiate(module, threads = 1){
        //WebAssembly.instantiateStreaming(fetch(
        this.workers = [];

        // initialize threads
        for (let i=0;i<threads;i++) { this.workers.push(new Worker(`src/thread.js`)); }

        // 
        this.reponseIndex = 0, this.responses = {};

        // 
        let resp = this.reponseIndex++;
        this.responses[resp] = [];

        // initialize workers
        this.moduleFetch = (await fetch(module)).arrayBuffer();
        this.module = await WebAssembly.compile(await this.moduleFetch);

        // create shared memory model
        this.memory = new WebAssembly.Memory({initial: 1, maximum: 65536, shared: true});
        //this.table = new WebAssembly.Table({initial: 1, maximum: 65536, shared: true, element: "anyfunc"});

        // create host/manager instance
        this.instance = await WebAssembly.instantiate(this.module, { env: {
            memory: this.memory,
            abort: function() { throw Error("abort called"); }
        }});
        this.instance.exports.init(threads);

        this.workers.every(async (w,i)=>{
            w.responses = {};
            w.onmessage = (e)=>{ w.responses[e.data.response].resolved = e.data; }

            // add new task into worker
            let response = {}; w.responses[resp] = response; // initialize resolver
            this.responses[resp][i] = new Promise((resolve,reject)=>{ Object.defineProperty(response, "resolved", {set: value => { value?resolve(value):reject() }}); });

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
            this.responses[resp][i] = new Promise((resolve,reject)=>{ Object.defineProperty(response, "resolved", {set: value => { value?resolve(value):reject() }}); });
        })

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
    map(ptr){
        //let lengthPtr = new Uint32Array(this.instance.exports.memory.buffer,ptr-4,1);
        return new Uint8Array(this.instance.exports.memory.buffer,ptr/*,lengthPtr[0]/Uint8Array.BYTES_PER_ELEMENT*/);
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

    // get task ID (not recommended)
    get id() { return this.resp; }
}

export default {
    async init() { return 0; },
    async workgroup(module, threads = 1) {
        return new Workgroup().initiate(module, threads);
    }
};
