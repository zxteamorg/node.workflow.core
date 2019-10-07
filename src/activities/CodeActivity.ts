import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../Activity";
import { WorkflowRuntime } from "../WorkflowRuntime";

export class CodeActivity<TContext> extends Activity<TContext> {
	private readonly _func: (context: TContext) => void | Promise<void>;
	public constructor(func: (context: TContext) => void | Promise<void>) {
		super();
		this._func = func;
	}

	protected async onExecute(cancellationToken: CancellationToken, context: TContext, runtime: WorkflowRuntime): Promise<void> {
		return await this._func(context);
	}
}
