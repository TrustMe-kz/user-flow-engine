# User Flow Engine

**User Flow Engine** is a lightweight runtime engine for executing user flows as ordered steps with deterministic transitions.  

It is framework-agnostic and works in both browser and Node.js environments.

### Features

- Deterministic step execution by index
- Goto-style transitions with `next('stepShort')`
- Works with sync and async handlers
- Extensible flow lifecycle hooks: `onCreate`, `onBeforeFinish`, `onError`
- Zero framework coupling

## Quick Start

```js
import { BaseFlow, createEngine } from 'user-flow-engine';

class OnboardingFlow extends BaseFlow {
  short = 'onboarding';
  abstract = false;

  onCreate() {
    this.addStep({
      short: 'welcome',
      async handle(_from, _to, next) {
        console.log('Welcome step');
        return next('profile');
      },
    });

    this.addStep({
      short: 'profile',
      handle() {
        console.log('Profile step');
        // return undefined/null -> engine moves to next step by index
      },
    });
  }
}

const engine = createEngine({
  short: 'app',
  context: { isAuthorized: true },
  flows: [new OnboardingFlow()],
});

engine.handle('onboarding');
```

## Installation

```shell
npm i user-flow-engine
```

## Example

`flows.js`:

```js
import { BaseFlow } from 'user-flow-engine';

export class SignedInFlow extends BaseFlow {
  abstract = true;
}

export class UsersWithCompaniesFlow extends SignedInFlow {
  abstract = true;
}

export class JustRegisteredFlow extends SignedInFlow {
  short = 'justRegistered';
  abstract = false;

  onCreate() {
    this.addStep({
      short: 'todoReplaceByTheRealStepShort',
      handle() {
        // TODO: Replace by the real step handler
      },
    });
  }
}

export class LandingToPaymentFlow extends UsersWithCompaniesFlow {
  short = 'landingToPayment';
  abstract = false;
  todoRemoveThisCounter = 0;

  onCreate() {
    this.addStep({
      short: 'todoReplaceByTheRealStepShort1',
      async handle() {
        console.log('TEST FLOW #' + this.todoRemoveThisCounter);
        this.todoRemoveThisCounter += 1;
      },
    });

    this.addStep({
      short: 'todoReplaceByTheRealStepShort2',
      handle(_from, _to, next) {
        console.log('------------');
        return next('todoReplaceByTheRealStepShort1');
      },
    });
  }
}
```

`engine.js`:

```js
import { createEngine } from 'user-flow-engine';
import {
  JustRegisteredFlow,
  LandingToPaymentFlow,
} from './flows';

export const engine = createEngine({
  short: 'legacyFrontend',
  context: {
    isAuthorized: true,
    isJustSignedIn: true,
    isJustSignedUp: true,
    isActivePlan: false,
    isTrial: false,
  },
  flows: [
    new JustRegisteredFlow(),
    new LandingToPaymentFlow(),
  ],
});

export default engine;
```

## API

### Exports

- `createEngine(options)`
- `FlowEngine` (default export)
- `BaseFlow`
- `FlowController`
- `FlowStep`
- `BaseError`
- `types` (TypeScript contracts)
- `FLOW_SUCCESS`
- `DEFAULT_TICK`

### createEngine({/* options */})

| Option    | Type | Required | Description |
|-----------| --- | --- | --- |
| `short`   | `string` | yes | Engine identifier |
| `context` | `Record<string, any> \| null` | no | Default context |
| `flows`   | `FlowInterface[] \| null` | no | Registered flows |

### FlowEngine

**Key methods:**

- `setShort(short: string): this`
- `setContext(context: Obj): this`
- `setFlows(flows: FlowInterface[]): this`
- `addFlow(flow: FlowInterface, _default?: boolean | null): this`
- `getFlow(short: string): FlowInterface | null`
- `handle(val?: FlowInterface | string, context?: Obj | null): FlowControllerInterface`

`handle(...)` modes:
1. `engine.handle(flowObj)` -> starts provided flow object.
2. `engine.handle('flowShort')` -> starts registered flow by `short`.
3. `engine.handle()` -> starts first flow in engine list.

### BaseFlow

**Fields:**
- `short: string` (default: `'baseFlow'`)
- `abstract: boolean` (default: `true`)
- `steps: StepInterface[]`

**Hooks:**
- `onCreate(): void | Promise<void>`
- `onBeforeFinish(val?: any): void | Promise<void>`
- `onError(error: Error): void`

**Key methods:**
- `addStep(step, _default?)`
- `setSteps(steps)`
- `handle(context?)`

**Important:**
- `abstract = true` flows are not runnable and throw `BaseError`
- `onCreate()` runs on each `handle()` call

### FlowController

**Fields:**
- `tick`
- `stepNum`
- `steps`
- `interval`
- `isInProgress`
- `doStop`
- `stopVal`

**Methods:**
- `handle(): Promise<any>`
- `stop(val?: any): void`
- `getStep(...)`, `getStepIndex(...)`, `setSteps(...)`, `addStep(...)`

### FlowStep

```ts
handle(from, to, next)
```

- `from` -> previous step or `null`
- `to` -> next linear step or `null`
- `next('stepShort')` -> returns target step by short

## Execution Semantics

- Execution is sequential by `stepNum`
- If current step is missing, flow resolves with `FLOW_SUCCESS`
- If step handler returns `undefined` or `null`, controller moves to next step by index
- If handler returns `next('stepShort')`, controller jumps to that step
- If step throws, flow fails and `onError` is called
- `controller.stop(value)` stops execution and resolves with that value

## Notes

- The engine does not provide routing/UI/state/network/storage/analytics
- No built-in automatic "best flow" selection (`priority`, scoring, tie-breakers, etc.)
- `onCreate()` should register steps predictably to avoid accidental accumulation across re-runs

## TypeScript Contracts

### Main contracts are defined in `src/types.ts`:
- `StepInterface`
- `FlowInterface`
- `FlowControllerInterface`
- `StepHandler`, `StepNextHandler`
- `CreateEngineOptions`, `AddStepOptions`

## Development

Build library bundles and declarations:

```shell
npm run build
```

---

**User Flow Engine by Kenny Romanov**  
TrustMe
