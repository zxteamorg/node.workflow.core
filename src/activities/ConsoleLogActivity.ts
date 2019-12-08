import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("cf31d7c4-ca74-4625-a6e3-7346e2070e3c")
export class ConsoleLogActivity extends Activity {
	public constructor(opts: ConsoleLogActivity.Opts) { super(opts); }

	protected onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine) {
		const opts = this.opts as ConsoleLogActivity.Opts;
		console.log("ConsoleLogActivity: " + opts.text);
		wvm.callstackPop(); // remove itself
	}
}

export namespace ConsoleLogActivity {
	export interface Opts extends Activity.Opts {
		readonly text: string;
	}
}
