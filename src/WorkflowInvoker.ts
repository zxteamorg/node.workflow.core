import { CancellationToken } from "@zxteam/contract";
import { ArgumentError, InvalidOperationError, wrapErrorIfNeeded } from "@zxteam/errors";
import { sleep, DUMMY_CANCELLATION_TOKEN } from "@zxteam/cancellation";

import { Activity } from "./activities/Activity";
import { BreakpointElement } from "./elements/BreakpointElement";

import { WorkflowVirtualMachine } from "./WorkflowVirtualMachine";
import { WorkflowVirtualMachine1Impl } from "./internal/WorkflowVirtualMachine1Impl";

export class WorkflowInvoker {
	private readonly _wvm: WorkflowVirtualMachine;

	public static async run(cancellationToken: CancellationToken, activity: Activity): Promise<void> {
		const instance = new WorkflowInvoker(activity);
		return instance.invoke(cancellationToken);
	}

	public constructor(activity: Activity) {
		this._wvm = new WorkflowVirtualMachine1Impl(activity);
	}

	public get currentExecutionContext(): WorkflowVirtualMachine.ExecutionContext {
		if (!this._wvm.isPaused) {
			throw new InvalidOperationError("Wrong operation at current state. A currentExecutionContext is available in pause-state only.");
		}
		if (this._wvm.isTerminated) {
			throw new InvalidOperationError("Wrong operation at current state. A WorkflowVirtualMachine is terminated.");
		}
		return this._wvm;
	}

	public async invoke(cancellationToken: CancellationToken) {
		try {
			do {
				const isIdle = await this._wvm.tick(cancellationToken);
				if (isIdle) {
					await sleep(DUMMY_CANCELLATION_TOKEN, 1000);
				}
			} while (!this._wvm.isTerminated);
		} catch (e) {
			const err: Error = wrapErrorIfNeeded(e);
			for (const breakpoint of this._wvm.breakpoints.values()) {
				breakpoint.notifyAwaitersForCrash(err, this._wvm);
			}
			throw e;
		}
	}

	public waitForBreakpoint(cancellationToken: CancellationToken, breakpointName: string): Promise<BreakpointElement> {
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
