import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { BusinessActivity } from "./BusinessActivity";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("cf31d7c4-ca74-4625-a6e3-7346e2070e3c")
export class ConsoleLogActivity extends BusinessActivity {
	public constructor(opts: ConsoleLogActivity.Opts) { super(opts); }

	protected onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext) {
		const opts = this.opts as ConsoleLogActivity.Opts;
		console.log("ConsoleLogActivity: " + opts.text);
	}
}

export namespace ConsoleLogActivity {
	export interface Opts extends Activity.Opts {
		readonly text: string;
	}
}
