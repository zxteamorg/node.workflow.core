import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError } from "@zxteam/errors";
import { sleep } from "@zxteam/cancellation";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("7a6edb9e-0e66-4680-b53d-e36d03e52541")
export class BreakpointActivity extends Activity {
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

	private readonly _breakpointResumeSymbol: Symbol;

	public constructor(opts: BreakpointActivity.Opts) {
		super(opts);
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

	public resume(wvm: WorkflowVirtualMachine): void {
		if (wvm.hasVariable(this._breakpointResumeSymbol)) {
			wvm.variable(this._breakpointResumeSymbol).value = true;
		}
	}


	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		let breakFlagVariable: WorkflowVirtualMachine.Variable;
		if (wvm.currentActivityCallCount === 1) {
			breakFlagVariable = wvm.variable(this._breakpointResumeSymbol, WorkflowVirtualMachine.Scope.SYMBOL, false);
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
