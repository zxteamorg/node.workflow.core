import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../Activity";
import { WorkflowRuntime } from "../WorkflowRuntime";

declare module "../Activity" {
	export interface Activity<TContext> {
		exec(cancellationToken: CancellationToken, context: TContext, runtime: WorkflowRuntime): Promise<void>;
	}
}

Activity.prototype.exec = async function(cancellationToken: CancellationToken, context: unknown, runtime: WorkflowRuntime): Promise<void> {
	return (this as any).onExecute(cancellationToken, context, runtime);
};
