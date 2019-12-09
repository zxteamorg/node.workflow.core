import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError, CancelledError } from "@zxteam/errors";
import { sleep } from "@zxteam/cancellation";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("7a6edb9e-0e66-4680-b53d-e36d03e52541")
export class BreakpointActivity extends Activity {
	private static readonly _awaiters: Map<WorkflowVirtualMachine, Map<Symbol, AwaiterData>> = new Map();

	public static of(wvm: WorkflowVirtualMachine, breakpointName: string): BreakpointActivity {
		function recursiveFinder(activities: ReadonlyArray<Activity>): BreakpointActivity | null {
			for (const activity of activities) {
				if (activity instanceof BreakpointActivity) {
					if (activity.name === breakpointName) {
						return activity;
					}
				}
				if (activity.children.length > 0) {
					const result = recursiveFinder(activity.children);
					if (result !== null) { return result; }
				}
			}
			return null;
		}

		const breakpointActivity = recursiveFinder(wvm.rootActivity.children);
		if (breakpointActivity === null) {
			throw new InvalidOperationError(`Wrong breakpoint name '${breakpointName}'. Found nothing.`);
		}

		return breakpointActivity;
	}

	private readonly _breakpointAwaiterSymbol: Symbol;
	private readonly _breakpointResumeSymbol: Symbol;

	public constructor(opts: BreakpointActivity.Opts) {
		super(opts);
		this._breakpointAwaiterSymbol = Symbol.for("BreakpointActivity.Awaiter:" + this.name);
		this._breakpointResumeSymbol = Symbol.for("BreakpointActivity.Resume:" + this.name);
	}

	public get name(): string {
		const opts = this.opts as BreakpointActivity.Opts;
		return opts.name;
	}
	public get description(): string {
		const opts = this.opts as BreakpointActivity.Opts;
		return opts.description;
	}

	public wait(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<BreakpointActivity> {
		let awaiterInstancesMap = BreakpointActivity._awaiters.get(wvm);
		if (awaiterInstancesMap === undefined) {
			awaiterInstancesMap = new Map();
			BreakpointActivity._awaiters.set(wvm, awaiterInstancesMap);
		}

		const awaiter = awaiterInstancesMap.get(this._breakpointAwaiterSymbol);
		if (awaiter !== undefined) {
			const awaiterData = awaiter;
			function additionalAwaiterCancel() {
				cancellationToken.removeCancelListener(additionalAwaiterCancel);
				awaiterData.awaiterCancel();
			}
			cancellationToken.addCancelListener(additionalAwaiterCancel);
			return awaiterData.promise;
		} else {
			const awaiterData: any = {};
			awaiterData.promise = new Promise<BreakpointActivity>((resolve, reject) => {
				const awaiterResolve = () => {
					cancellationToken.removeCancelListener(awaiterCancel);
					resolve(this);
				};
				function awaiterCancel() {
					cancellationToken.removeCancelListener(awaiterCancel);
					try {
						cancellationToken.throwIfCancellationRequested();
					} catch (e) {
						return reject(e);
					}
					return reject(new CancelledError()); // Just a guard
				}
				cancellationToken.addCancelListener(awaiterCancel);
				awaiterData.awaiterResolve = awaiterResolve;
				awaiterData.awaiterCancel = awaiterCancel;
			});
			const instances = awaiterInstancesMap;
			instances.set(this._breakpointAwaiterSymbol, awaiterData);
			awaiterData.promise.finally(() => {
				if (instances.has(this._breakpointAwaiterSymbol)) {
					instances.delete(this._breakpointAwaiterSymbol);
					if (instances.size === 0) {
						BreakpointActivity._awaiters.delete(wvm);
					}
				}
			});
			return awaiterData.promise;
		}
	}

	public resume(wvm: WorkflowVirtualMachine): void {
		if (wvm.hasVariable(this._breakpointResumeSymbol)) {
			wvm.variable(this._breakpointResumeSymbol).value = true;
		}
	}


	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		let breakFlagVariable: WorkflowVirtualMachine.Variable;
		if (wvm.currentActivityCallCount === 1) {
			// Initialize breakpoint variable
			breakFlagVariable = wvm.variable(this._breakpointResumeSymbol, WorkflowVirtualMachine.Scope.SYMBOL, false);

			// Notify awaiters
			const awaiterInstancesMap = BreakpointActivity._awaiters.get(wvm);
			if (awaiterInstancesMap !== undefined) {
				const awaiter = awaiterInstancesMap.get(this._breakpointAwaiterSymbol);
				if (awaiter !== undefined) {
					awaiter.awaiterResolve();
				}
			}
		} else {
			breakFlagVariable = wvm.variable(this._breakpointResumeSymbol);
		}

		if (breakFlagVariable.value === false) {
			await sleep(cancellationToken, 500);
		} else {
			wvm.callstackPop(); // remove itself
		}
	}
}


export namespace BreakpointActivity {
	export interface Opts {
		readonly name: string;
		readonly description: string;
	}
}


interface AwaiterData {
	readonly promise: Promise<BreakpointActivity>;
	readonly awaiterResolve: () => void;
	readonly awaiterCancel: () => void;
}
