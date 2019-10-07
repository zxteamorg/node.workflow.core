import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../Activity";
import { WorkflowRuntime } from "../WorkflowRuntime";
import { extendContext } from "../internal/extendContext";

export class WhileActivity<TContext> extends Activity<TContext> {
	private readonly condition: Activity<TContext & WhileActivity.Context>;
	private readonly child: Activity<TContext>;

	public constructor({ condition, child }: WhileActivity.Opts<TContext>) {
		super();
		this.condition = condition;
		this.child = child;
	}

	protected async onExecute(cancellationToken: CancellationToken, context: TContext, runtime: WorkflowRuntime): Promise<void> {
		if (runtime.localState.get("STEP") !== "PROCESSING") {
			runtime.localState.set("STEP", "PROCESSING");
			runtime.markRetryCurrentActivity();
			const extendedContext = extendContext(context, {
				[WhileActivity.Done]() {
					runtime.localState.set("DONE", "true");
				}
			});
			await runtime.scheduleActivity(cancellationToken, this.condition, extendedContext);
			return;
		} else {
			runtime.localState.delete("STEP");
			if ((runtime.localState.get("DONE") !== "true")) {
				runtime.markRetryCurrentActivity();
				await runtime.scheduleActivity(cancellationToken, this.child, context);
				return;
			}
		}
	}
}
export namespace WhileActivity {
	export interface Opts<TContext> {
		readonly condition: Activity<TContext & WhileActivity.Context>;
		readonly child: Activity<TContext & Context>;
	}
	export interface Context {
		[Done](): void;
	}
	export const Done = Symbol("WhileActivity.Done");
}
