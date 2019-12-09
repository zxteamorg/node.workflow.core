import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./activities";
import { WorkflowVirtualMachine } from "./WorkflowVirtualMachine";
import { WorkflowVirtualMachineImpl } from "./internal/WorkflowVirtualMachineImpl";
import { BreakpointActivity } from "./activities/BreakpointActivity";

export class WorkflowInvoker {
	private readonly _wvm: WorkflowVirtualMachine;

	public static async run(cancellationToken: CancellationToken, activity: Activity): Promise<void> {
		const instance = new WorkflowInvoker(activity);
		return instance.invoke(cancellationToken);
	}

	public constructor(activity: Activity) {
		this._wvm = new WorkflowVirtualMachineImpl(activity);
	}

	public async invoke(cancellationToken: CancellationToken) {
		do {
			await this._wvm.tick(cancellationToken);
		} while (!this._wvm.isTerminated);
	}

	public waitForBreakpoint(cancellationToken: CancellationToken, breakpointName: string): Promise<BreakpointActivity> {
		const breakpointActivity = BreakpointActivity.of(this._wvm, breakpointName);
		return breakpointActivity.wait(cancellationToken, this._wvm);
	}

	public resumeBreakpoint(breakpointName: string): void {
		const breakpointActivity = BreakpointActivity.of(this._wvm, breakpointName);
		breakpointActivity.resume(this._wvm);
	}
}
