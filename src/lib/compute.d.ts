export declare namespace Compute {
    interface Workgroup{}
    interface Worktask{}
    interface TaskInterface {
        name?: string
        args?: number[] // TODO: correct typing
        resp?: number
        workgroup?: Workgroup
    }

    class Workgroup {
        constructor();
        initiate(module:string,threads?:number,supportCode?:string): Promise<Workgroup>;
        wait(resp: Promise<any>): Promise<Workgroup>;
        task(input?:TaskInterface): Worktask;
        allocate(size?:number): number;
        free(pointer:number): any;
        map<T=Uint8Array>(ptr:number,range?:number,type?:new(arrayBuffer?:ArrayBuffer,offset?:number,range?:number)=>T): T;
    }

    class Worktask {
        constructor(input?:TaskInterface);
        dispatch(): Promise<any>; // TODO: fix result type
        support (): Promise<any>; // TODO: fix result type
        get id(): number;
    }

    interface Module {
        init(): Promise<any>;
        workgroup(module:string,threads?:number,supportCode?:string): Promise<Workgroup>;
    }
}

export default Module;
