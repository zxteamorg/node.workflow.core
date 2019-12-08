import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./activities";
import { WorkflowVirtualMachine } from "./WorkflowVirtualMachine";
import { WorkflowVirtualMachineImpl } from "./internal/WorkflowVirtualMachineImpl";
import { BreakpointActivity } from "./activities/BreakpointActivity";

export class WorkflowInvoker {
	private readonly _vm: WorkflowVirtualMachine;

	public static async run(cancellationToken: CancellationToken, activity: Activity): Promise<void> {
		const instance = new WorkflowInvoker(activity);
		return instance.invoke(cancellationToken);
	}

	public constructor(activity: Activity) {
		this._vm = new WorkflowVirtualMachineImpl(activity);
	}

	public async invoke(cancellationToken: CancellationToken) {
		do {
			await this._vm.tick(cancellationToken);
		} while (!this._vm.isTerminated);
	}

	public resumeBreakpoint(name: string): void {
		const breakpointActivity = BreakpointActivity.of(this._vm, name);
		breakpointActivity.resume(this._vm);
	}
}
