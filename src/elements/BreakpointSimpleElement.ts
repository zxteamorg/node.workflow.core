import { WorkflowVirtualMachine } from "./../WorkflowVirtualMachine";
import { BreakpointSimpleActivity } from "../activities/BreakpointSimpleActivity";
import _ = require("lodash");
import { InvalidOperationError } from "@zxteam/errors";

export class BreakpointSimpleElement {
	private readonly _ctx: WorkflowVirtualMachine.ExecutionContext;
	private readonly _flag: string;

	public constructor(ctx: WorkflowVirtualMachine.ExecutionContext, activity: BreakpointSimpleActivity) {
		this._ctx = ctx;
		this._flag = activity.flagVariable(ctx);
	}

	public enable(): void {
		this._ctx.variables.set(this._flag, true);
	}

	public disable(): void {
		this._ctx.variables.set(this._flag, false);
	}

	public resume(): void {
		this.disable();
	}

	public static of(ctx: WorkflowVirtualMachine.ExecutionContext, name?: string): BreakpointSimpleElement {

		for (const activity of ctx.stack) {
			if (activity instanceof BreakpointSimpleActivity) {
				if (!_.isUndefined(name)) {
					if (!_.isUndefined(activity.name) && activity.name === name) {
						return new BreakpointSimpleElement(ctx, activity);
					}
				} else {
					return new BreakpointSimpleElement(ctx, activity);
				}
			}
		}

		if (name) {
			throw new InvalidOperationError("BreakpointSimpleElement was not found in current stack.");
		} else {
			throw new InvalidOperationError(`BreakpointSimpleElement with name '${name}' was not found in current stack.`);
		}

	}
}
