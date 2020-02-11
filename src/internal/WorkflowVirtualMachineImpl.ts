import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError, ArgumentError } from "@zxteam/errors";

import * as _ from "lodash";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";
import { Activity, BreakpointActivity, NativeActivity, ConsoleLogActivity, ContextActivity } from "../activities";
import * as meta from "./meta";
import { BusinessActivity } from "../activities/BusinessActivity";
import { WorkflowVirtualMachineStack } from "./WorkflowVirtualMachineStack";

export class WorkflowVirtualMachineImpl implements WorkflowVirtualMachine {

	private readonly _stack: WorkflowVirtualMachineStack;
	private readonly _variables: WorkflowVirtualMachineStack.VariablesAccessor;
	private readonly _runtimeSymbols: Map<symbol, any>;

	// External components expect to have an ability to preserve
	// finished machine. But, finished machine have zero frames on stack,
	// as result, root activity can't be resolved. So, necessary to preserve
	// ref to root activity for future use as soon as it will be pushed to
	// stack.
	private _root?: Activity;

	private _terminated: boolean;
	private _paused: boolean;

	public get currentActivity(): Activity {

		return this._stack.top.activity;
	}

	public get currentActivityCallCount(): number {

		return this._stack.top.calls;
	}

	public get rootActivity(): Activity {

		return this._root!;
	}

	public get stack(): ReadonlyArray<Activity> {

		return this._stack.stack.map(t => t.activity);
	}

	public get runtimeSymbols(): WorkflowVirtualMachine.RuntimeSymbols {

		return this._runtimeSymbols;
	}

	public get variables(): WorkflowVirtualMachine.Variables {

		return this._variables;
	}

	public get breakpoints(): ReadonlyMap<BreakpointActivity["name"], BreakpointActivity> {

		return (this._stack.root.activity as NativeActivity).breakpoints;
	}

	public get isPaused(): boolean { return this._paused; }
	public get isTerminated(): boolean { return this._terminated; }

	public getActivityOid(activity: Activity) {

		let ids = [];
		let found = false;

		for (let frame of this._stack.frames) {
			ids.push(frame.index);
			found = frame.activity === activity;
			if (found) {
				break;
			}
		}

		if (!found) {
			throw new ArgumentError("activity", "Activity was not found in the stack.");
		}

		return ids.join(".");
	}

	public async stackPush(index: number): Promise<void> {

		this._stack.push(index);
	}

	public stackPop(): void {

		this._stack.pop();
	}

	public delay() {
		throw new Error("Not implemented.");
	}

	public tickCountdown(): number {
		throw new Error("Not implemented.");
	}

	// public getByName(name: string): Activity {
	// 	throw new Error("Not implemented");
	// }

	public async tick(cancellationToken: CancellationToken): Promise<boolean> {

		if (this._stack.size === 0) {
			this._terminated = true;
			this._paused = false;
			return true; // Workflow is finished
		}

		const frame = this._stack.top;
		if (frame !== undefined) {

			const { activity } = frame;
			++frame.calls;

			if (activity instanceof BreakpointActivity) {

				//TODO: Redesign
				if (this._paused) {
					if (activity.isResumeAllowed(this)) {
						this._paused = false;
					} else {
						//Should we call resolveAwaiters here again?
						return true;
					}
				}

				await activity.execute(cancellationToken, this);

				if (activity.isResumeAllowed(this)) {
					this._paused = false;
				} else {
					this._paused = true;
					activity.resolveAwaiters(this);
					return true; // Workflow is idle (due paused)
				}

			} else if (activity instanceof BusinessActivity) {
				await activity.execute(cancellationToken, this);
				this.stackPop(); // BusinessActivity does not know anything of the stack
			} else if (activity instanceof NativeActivity) {
				await activity.execute(cancellationToken, this);
			} else {
				throw new InvalidOperationError(`Not supported Activity type: ${activity.constructor.name}`);
			}
		}

		return false;
	}

	public preserve(): WorkflowVirtualMachine.WorkflowVirtualMachineState {
		//@ts-ignore
		let aid = meta.getActivityUUID(this.rootActivity.constructor);
		return {
			activity: aid,
			nextTick: undefined,
			stack: this._stack.preserve()
		};
	}

	public static create(root: NativeActivity) {
		const result = new WorkflowVirtualMachineImpl();
		result._stack.pushRoot(root);
		result._root = result._stack.root.activity;
		return result;
	}

	public static restore(state: WorkflowVirtualMachine.WorkflowVirtualMachineState) {
		const constructor = meta.getActivityConstructor(state.activity);
		//@ts-ignore
		const root = new constructor({});
		const result = new WorkflowVirtualMachineImpl();
		result._stack.reconstruct(root, state.stack);
		result._root = result._stack.root.activity;
		return result;
	}

	private constructor() {
		this._stack = new WorkflowVirtualMachineStack();
		this._variables = new WorkflowVirtualMachineStack.VariablesAccessor(this._stack);
		this._runtimeSymbols = new Map();
		this._terminated = false;
		this._paused = false;
	}
}
