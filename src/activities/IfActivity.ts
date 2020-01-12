import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError } from "@zxteam/errors";

import { Activity } from "./Activity";
import { NativeActivity } from "./NativeActivity";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";
import { IfElement } from "../elements/IfElement";

@Activity.Id("58dc3233-bd64-4388-8384-c3585e8df05c")
export class IfActivity extends NativeActivity {
	public static of(ctx: WorkflowVirtualMachine.ExecutionContext): IfElement {
		for (const activity of ctx.stack) {
			if (activity instanceof IfActivity) {
				return new IfElement(ctx, ctx.getActivityOid(activity));
			}
		}
		throw new InvalidOperationError("IfActivity was not found in current stack.");
	}

	public constructor(opts: {
		readonly conditionActivity: Activity,
		readonly trueActivity: Activity,
		readonly falseActivity?: Activity
	}) {
		const children = [opts.conditionActivity, opts.trueActivity];
		if (opts.falseActivity !== undefined) {
			children.push(opts.falseActivity);
		}
		super(...children);
	}

	public markTrue(ctx: WorkflowVirtualMachine.ExecutionContext): void {
		const oid = ctx.getActivityOid(this);
		const { variables } = ctx;
		variables.set(oid, true);
	}

	public markFalse(ctx: WorkflowVirtualMachine.ExecutionContext): void {
		const oid = ctx.getActivityOid(this);
		const { variables } = ctx;
		variables.set(oid, false);
	}

	protected async onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
		const oid = ctx.getActivityOid(this);
		const { variables } = ctx;

		if (!variables.has(oid)) {
			variables.define(oid, null, WorkflowVirtualMachine.Scope.INHERIT);
			await ctx.stackPush(cancellationToken, this.children[0]);
		} else if (!variables.has(`${oid}#`)) {
			const conditionResult = variables.getBoolean(oid);

			variables.define(`${oid}#`, null, WorkflowVirtualMachine.Scope.LOCAL);

			if (conditionResult === true) {
				const trueActivity: Activity = this.children[1];
				await ctx.stackPush(cancellationToken, trueActivity);
			} else if (this.children.length > 2) {
				const falseActivity: Activity = this.children[2];
				await ctx.stackPush(cancellationToken, falseActivity); // run falseActi
			}
		} else {
			ctx.stackPop(); // remove itself
		}
	}
}
