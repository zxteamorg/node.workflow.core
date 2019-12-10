import { CancellationToken } from "@zxteam/contract";
import { sleep } from "@zxteam/cancellation";

import { Activity } from "./Activity";
import { NativeActivity } from "./NativeActivity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("244eee7e-9b60-4f31-a20c-db242a937497")
export class DelayActivity extends NativeActivity {
	public constructor(opts: DelayActivity.Opts) { super(opts); }

	protected async onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
		const opts = this.opts as DelayActivity.Opts;
		await sleep(cancellationToken, opts.durationMilliseconds);
		ctx.stackPop(); // remove itself
	}
}
export namespace DelayActivity {
	export interface Opts {
		readonly durationMilliseconds: number;
	}
}
