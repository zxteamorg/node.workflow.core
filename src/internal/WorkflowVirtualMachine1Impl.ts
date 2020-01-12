import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError, ArgumentError } from "@zxteam/errors";

import * as _ from "lodash";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";
import { Activity, BreakpointActivity, NativeActivity } from "../activities";
import { BusinessActivity } from "../activities/BusinessActivity";

export class WorkflowVirtualMachine1Impl implements WorkflowVirtualMachine {
	private readonly _runtimeSymbols: Map<symbol, any>;
	private readonly _callstack: Array<StackFrame>;
	private _terminated: boolean;
	private _paused: boolean;
	private _tickGuard: boolean;

	public constructor(entryPoint: Activity) {
		this._runtimeSymbols = new Map();
		this._callstack = [];
		this._terminated = false;
		this._paused = false;
		this._tickGuard = false;

		const registers: Map<string, any> = new Map();
		this._callstack.push({ activity: entryPoint, variables: registers, callCouner: 0 });
	}

	public get currentActivity(): Activity {
		return this.tickFrame.activity;
	}

	public get currentActivityCallCount(): number {
		return this.tickFrame.callCouner;
	}

	public get rootActivity(): Activity {
		if (this._callstack.length === 0) {
			throw new InvalidOperationError("Wrong operation at current state. Did you start WVM?");
		}
		return this._callstack[0].activity;
	}

	public get stack(): ReadonlyArray<Activity> {
		return this._callstack.map(frame => frame.activity).reverse();
	}

	public get runtimeSymbols(): WorkflowVirtualMachine.RuntimeSymbols {
		return this._runtimeSymbols;
	}

	public get variables(): WorkflowVirtualMachine.Variables {
		const define = (name: string, value: any, scope?: WorkflowVirtualMachine.Scope) => {
			if (this.tickFrame.variables.has(name)) {
				throw new InvalidOperationError(`Variable '${name}' already defined.`);
			}
			this.tickFrame.variables.set(name, {
				scope: scope !== undefined ? scope : WorkflowVirtualMachine.Scope.LOCAL,
				value
			});
		};
		const getTuple = (name: string) => {
			const headIndex = this._callstack.length - 1;
			for (let callstackIndex = headIndex; callstackIndex >= 0; --callstackIndex) {
				const frame: StackFrame = this._callstack[callstackIndex];
				const valueTuple = frame.variables.get(name);
				if (valueTuple !== undefined && (callstackIndex === headIndex || valueTuple.scope === WorkflowVirtualMachine.Scope.INHERIT)) {
					return valueTuple;
				}
			}
			throw new InvalidOperationError(`Variable '${name}' is not defined.`);
		};
		const getBoolean = (name: string) => {
			const valueTuple = getTuple(name);
			if (_.isBoolean(valueTuple.value)) { return valueTuple.value; }
			throw new InvalidOperationError(`Variable '${name}' is not boolean.`);
		};
		const getInteger = (name: string) => {
			const valueTuple = getTuple(name);
			if (_.isSafeInteger(valueTuple.value)) { return valueTuple.value as number; }
			throw new InvalidOperationError(`Variable '${name}' is not string.`);
		};
		const getNumber = (name: string) => {
			const valueTuple = getTuple(name);
			if (_.isNumber(valueTuple.value)) { return valueTuple.value; }
			throw new InvalidOperationError(`Variable '${name}' is not string.`);
		};
		const getObject = (name: string) => {
			const valueTuple = getTuple(name);
			if (_.isObject(valueTuple.value)) { return valueTuple.value; }
			throw new InvalidOperationError(`Variable '${name}' is not string.`);
		};
		const getString = (name: string) => {
			const valueTuple = getTuple(name);
			if (_.isString(valueTuple.value)) { return valueTuple.value; }
			throw new InvalidOperationError(`Variable '${name}' is not string.`);
		};
		const has = (name: string) => {
			const headIndex = this._callstack.length - 1;
			for (let callstackIndex = headIndex; callstackIndex >= 0; --callstackIndex) {
				const frame: StackFrame = this._callstack[callstackIndex];
				const valueTuple = frame.variables.get(name);
				if (valueTuple !== undefined && (callstackIndex === headIndex || valueTuple.scope === WorkflowVirtualMachine.Scope.INHERIT)) {
					return true;
				}
			}
			return false;
		};
		const set = (name: string, value: any) => {
			const valueTuple = getTuple(name);
			valueTuple.value = value;
		};

		return {
			define, getBoolean, getInteger, getNumber, getObject, getString, has, set
		};
	}

	public get breakpoints(): ReadonlyMap<BreakpointActivity["name"], BreakpointActivity> {
		const rootActivity: Activity = this.rootActivity;
		if (rootActivity instanceof NativeActivity) {
			return rootActivity.breakpoints;
		} else {
			throw new InvalidOperationError("Root Activity does not provide breakpoints.");
		}
	}

	public get isPaused(): boolean { return this._paused; }
	public get isTerminated(): boolean { return this._terminated; }

	public getActivityOid(activity: Activity): string {
		const stackCopy = this.stack.slice();
		let oidParts: Array<number> = [];

		// Remove all head activities
		while (stackCopy.length > 0 && activity !== stackCopy[0]) {
			stackCopy.shift();
		}

		if (stackCopy.length < 1) {
			throw new ArgumentError("activity", "Activity was not found in the stack.");
		}

		stackCopy.shift(); // Remove passed activity

		while (stackCopy.length > 0) {
			const parentActivity: Activity = stackCopy.shift()!;
			if (parentActivity instanceof NativeActivity) {
				const childrenCount = parentActivity.children.length;
				let oidPart: number | null = null;
				for (let childIndex = 0; childIndex < childrenCount; ++childIndex) {
					if (parentActivity.children[childIndex] === activity) {
						oidPart = childIndex;
						break;
					}
				}
				if (oidPart === null) {
					throw new InvalidOperationError("Broken workflow detected");
				}
				oidParts.unshift(oidPart);
			}

			activity = parentActivity;
		}

		return oidParts.join(".");
	}

	public async stackPush(cancellationToken: CancellationToken, activity: Activity): Promise<void> {
		const registers: Map<string, any> = new Map();
		this._callstack.push({ activity, variables: registers, callCouner: 0 });
	}

	public stackPop(): void {
		const frame = this._callstack.pop();
		if (frame === undefined) {
			throw new InvalidOperationError("Stack underflow");
		}
	}

	public async tick(cancellationToken: CancellationToken): Promise<boolean> {
		if (this._tickGuard === true) {
			throw new InvalidOperationError("Wrong operation at current state. The method 'tick' cannot be called in parallel. Did you wait for resolve a Promise of previous call?");
		}
		try {
			this._tickGuard = true;

			if (this._callstack.length === 0) {
				this._terminated = true;
				this._paused = false;
				return true; // Workflow is finished
			}


			const frame: StackFrame | undefined = this._callstack[this._callstack.length - 1];
			if (frame !== undefined) {
				const { activity } = frame;
				++frame.callCouner;
				if (activity instanceof BusinessActivity) {
					await activity.execute(cancellationToken, this);
					this.stackPop(); // BusinessActivity does not know anything of the stack
				} else if (activity instanceof BreakpointActivity) {
					this._paused = true;
					await activity.execute(cancellationToken, this);
					const isResumeAllowed = activity.isResumeAllowed(this);
					if (isResumeAllowed === true) {
						this._paused = false;
					} else {
						return true; // Workflow is idle (due paused)
					}
				} else if (activity instanceof NativeActivity) {
					await activity.execute(cancellationToken, this);
				} else {
					throw new InvalidOperationError(`Not supported Activity type: ${activity.constructor.name}`);
				}
			}

			return false;
		} finally {
			this._tickGuard = false;
		}
	}

	private get tickFrame(): StackFrame {
		if (this._callstack.length > 0) {
			return this._callstack[this._callstack.length - 1];
		}
		throw new InvalidOperationError("Wrong operation at current state. Did you start WVM?");
	}
}


interface StackFrame {
	readonly activity: Activity;
	readonly variables: Map<string, { readonly scope: WorkflowVirtualMachine.Scope, value: any }>;
	callCouner: number;
}
