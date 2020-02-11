import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError, ArgumentError } from "@zxteam/errors";

import * as _ from "lodash";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";
import { Activity, BreakpointActivity, NativeActivity, ConsoleLogActivity, ContextActivity } from "../activities";
import * as meta from "./meta";
import { BusinessActivity } from "../activities/BusinessActivity";
import { WorkflowVirtualMachineStack } from "./WorkflowVirtualMachineStack";
import { throws, strict } from "assert";
import { activityRecursiveWalker } from "../utils/activityRecursiveWalker";

//TODO: Refactor context
export class WorkflowVirtualMachineCountdown implements WorkflowVirtualMachine {

	private readonly _stack: WorkflowVirtualMachineStack;
	private readonly _variables: WorkflowVirtualMachineStack.VariablesAccessor;

	// External components expect to have an ability to preserve
	// finished machine. But, finished machine have zero frames on stack,
	// as result, root activity can't be resolved. So, necessary to preserve
	// ref to root activity for future use as soon as it will be pushed to
	// stack.
	private _root?: Activity;

	private _terminated: boolean;
	private _paused: boolean;

	private _nextDelay: number | undefined;
	private _nextTick: number | undefined;
	private _named: Map<string, Activity>;

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

		throw new Error("Deprecated");
	}

	public get variables(): WorkflowVirtualMachine.Variables {

		return this._variables;
	}

	public get breakpoints(): ReadonlyMap<BreakpointActivity["name"], BreakpointActivity> {

		throw new Error("Deprecated");
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

	public delay(period: number = -1): void {

		if (period === -1) {
			this._nextDelay = -1;
			return;
		}

		const ms = Math.round(period * 1000);

		if (period < 1) {
			throw new ArgumentError("Period should be at least 1 ms.");
		}

		this._nextDelay = ms;
	}

	public tickCountdown() {

		if (!this._nextTick) {
			return 0;
		}

		const now = Date.now();
		const countdown = this._nextTick - now;

		return countdown > 0 ? countdown : 0;
	}

	// public getByName(name: string): Activity {

	// 	const activity = this._named.get(name);

	// 	if (activity) {
	// 		return activity;
	// 	}

	// 	throw new InvalidOperationError(`Unable to find activity by name '${name}'.`);
	// }

	public async tick(ct: CancellationToken): Promise<boolean> {

		const countdown = this.tickCountdown();
		if (countdown > 0) {
			return true;
		} else {
			this._nextTick = undefined;
		}

		this._paused = false;
		const frame = this._stack.top;

		++frame.calls;
		const { activity } = frame;

		if (activity instanceof BusinessActivity) {

			await activity.execute(ct, this);
			this.stackPop(); // BusinessActivity does not know anything of the stack
		} else if (activity instanceof NativeActivity) {

			this._nextDelay = undefined;
			await activity.execute(ct, this);

			if (this._nextDelay) {

				this._paused = true;

				if (this._nextDelay !== -1) {
					this._nextTick = Date.now() + this._nextDelay;
				} else {
					// TODO: Such kind of delay should be incremented with
					// every delayed tick;
					this._nextTick = Date.now() + 1000;
				}

				this._nextDelay = undefined;
			}
		}

		if (this._stack.size === 0) {

			this._terminated = true;
			this._paused = false;
		}

		return this._paused || this._terminated;
	}

	public preserve(): WorkflowVirtualMachine.WorkflowVirtualMachineState {
		//@ts-ignore
		let aid = meta.getActivityUUID(this.rootActivity.constructor);
		return {
			activity: aid,
			nextTick: this._nextTick ? (new Date(this._nextTick)).toISOString() : undefined,
			stack: this._stack.preserve()
		};
	}

	public static create(root: NativeActivity) {
		const result = new WorkflowVirtualMachineCountdown();
		result._stack.pushRoot(root);
		result._root = result._stack.root.activity;
		//result._named = result.listNamedActivities(result._root);
		return result;
	}

	public static restore(state: WorkflowVirtualMachine.WorkflowVirtualMachineState) {

		const getNextTick = (iso: string | undefined) => {

			let unix: number | undefined = undefined;

			if (iso) {
				try {
					const date = new Date(iso);
					unix = date.getTime();
				} catch (e) {
					//TODO: Should be logged (and will be after constructor refactoring)
				}
			}

			return unix;
		};

		//TODO: Support case of restoring of Complated and Aborted Apps
		const constructor = meta.getActivityConstructor(state.activity);
		//@ts-ignore
		const root = new constructor({});
		const result = new WorkflowVirtualMachineCountdown();
		result._stack.reconstruct(root, state.stack);
		result._root = result._stack.root.activity;
		result._nextTick = getNextTick(state.nextTick);
		//result._named = result.listNamedActivities(result._root);
		return result;
	}

	private constructor() {
		// TODO: Refactor to construct over public constructor for new
		// and restore routines
		this._stack = new WorkflowVirtualMachineStack();
		this._variables = new WorkflowVirtualMachineStack.VariablesAccessor(this._stack);
		this._named = new Map<string, Activity>();

		this._terminated = false;
		this._paused = false;
	}

	// private listNamedActivities(root: Activity): Map<string, Activity> {

	// 	const result = new Map<string, Activity>();

	// 	activityRecursiveWalker(root, activity => {

	// 		const name = (activity as any).name;
	// 		if (!_.isUndefined(name)) {

	// 			if (result.has(name)) {
	// 				throw new InvalidOperationError(
	// 					`Duplicated activity name '${name}' in tree of ${root.constructor.name}.`);
	// 			}

	// 			result.set(name, activity);
	// 		}
	// 		return false;
	// 	});

	// 	return result;
	// }
}
