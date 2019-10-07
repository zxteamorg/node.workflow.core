import { CancellationToken } from "@zxteam/contract";

import { WorkflowRuntime } from "./WorkflowRuntime";

export abstract class Activity<TContext> {
	public constructor() {
		//super();
	}

	protected abstract onExecute(cancellationToken: CancellationToken, context: TContext, runtime: WorkflowRuntime): void | Promise<void>;
}
