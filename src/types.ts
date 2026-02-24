
// Base Data Types

export type Milliseconds = number;

export type Obj<T extends any = any> = Record<string, T>;

export type StepShort = string;

export type FlowShort = string;

export type Isset<T extends any> = T extends null|undefined ? false : true;

export type IsNumber<T extends any> = T extends number ? true : false;

export type IsObject<T extends any, O extends Obj = Obj> = T extends O ? true : false;

export type Has<T extends Obj, K extends keyof T> = T[K];

export type Inarr<T extends any, A extends any[]> = T extends A[any] ? true : false;

export type MaybePromise<T extends any = any> = T | Promise<T>;


// Base Interfaces

export interface StepInterface {
    short: StepShort,
    handle: StepHandler,
}

export interface FlowControllerInterface {
    tick: Milliseconds,
    stepNum: number,
    steps: StepInterface[],
    interval: any,
    stopVal: any,
    isInProgress: boolean,
    doStop: boolean,
    handle: FlowControllerStartHandler,
    stop: FlowControllerStopHandler,
}

export interface FlowInterface {
    short: FlowShort,
    abstract: boolean,
    steps: StepInterface[],
    handle: FlowHandler,
}


// Base Callable Types

export type StepNextHandler = (step?: StepInterface | string) => StepInterface | null;

export type StepHandler = (from?: StepInterface | null, to?: StepInterface | null, next?: StepNextHandler) => Promise<StepInterface | StepShort | null>;

export type StepHandleFunc = (from?: StepInterface | null, to?: StepInterface | null, next?: StepNextHandler) => MaybePromise<StepInterface | StepShort | null | void>;

export type FlowControllerStartHandler = () => Promise<any>;

export type FlowControllerStopHandler = (val?: any) => void;

export type FlowHandler = (context?: Obj | null) => FlowControllerInterface;


// Base Options Types

export type AddStepOptions = {
    short: StepShort,
    handle: StepHandleFunc,
};

export type CreateEngineOptions = {
    short: string,
    context?: Obj | null,
    flows?: FlowInterface[] | null,
};
