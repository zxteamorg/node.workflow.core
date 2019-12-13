import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./activities";
import { WorkflowVirtualMachine } from "./WorkflowVirtualMachine";
import { WorkflowVirtualMachineImpl } from "./internal/WorkflowVirtualMachineImpl";
import { BreakpointActivity } from "./activities/BreakpointActivity";
import { ArgumentError } from "@zxteam/errors";
import { sleep, DUMMY_CANCELLATION_TOKEN } from "@zxteam/cancellation";

export class WorkflowInvoker {
	private readonly _wvm: WorkflowVirtualMachine;

	public static async run(cancellationToken: CancellationToken, workflowId: string, activity: Activity): Promise<void> {
		const instance = new WorkflowInvoker(workflowId, activity);
		return instance.invoke(cancellationToken);
	}

	public constructor(workflowId: string, activity: Activity) {
		this._wvm = new WorkflowVirtualMachineImpl(workflowId, activity);
	}

	public async invoke(cancellationToken: CancellationToken) {
		do {
			const isIdle = await this._wvm.tick(cancellationToken);
			if (isIdle) {
				await sleep(DUMMY_CANCELLATION_TOKEN, 1000);
			}
		} while (!this._wvm.isTerminated);
	}

	public waitForBreakpoint(cancellationToken: CancellationToken, breakpointName: string): Promise<BreakpointActivity> {
		const breakpointActivity = this._wvm.breakpoints.get(breakpointName);
		if (breakpointActivity === undefined) {
			throw new ArgumentError("breakpointName", `A breakpoint '${breakpointName}' was not found`);
		}
		return breakpointActivity.wait(cancellationToken, this._wvm);
	}

	public resumeBreakpoint(breakpointName: string): void {
		const breakpointActivity = this._wvm.breakpoints.get(breakpointName);
		if (breakpointActivity === undefined) {
			throw new ArgumentError("breakpointName", `A breakpoint '${breakpointName}' was not found`);
		}
		breakpointActivity.resume(this._wvm);
	}
}
