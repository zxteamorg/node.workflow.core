import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("d2360cf2-d55f-4198-ba84-a8af34c9888f")
export class SequenceActivity extends Activity {
	public constructor(...children: ReadonlyArray<Activity>) { super({}, ...children); }

	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		let variable: WorkflowVirtualMachine.Variable;
		if (wvm.currentActivityCallCount === 1) {
			variable = wvm.variable("CHILD_INDEX", WorkflowVirtualMachine.Scope.PRIVATE, 0);
		} else {
			variable = wvm.variable("CHILD_INDEX");

		}

		const childIndex: number = variable.value++;

		if (childIndex < this.children.length) {
			const nextChild: Activity = this.children[childIndex];
			await wvm.callstackPush(cancellationToken, nextChild);
		} else {
			wvm.callstackPop(); // remove itself
		}
	}
}
