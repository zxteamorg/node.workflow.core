import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError, CancelledError } from "@zxteam/errors";
import { sleep } from "@zxteam/cancellation";

import { Activity } from "./Activity";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("7a6edb9e-0e66-4680-b53d-e36d03e52541")
export class BreakpointActivity extends Activity {
	// public static of(wvm: WorkflowVirtualMachine, breakpointName: string): BreakpointActivity {
	// 	function recursiveFinder(activities: ReadonlyArray<Activity>): BreakpointActivity | null {
	// 		for (const activity of activities) {
	// 			if (activity instanceof BreakpointActivity) {
	// 				if (activity.name === breakpointName) {
	// 					return activity;
	// 				}
	// 			}
	// 			if (activity.children.length > 0) {
	// 				const result = recursiveFinder(activity.children);
	// 				if (result !== null) { return result; }
	// 			}
	// 		}
	// 		return null;
	// 	}

	// 	const breakpointActivity = recursiveFinder(wvm.rootActivity.children);
	// 	if (breakpointActivity === null) {
	// 		throw new InvalidOperationError(`Wrong breakpoint name '${breakpointName}'. Found nothing.`);
	// 	}

	// 	return breakpointActivity;
	// }

	private readonly _breakpointAwaiterSymbol: symbol;
	private readonly _breakpointResumeSymbol: symbol;

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

	/**
	 * Return `false` if breakpoint in active state (in other words, the breakpoint blocks execution)
	 * or `true` if resume execution allowed
	 */
	public isResumeAllowed(ctx: WorkflowVirtualMachine.NativeExecutionContext): boolean {
		const { runtimeSymbols } = ctx;

		if (runtimeSymbols.has(this._breakpointResumeSymbol)) {
			if (runtimeSymbols.get(this._breakpointResumeSymbol) === true) {
				return true;
			}
		}

		return false;
	}

	public execute(ctx: WorkflowVirtualMachine.NativeExecutionContext): void {
		const { runtimeSymbols } = ctx;

		if (runtimeSymbols.has(this._breakpointAwaiterSymbol)) {
			// Notify awaiters
			const awaiter: AwaiterData = runtimeSymbols.get(this._breakpointAwaiterSymbol);
			awaiter.resolve();
		}

		if (this.isResumeAllowed(ctx)) {
			ctx.stackPop(); // remove itself
		}
	}

	/**
	 * Used to wakeup all awaiters when workflow crashed
	 */
	public notifyAwaitersForCrash(error: Error, ctx: WorkflowVirtualMachine.NativeExecutionContext): void {
		const { runtimeSymbols } = ctx;
		const awaiter: AwaiterData | undefined = runtimeSymbols.get(this._breakpointAwaiterSymbol);
		if (awaiter !== undefined) {
			awaiter.reject(error);
		}
	}

	public wait(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<BreakpointActivity> {
		const { runtimeSymbols } = ctx;
		let awaiter: AwaiterData;
		if (runtimeSymbols.has(this._breakpointAwaiterSymbol)) {
			awaiter = runtimeSymbols.get(this._breakpointAwaiterSymbol);
		} else {
			awaiter = { cancellationTokenReleasers: [] } as any;

			(awaiter as any).promise = new Promise<BreakpointActivity>((resolve, reject) => {
				const awaiterResolve = () => {
					for (const releaser of awaiter.cancellationTokenReleasers) { releaser(); }
					resolve(this);
				};
				const awaiterReject = (reason: any) => {
					for (const releaser of awaiter.cancellationTokenReleasers) { releaser(); }
					reject(reason);
				};
				(awaiter as any).resolve = awaiterResolve;
				(awaiter as any).reject = awaiterReject;
			});

			runtimeSymbols.set(this._breakpointAwaiterSymbol, awaiter);
		}

		function cancel() {
			try {
				cancellationToken.throwIfCancellationRequested();
				awaiter.reject(new CancelledError()); // Just a guard
			} catch (e) {
				awaiter.reject(e);
			}
		}

		cancellationToken.addCancelListener(cancel);
		awaiter.cancellationTokenReleasers.push(function () {
			cancellationToken.removeCancelListener(cancel);
		});

		return awaiter.promise;
	}

	public resume(wvm: WorkflowVirtualMachine): void {
		const { runtimeSymbols } = wvm;

		runtimeSymbols.set(this._breakpointResumeSymbol, true);
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
	readonly resolve: () => void;
	readonly reject: (reason: Error) => void;
	readonly cancellationTokenReleasers: Array<() => void>;
}
