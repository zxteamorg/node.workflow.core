import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../Activity";
import { WorkflowRuntime } from "../WorkflowRuntime";

export class DelayActivity<TContext> extends Activity<TContext> {
	private readonly durationMilliseconds: number;

	public constructor({ durationMilliseconds }: DelayActivity.Opts) {
		super();
		this.durationMilliseconds = durationMilliseconds;
	}

	protected async onExecute(cancellationToken: CancellationToken, context: TContext, runtime: WorkflowRuntime): Promise<void> {
		await new Promise(wakeup => setTimeout(wakeup, this.durationMilliseconds));
		//activityRuntime.scheduleDelay(this.durationMilliseconds);
	}
}
export namespace DelayActivity {
	export interface Opts {
		readonly durationMilliseconds: number;
	}
}
