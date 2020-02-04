declare namespace Compute {
    declare interface Workgroup{}
    declare interface Worktask{}
    declare interface TaskInterface {
        name: string = "main";
        args: number[] = []; // TODO: correct typing
        resp: number = 0;
        workgroup: Workgroup;
    }

    declare class Workgroup {
        constructor();
        initiate(module:string,threads?:number,supportCode?:string) : Promise<Workgroup>;
        wait(resp: Promise<any>) : Promise<Workgroup>;
        task(input?:TaskInterface) : Worktask;
        allocate(size?:number) : number;
        free(pointer:number) : any;
        map<T=Uint8Array>(ptr:number,range?:number,type?:T) : T;
    }

    declare class Worktask {
        constructor(input?:TaskInterface);
        dispatch(): Promise<any>; // TODO: fix result type
        support (): Promise<any>; // TODO: fix result type
        get id(): number;
    }
}

declare interface ComputeModule {
    init() : Promise<any>;
    workgroup(module:string,threads?:number =1,supportCode?:string=``) : Promise<Workgroup>;
}
