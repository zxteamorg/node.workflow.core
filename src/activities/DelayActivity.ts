import { CancellationToken } from "@zxteam/contract";
import { sleep } from "@zxteam/cancellation";

import { Activity } from "./Activity";
import { NativeActivity } from "./NativeActivity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("244eee7e-9b60-4f31-a20c-db242a937497")
export class DelayActivity extends NativeActivity {
	private readonly _durationMilliseconds: number;

	public constructor(opts: DelayActivity.Opts) {
		super();
		this._durationMilliseconds = opts.durationMilliseconds;
	}

	protected async onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
		await sleep(cancellationToken, this._durationMilliseconds);
		ctx.stackPop(); // remove itself
	}
}
export namespace DelayActivity {
	export interface Opts {
		readonly durationMilliseconds: number;
	}
}
