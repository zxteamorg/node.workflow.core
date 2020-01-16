import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { NativeActivity } from "./NativeActivity";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("d2360cf2-d55f-4198-ba84-a8af34c9888f")
export class SequenceActivity extends NativeActivity {
	public constructor(...children: ReadonlyArray<Activity>) { super(...children); }

	protected async onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
		const { variables } = ctx;

		const oid = ctx.getActivityOid(this);

		const indexVarName = `${oid}.CHILD_INDEX`;

		let childIndex: number;
		if (ctx.currentActivityCallCount === 1) {
			variables.define(indexVarName, 0, WorkflowVirtualMachine.Scope.INHERIT);
			childIndex = 0;
		} else {
			childIndex = variables.getInteger(indexVarName);
		}

		if (childIndex < this.children.length) {
			await ctx.stackPush(childIndex);
			variables.set(indexVarName, childIndex + 1);
		} else {
			ctx.stackPop(); // remove itself
		}
	}
}
