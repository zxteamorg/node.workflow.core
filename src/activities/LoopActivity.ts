import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

const LoopBreak = Symbol("LoopActivity.Break");

@Activity.Id("c41a3d31-ba3d-4b41-acb5-26b7dd63547f")
export class LoopActivity extends Activity {
	public constructor(child: Activity) { super({}, child); }

	public static break(wvm: WorkflowVirtualMachine): void {
		wvm.variable(LoopBreak).value = true;
	}

	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		let breakFlagVariable: WorkflowVirtualMachine.Variable;
		if (wvm.currentActivityCallCount === 1) {
			breakFlagVariable = wvm.variable(LoopBreak, WorkflowVirtualMachine.Scope.SYMBOL, false);
		} else {
			breakFlagVariable = wvm.variable(LoopBreak);
		}

		if (breakFlagVariable.value === false) {
			await wvm.callstackPush(cancellationToken, this.children[0]);
		} else {
			wvm.callstackPop(); // remove itself
		}
	}
}
