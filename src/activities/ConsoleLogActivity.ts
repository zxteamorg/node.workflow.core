import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../Activity";
import { WorkflowRuntime } from "../WorkflowRuntime";

export class ConsoleLogActivity<TContext> extends Activity<TContext> {
	private readonly text: string;

	public constructor({ text }: ConsoleLogActivity.Opts) {
		super();
		this.text = text;
	}

	protected onExecute(cancellationToken: CancellationToken, context: TContext, runtime: WorkflowRuntime): void {
		console.log(this.text);
	}
}
export namespace ConsoleLogActivity {
	export interface Opts {
		readonly text: string;
	}
}
