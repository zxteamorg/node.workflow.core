import { CancellationToken } from "@zxteam/contract";
import { WorkflowVirtualMachine, Activity, NativeActivity } from "..";
import _ = require("lodash");

@Activity.Id("8c8dc5fa-c70a-4bad-811c-108dcd73be9c")
export class BreakpointSimpleActivity extends NativeActivity {

	private readonly _opts: BreakpointSimpleActivity.Opts;

	public get name(): string | undefined {

		return this._opts.name;
	}

	public get description(): string | undefined {

		return this._opts.description;
	}

	public constructor(opts: BreakpointSimpleActivity.Opts = {}, child?: Activity) {

		if (child !== undefined) {
			super(child);
		} else {
			super();
		}

		this._opts = opts;
	}

	public flagVariable(ctx: WorkflowVirtualMachine.ExecutionContext): string {
		const oid = ctx.getActivityOid(this);
		return `${oid}:flag`;
	}

	public async onExecute(ct: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {

		const { variables } = ctx;

		const flag = this.flagVariable(ctx);
		const child =  this._childVariable(ctx);

		// Defining breakpoint flag variable
		if (!variables.has(flag)) {
			variables.define(flag, true, WorkflowVirtualMachine.Scope.INHERIT);
		}

		if (child) {

			// Defining child flag variable
			if (!variables.has(child)) {
				variables.define(child, true, WorkflowVirtualMachine.Scope.LOCAL);
			}

			// Pushing child, only once because of flag
			if (variables.getBoolean(child)) {
				variables.set(child, false);
				ctx.stackPush(0);
				return;
			}
		}

		// Removing from stack if breakpoint disabled
		if (!variables.getBoolean(flag)) {
			ctx.stackPop();
		}

		// Staying on stack and delaying execution
		ctx.delay();
	}

	private _childVariable(ctx: WorkflowVirtualMachine.ExecutionContext): string | undefined {

		if (this.children.length === 0) {
			return undefined;
		}

		const oid = ctx.getActivityOid(this);
		return `${oid}:child`;
	}
}

export namespace BreakpointSimpleActivity {
	export interface Opts {
		readonly name?: string;
		readonly description?: string;
	}
}
