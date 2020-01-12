import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { BusinessActivity } from "./BusinessActivity";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("cf31d7c4-ca74-4625-a6e3-7346e2070e3c")
export class ConsoleLogActivity extends BusinessActivity {
	private readonly _text: string;

	public constructor(opts: ConsoleLogActivity.Opts) {
		super();
		this._text = opts.text;
	}

	protected onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext) {
		console.log("ConsoleLogActivity: " + this._text);
	}
}

export namespace ConsoleLogActivity {
	export interface Opts {
		readonly text: string;
	}
}
