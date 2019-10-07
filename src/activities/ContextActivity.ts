import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../Activity";
import { WorkflowRuntime } from "../WorkflowRuntime";

export class ContextActivity<TContext, TExtendContext> extends Activity<TContext> {
	private readonly child: Activity<TContext & TExtendContext>;
	private readonly initContext: TExtendContext;

	public constructor({ child, initContext: initContext }: ContextActivity.Opts<TContext, TExtendContext>) {
		super();
		this.child = child;
		this.initContext = initContext;
	}

	protected onExecute(cancellationToken: CancellationToken, context: TContext, runtime: WorkflowRuntime): void | Promise<void> {
		const childContext: TContext & TExtendContext = { ...context, ...this.initContext };
		return runtime.scheduleActivity(cancellationToken, this.child, childContext);
	}
}
export namespace ContextActivity {
	export interface Opts<TContext, TExtendContext> {
		readonly child: Activity<TContext & TExtendContext>;
		readonly initContext: TExtendContext;
	}
}
