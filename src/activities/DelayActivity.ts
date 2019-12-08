import { CancellationToken } from "@zxteam/contract";
import { sleep } from "@zxteam/cancellation";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("244eee7e-9b60-4f31-a20c-db242a937497")
export class DelayActivity extends Activity {
	public constructor(opts: DelayActivity.Opts) { super(opts); }

	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		const opts = this.opts as DelayActivity.Opts;
		await sleep(cancellationToken, opts.durationMilliseconds);
		wvm.callstackPop(); // remove itself
	}
}
export namespace DelayActivity {
	export interface Opts {
		readonly durationMilliseconds: number;
	}
}
