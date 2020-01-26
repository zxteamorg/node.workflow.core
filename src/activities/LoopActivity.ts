import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError } from "@zxteam/errors";

import { Activity } from "./Activity";
import { NativeActivity } from "./NativeActivity";

import { LoopElement } from "../elements/LoopElement";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("c41a3d31-ba3d-4b41-acb5-26b7dd63547f")
export class LoopActivity extends NativeActivity {
	public static of(ctx: WorkflowVirtualMachine.ExecutionContext): LoopElement {
		for (const activity of ctx.stack) {
			if (activity instanceof LoopActivity) {
				return new LoopElement(ctx, ctx.getActivityOid(activity));
			}
		}
		throw new InvalidOperationError("LoopActivity was not found in current stack.");
	}

	public constructor(child: NativeActivity) { super(child); }

	protected async onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
		const oid = ctx.getActivityOid(this);

		const { variables } = ctx;

		if (!variables.has(oid)) {
			variables.define(oid, false, WorkflowVirtualMachine.Scope.INHERIT);
		}

		if (variables.getBoolean(oid)) {
			ctx.stackPop(); // remove itself
		} else {
			await ctx.stackPush(0);
		}
	}
}
