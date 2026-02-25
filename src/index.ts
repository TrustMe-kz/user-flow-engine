import { audit, isset, isObject, ensureAsync } from '@/lib';
import { BaseError } from '@/errors';
import * as types from '@/types';


// Types

export type StepOrShort = types.StepInterface | types.StepShort;

export type StepOrOptions = types.StepInterface | types.AddStepOptions;

export type FlowOrConstructor = types.FlowInterface | types.Constructor<types.FlowInterface>;


// Constants

export const DEFAULT_TICK: types.Milliseconds = 50; // ms

export const FLOW_SUCCESS = 'success';


// Classes

export class FlowStep implements types.StepInterface {
    public short: string = 'flowStep';
    public handleFunc: types.StepHandler = defaultStepHandler;

    constructor(short?: string|null, handler?: types.StepHandler | null) {
        if (short) this.short = short;
        if (handler) this.handleFunc = handler;
    }

    setShort(val: types.StepShort): this {
        this.short = val;
        return this;
    }

    setHandler(val: types.StepHandler): this {
        this.handleFunc = val;
        return this;
    }

    async handle(from?: types.StepInterface | null, to?: types.StepInterface | null, _next?: types.StepNextHandler): Promise<StepOrShort | null> {

        // Defining the functions

        const handle = ensureAsync(this.handleFunc.bind(this));

        const next = (step: types.StepInterface | string): types.StepInterface | null => {
            if (typeof step === 'string' && !_next)
                throw new BaseError(`Unable to navigate to next step: The engine's 'next()' functions was not passed to the 'FlowStep.handle()' method. This might be an internal issue: Please be sure to submit your feedback to the author.`);
            if (typeof step === 'string')
                return _next(step);
            else
                return null;
        };


        // Getting the result

        const result = await handle(from ?? null, to ?? null, next);


        if (isset(result))
            return result;
        else
            return null;
    }
}

export class FlowController implements types.FlowControllerInterface {
    public tick: types.Milliseconds = DEFAULT_TICK;
    public context: types.Obj = {};
    public stepNum: number = 0;
    public steps: types.StepInterface[] = [];
    public interval: any = null;
    public stopVal: any;
    public isInProgress: boolean = false;
    public doStop: boolean = false;

    constructor(steps?: types.StepInterface[] | null, context?: types.Obj | null) {
        if (steps) this.steps = steps;
        if (context) this.context = context;
    }

    public setTick(val: types.Milliseconds): this {
        this.tick = val;
        return this;
    }

    public setContext(val: types.Obj): this {
        this.context = val;
        return this;
    }

    public getStepIndexByShort(val: types.StepShort): number|null {
        const index = this.steps?.findIndex(s => s?.short === val);
        return index >= 0 ? index : null;
    }

    public getStepIndex(val: StepOrShort): number|null {
        if (isObject(val) && (val as types.StepInterface)?.short) {
            const index = this.steps?.findIndex(s => s?.short === (val as types.StepInterface)?.short);
            return index >= 0 ? index : null;
        }

        return this.getStepIndexByShort(val as types.StepShort);
    }

    public getStep(val: StepOrShort): types.StepInterface | null {
        const index = this.getStepIndex(val);

        if (isset(index))
            return this.steps[index];
        else
            return null;
    }

    public setSteps(val: types.StepInterface[]): this {
        this.steps = val;
        return this;
    }

    public addStep(val: types.StepInterface): this {
        this.steps.push(val);
        return this;
    }

    public handle(): Promise<any> {
        return new Promise((resolve, reject) => {

            // Updating the data

            this.isInProgress = true;


            // Defining the function

            const finish = (val?: any, _reject?: boolean|null): void => {
                clearInterval(this.interval);

                if (_reject)
                    reject(val);
                else
                    resolve(val);
            }


            // Setting the interval

            this.interval = setInterval(async () => {

                // Doing some checks

                if (this.doStop) {
                    finish(this.stopVal);
                    return;
                }


                // Getting the step

                const step = this.steps[this.stepNum] ?? null;

                if (!step) {
                    finish(FLOW_SUCCESS);
                    return;
                }


                // Handling the step

                const from = this.steps[this.stepNum - 1] ?? null;
                const to = this.steps[this.stepNum + 1] ?? null;
                let next = null;

                try {
                    next = await step.handle(from, to, this.getStep.bind(this));
                } catch (e: any) {
                    finish(e, true);
                    return;
                }


                // Getting the next step

                const index = this.getStepIndex(next);

                if (isset(next) && !isset(index)) {
                    finish(new BaseError('Unable to continue flow: The next step does not exist. This might be an internal issue: Please be sure to submit your feedback to the author.'), true);
                    return;
                }


                // Navigating to the next step

                if (isset(index))
                    this.stepNum = index;
                else
                    this.stepNum++;
            }, this.tick);
        });
    }

    public stop(val?: any): void {
        this.stopVal = val;
        this.doStop = true;
    }
}

export class BaseFlow implements types.FlowInterface {
    public short: string;
    public abstract: string = 'baseFlow';
    public steps: types.StepInterface[] = [];

    setShort(val: types.FlowShort): this {
        this.short = val;
        return this;
    }

    setAbstract(val: types.FlowShort): this {
        this.abstract = val;
        return this;
    }

    public setSteps(val: StepOrOptions[]): this {
        this.steps.push(...val.map(ensureStep));
        return this;
    }

    public addStep(val: StepOrOptions, _default?: boolean|null): this {

        // Getting the step

        const step = ensureStep(val);

        step.handle = step.handle.bind(this);


        // Adding the step

        if (_default)
            this.steps.splice(0, 0, ensureStep(val));
        else
            this.steps.push(ensureStep(val));


        return this;
    }

    public onCreate(): types.MaybePromise<void> {
        /* The abstract method does nothing */
    }

    public onBeforeFinish(_val?: any): types.MaybePromise<void> {
        /* The abstract method does nothing */
    }

    public onError(e: Error): void {
        throw e;
    }

    public handle(context?: types.Obj | null): FlowController {

        // Doing some checks

        if (this.abstract === this.short)
            throw new BaseError(`Unable to start '${this.short}' flow: The flow is abstract. Consider implement the flow with different 'short'.`);


        // Getting the data

        const err = this.onError.bind(this);

        const create = ensureAsync(this.onCreate.bind(this));

        const finish = (val?: any) => ensureAsync(this.onBeforeFinish.bind(this))(val).catch(err);

        const controller = new FlowController();


        // Handling the flow

        create().then(() => controller
            .setContext(context)
            .setSteps(this.steps)
            .handle()
            .then(finish)
            .catch(err)
        );


        return controller;
    }
}

export class FlowEngine {
    public short: string;
    public context: types.Obj = {};
    public flows: types.FlowInterface[] = [];

    constructor(flow?: types.FlowInterface | null, context?: types.Obj | null) {
        if (flow) this.flows.splice(0, 0, flow);
        if (context) this.context = context;
    }

    public setShort(val: string): this {
        this.short = val;
        return this;
    }

    public setContext(val: types.Obj): this {
        this.context = val;
        return this;
    }

    public getFlowIndex(short: string): number|null {
        const index = this.flows.findIndex(f => f?.short === short);
        return index >= 0 ? index : null;
    }

    public getFlow(short: string): types.FlowInterface | null {
        const index = this.getFlowIndex(short);

        if (isset(index))
            return this.flows[index];
        else
            return null;
    }

    public setFlows(val: FlowOrConstructor[]): this {
        this.flows = val.map(ensureFlow);
        return this;
    }

    public addFlow(val: FlowOrConstructor, _default?: boolean|null): this {
        if (_default)
            this.flows.splice(0, 0, ensureFlow(val));
        else
            this.flows.push(ensureFlow(val));

        return this;
    }

    public handle(val?: FlowOrConstructor | string, context?: types.Obj | null): types.FlowControllerInterface {

        // If the value is a valid types.FlowInterface

        if (isObject(val) && (val as types.FlowInterface)?.short && (val as types.FlowInterface)?.handle)
            return (val as types.FlowInterface).handle();


        // If the value is a flow short

        if (typeof val === 'string') {
            const flow = this.getFlow(val);

            if (flow)
                return flow.handle();
            else
                throw new BaseError(`Unable to start the flow: Flow '${val}' does not exist in engine '${this.short ?? 'unknown'}'`);
        }


        // Getting the flow

        const [ flow ] = this.flows;

        if (!flow) throw new BaseError('Unable to start flow: No flows in engine. Consider either add the flows, or pass the flow directly.');


        return flow.handle({ ...this.context, ...context });
    }
}


// Function

export async function defaultStepHandler(): Promise<StepOrShort | null> {
    return null;
}

export function ensureStep(val: StepOrOptions): types.StepInterface {

    // Doing some checks

    if (isObject(val) && val?.short && val?.handle) return val as types.StepInterface;


    // Getting the data

    const short = val?.short ?? null;
    const handler = val?.handle as types.StepHandler;

    if (!short) throw new BaseError(`The given value is not a 'FlowStep': Field 'short' is not set: ` + audit(val));


    return new FlowStep().setShort(short).setHandler(handler);
}

export function ensureFlow(val: FlowOrConstructor): types.FlowInterface {
    if (typeof val === 'function')
        return new val();
    else
        return val;
}

export function createEngine(options: types.CreateEngineOptions): FlowEngine {
    const short = options?.short ?? null;
    const context = options?.context ?? {};
    const flows = options?.flows ?? [];

    return new FlowEngine().setShort(short).setContext(context).setFlows(flows);
}


export { types, BaseError };

export default FlowEngine;
