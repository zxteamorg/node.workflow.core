import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { NativeActivity } from "./NativeActivity";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("0c9b672e-7efe-4d61-b5da-cda0fdd00863")
export class ContextActivity extends NativeActivity {
	public constructor(opts: Activity.Opts, child: Activity) { super(opts, child); }

	protected async onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
		if (ctx.currentActivityCallCount === 1) {
			const context = this.opts;
			for (const key of Object.keys(context)) {
				const value = context[key];
				ctx.variables.define(key, value, WorkflowVirtualMachine.Scope.INHERIT);
			}
			await ctx.stackPush(cancellationToken, this.children[0]);
		} else {
			ctx.stackPop(); // remove itself
		}
	}
}
