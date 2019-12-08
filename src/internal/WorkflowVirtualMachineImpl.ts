import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError } from "@zxteam/errors";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";
import { Activity } from "../activities";
import * as meta from "../internal/meta";

export class WorkflowVirtualMachineImpl implements WorkflowVirtualMachine {
	private readonly _callstack: Array<StackFrame>;
	private _tickFrame: StackFrame | null;
	private _terminated: boolean;

	public constructor(entryPoint: Activity) {
		this._callstack = [];
		this._terminated = false;
		this._tickFrame = null;

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
	public get ancestorChain(): ReadonlyArray<Activity> {
		return this._callstack.map(frame => frame.activity).reverse();
	}
	public get isTerminated(): boolean { return this._terminated; }

	public hasVariable(key: string | Symbol): boolean {
		const headIndex = this._callstack.length - 1;
		for (let callstackIndex = headIndex; callstackIndex >= 0; --callstackIndex) {
			const frame: StackFrame = this._callstack[callstackIndex];
			const variable = frame.variables.get(key);
			if (
				variable !== undefined &&
				(
					callstackIndex === headIndex
					|| variable.scope === WorkflowVirtualMachine.Scope.PUBLIC
					|| variable.scope === WorkflowVirtualMachine.Scope.SYMBOL
				)
			) {
				return true;
			}
		}

		return false;
	}
	public variable(key: string | Symbol): WorkflowVirtualMachine.Variable;
	public variable(key: string, scope: WorkflowVirtualMachine.Scope, value: any): WorkflowVirtualMachine.Variable;
	public variable(key: string | Symbol, scope?: WorkflowVirtualMachine.Scope, value?: any): WorkflowVirtualMachine.Variable {
		if (scope !== undefined) {
			if (this.tickFrame.variables.has(key)) {
				throw new InvalidOperationError(`Wrong operation. Variable '${key}' already registered.`);
			}
			const variable: WorkflowVirtualMachine.Variable = { scope, value };
			this.tickFrame.variables.set(key, variable);
			return variable;
		}

		const headIndex = this._callstack.length - 1;
		for (let callstackIndex = headIndex; callstackIndex >= 0; --callstackIndex) {
			const frame: StackFrame = this._callstack[callstackIndex];
			const variable = frame.variables.get(key);
			if (
				variable !== undefined &&
				(
					callstackIndex === headIndex
					|| variable.scope === WorkflowVirtualMachine.Scope.PUBLIC
					|| variable.scope === WorkflowVirtualMachine.Scope.SYMBOL
				)
			) {
				return variable;
			}
		}

		throw new InvalidOperationError(`Unregistered variable: ${key}`);
	}

	public async callstackPush(cancellationToken: CancellationToken, activity: Activity): Promise<void> {
		const registers: Map<string, any> = new Map();
		this._callstack.push({ activity, variables: registers, callCouner: 0 });
		await this.tick(cancellationToken);
	}

	public callstackPop(): void {
		const frame = this._callstack.pop();
		if (frame === undefined) {
			throw new InvalidOperationError("Stack underflow");
		}
	}

	public async tick(cancellationToken: CancellationToken): Promise<void> {
		if (this._callstack.length === 0) {
			this._terminated = true;
			return; // Workflow is finished
		}

		const frame: StackFrame | undefined = this._callstack[this._callstack.length - 1];
		if (frame !== undefined) {
			this._tickFrame = frame;
			try {
				const { activity } = frame;
				++frame.callCouner;
				await activity.execute(cancellationToken, this);
			} finally {
				this._tickFrame = null;
			}
		}
	}

	private get tickFrame(): StackFrame {
		if (this._tickFrame !== null) {
			return this._tickFrame;
		}
		throw new InvalidOperationError("Wrong operation at current state. Did you start WVM?");
	}
}


interface StackFrame {
	readonly activity: Activity;
	readonly variables: Map<string | Symbol, WorkflowVirtualMachine.Variable>;
	callCouner: number;
}
