import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("0c9b672e-7efe-4d61-b5da-cda0fdd00863")
export class ContextActivity extends Activity {
	public constructor(opts: Activity.Opts, child: Activity) { super(opts, child); }

	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		if (wvm.currentActivityCallCount === 1) {
			const initContext = this.opts;
			for (const key of Object.keys(initContext)) {
				const value = initContext[key];
				wvm.variable(key, WorkflowVirtualMachine.Scope.PUBLIC, value);
			}
			await wvm.callstackPush(cancellationToken, this.children[0]);
		} else {
			wvm.callstackPop(); // remove itself
		}
	}
}
