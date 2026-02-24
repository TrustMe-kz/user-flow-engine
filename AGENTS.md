# User Flow Engine

Instructions for AI agents working with this repository.

---

## 0) Quick facts about this repository

* Purpose: a minimal **runtime engine** for executing **user flows** (Flow) as an ordered sequence of **steps** (Step) with deterministic transitions
* Strengths:
    * A single, clean contract for steps and transitions: `handle(from, to, next)` + `next(stepShort)`
    * Uniform support for **sync and async** step handlers via `ensureAsync`
    * Lightweight core (no framework coupling) suitable for browser/Node environments
* Anti-goals (core library):
    * ❌ Routing (Vue Router/React Router)
    * ❌ UI/state management
    * ❌ Network layer
    * ❌ Storage/persistence
    * ❌ Analytics
    * ❌ Event bus (unless explicitly added as an optional interface)
* Current engine semantics (source of truth):
    * Flow execution is started explicitly through `engine.handle(...)`
    * `next('stepShort')` behaves like a **goto** to a step by `short`
    * If a step returns `undefined`/`null`, the engine proceeds to the **next step by index**
    * Errors thrown in a step **fail the flow** (reject) and trigger `onError`
    * `abstract = true` flows are **not runnable** and throw a `BaseError` if started
* Important non-features (by design *for now*):
    * Automatic “best flow” selection, `interferes`, `priority`, scoring, tie-breaking
    * Built-in logging/events/trace IDs
* Core entities:
    * `FlowEngine` — holds `short`, `context`, and a set of registered `flows`
    * `BaseFlow` — base class implementing `handle(...)` and lifecycle hooks
    * `FlowController` — per-run runtime state: `stepNum`, `steps`, `isInProgress`, `doStop`, `interval`
    * `FlowStep` — step wrapper that ensures async behavior
    * `types.ts` — the **public contract** (types and interfaces)
* Project structure (typical):
    * `src/` — engine runtime, types, errors
    * `test/` — unit tests (or equivalent)
    * `dist/` — compiled output and type definitions (do not edit manually)

> Agents: before making changes, read `README.md`, `package.json`, and especially `src/types.ts` and exported symbols. If `dist/*.d.ts` exists, treat it as a reflection of the public API.

---

## 1) Agent protocol

1. **Understand the task**
    * Restate the intent and constraints
    * Create a concise plan (3–7 steps) and follow it

2. **Minimal diff**
    * Modify only the files/sections required  
    ❌ No mass refactoring, renaming, reformatting, or moving code across unrelated areas

3. **Preserve public API stability**
    * `types.ts` is the contract
    * Do not change exported signatures or behavior unless a breaking change is explicitly required
    * If a breaking change is unavoidable: update tests + docs + examples + add a migration note

4. **Preserve engine semantics (invariants)**
    * Do not change:  
    \- `next(stepShort)` = goto by `short`  
    \- `undefined/null` from a handler = linear next step (by index)  
    \- step error = flow reject + `onError`  
    \- `abstract=true` flows cannot run  

5. **Tests and build**
    * Add/adjust tests for all behavior changes (especially transitions, async, stop, errors)
    * Run the equivalent of `npm test` / `npm run build` (or the repo’s standard checks)

6. **Documentation**
    * If behavior changes, update README/examples immediately
    * Examples are part of the public contract

---

## 2) Architecture and code placement

### 2.1. Engine entry points

* `createEngine(...)` constructs a `FlowEngine` with:
    * `short` — engine identifier
    * `context` — default context values
    * `flows` — registered flows

Responsibilities:

* Provide a predictable API to start flows (`engine.handle(...)`)
* Manage default context and allow updates via `setContext(...)`
* Keep the runtime core framework-agnostic.

### 2.2. BaseFlow and runnable flows

`BaseFlow` responsibilities:

* Holds flow metadata: `short`, `abstract`, and a steps list
* Orchestrates per-run execution via a `FlowController`
* Owns lifecycle hooks:
    * `onCreate`
    * `onBeforeFinish`
    * `onError`

Requirements:

* `abstract=true` flows must remain protected (throw `BaseError` if started)
* `onCreate()` is invoked on each run; step registration must be safe and predictable.

### 2.3. FlowController (runtime state)

`FlowController` owns the execution loop and runtime fields:

* `stepNum` — current index
* `steps` — current step list
* `isInProgress` — run guard
* `doStop` — stop flag
* `interval` — timer handle (if used)

Requirements:

* Avoid hidden global state
* Ensure stop/cancel behavior is deterministic and does not leak timers.

### 2.4. FlowStep and async normalization

`FlowStep` uses `ensureAsync` to normalize step handlers:

* Step handlers may be sync or async
* Engine behavior must remain consistent regardless of handler type.

### 2.5. Types and errors are part of the API

* `src/types.ts` defines step/flow signatures
* `BaseError` and related errors are part of the safety and DX layer.

---

## 3) Execution semantics (source of truth)

### 3.1. Starting a flow

`engine.handle(...)` supports:

1. `engine.handle(flowObj)` — starts the given flow instance.
2. `engine.handle('flowShort')` — finds a flow by `short` and starts it.
3. `engine.handle()` — starts the first flow in the registered list.

> Note: the engine does **not** implement automatic “best flow selection.” The caller chooses.

### 3.2. Step execution order

* The engine executes steps sequentially by `stepNum`
* If the current step is missing, the flow resolves as success (`FLOW_SUCCESS`).

### 3.3. Transitions

Step handler signature (contract):

```ts
handle(from, to, next)
```

* `next('someStep')` performs a goto transition to the step with `short === 'someStep'`
* If a handler returns `undefined` or `null`, the engine advances to the next step by index.

### 3.4. Errors

* Any error thrown by a step fails the flow (reject)
* The flow’s `onError` hook is invoked.

### 3.5. Stop

* `controller.stop(value)` stops the run
* Stopping must not leave timers/intervals running.

### 3.6. Re-runs and onCreate

* `onCreate()` is invoked on every `flow.handle()` call
* Step registration must not accumulate duplicates across runs unless explicitly intended
* If step lists are rebuilt per run, ensure they are cleared/reset deterministically.

---

## 4) Context

* Engine stores default `context` and updates it via `setContext(...)`
* When starting a flow, the engine may merge context:

```ts
flow.handle({ ...engine.context, ...contextOverrides })
```

Important constraints (do not assume features that do not exist):

* Steps do not receive `context` as a parameter by default
* No built-in subscriptions, computed flags, consistency guarantees, or cancellation-on-context-change.

---

## 5) Integration guidance (non-core)

* The engine is platform-neutral
* Side-effects (navigation, API calls, UI updates) are allowed inside steps, but are the application’s responsibility
* Prefer thin adapters in the app layer rather than adding framework dependencies to the engine.

Recommended pattern:

* Steps emit “intent” to the host app (or call injected services) instead of hard-coding router/store imports in the engine.

---

## 6) Code style

The codebase should remain **straightforward, explicit, and predictable**.

### 6.1. General principles

* One function — one responsibility
* Prefer early returns instead of deep nesting
* Keep runtime logic small and testable
* Avoid cleverness in core execution semantics

### 6.2. Naming rules

* `short` is an identifier — treat it as a stable public key
* Prefer clear nouns for data (`steps`, `context`, `controller`) and verbs for actions (`handle`, `setContext`, `getStep`)
* No humorous names in runtime library code.

### 6.3. Comments

Explain **why**, not syntax.

Use consistent markers:

* `// Constants`
* `// Variables`
* `// Doing some checks`
* `// Getting the data`
* `// Defining the functions`
* `// TODO:`
* `// FIXME:`

---

## 7) Prohibitions & caution

### 7.1. Hard prohibitions

* ❌ Do not change step transition semantics (`next`, `undefined/null` behavior) without updating tests + docs + examples
* ❌ Do not silently introduce automatic flow selection, `interferes`, `priority`, or scoring into core behavior
* ❌ Do not add framework-specific dependencies (Vue/React/router/store) into the engine core
* ❌ Do not edit `dist/` outputs manually
* ❌ Do not remove or weaken `BaseError` safety checks (including `abstract=true` protection)

### 7.2. Caution zones

* ⚠️ `onCreate()` runs on every start — ensure steps do not accumulate across runs
* ⚠️ Parallel `engine.handle()` calls can create concurrent flows; coordinate side-effects in the application layer
* ⚠️ Timers/intervals must be cleared on stop/error to avoid leaks
* ⚠️ If adding any observability (events/logger), keep it optional and backward compatible

---

## 8) Pre-commit checklist

* [ ] Plan completed and matches the requested change
* [ ] Public API (`types.ts` and exports) has not been broken unintentionally
* [ ] Tests cover: transitions (`next`), async handlers, error paths, stop behavior
* [ ] No unrelated refactoring/formatting changes
* [ ] Docs/examples updated if behavior changed
* [ ] Build/tests pass locally
