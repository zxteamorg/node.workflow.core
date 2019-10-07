import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../Activity";
import { WorkflowRuntime } from "../WorkflowRuntime";

export class SequenceActivity<TContext> extends Activity<TContext> {
	private readonly children: ReadonlyArray<Activity<TContext>>;

	public constructor({ children }: SequenceActivity.Opts<TContext>) {
		super();
		this.children = children;
	}

	protected async onExecute(cancellationToken: CancellationToken, context: TContext, runtime: WorkflowRuntime): Promise<void> {
		const childIndexState: string | undefined = runtime.localState.get("CHILD_INDEX");
		let childIndex: number;
		if (childIndexState === undefined) {
			childIndex = 0;
		} else {
			childIndex = Number.parseInt(childIndexState) + 1;
		}
		runtime.localState.set("CHILD_INDEX", childIndex.toString());

		if (childIndex < this.children.length) {
			runtime.markRetryCurrentActivity(); // This tells runtime to loop this activity

			const nextChild: Activity<TContext> = this.children[childIndex];
			await runtime.scheduleActivity(cancellationToken, nextChild, context); // Schedule execution of the child activity
		}
	}
}
export namespace SequenceActivity {
	export interface Opts<TContext> {
		readonly children: ReadonlyArray<Activity<TContext>>;
	}
}
