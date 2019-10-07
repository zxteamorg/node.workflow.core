import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";

export interface WorkflowRuntime {
	readonly globalState: Map<string, string>;
	readonly localState: Map<string, string>;
	readonly currentActivity: Activity<unknown>;
	markRetryCurrentActivity(): void;
	scheduleActivity<TActivityContext, TContext extends TActivityContext>(
		cancellationToken: CancellationToken,
		activity: Activity<TActivityContext>,
		context: TContext
	): Promise<void>;
}
