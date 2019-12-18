import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

export class LoopElement {
	private readonly _ctx: WorkflowVirtualMachine.ExecutionContext;
	private readonly _oid: string;

	public constructor(ctx: WorkflowVirtualMachine.ExecutionContext, activityOid: string) {
		this._ctx = ctx;
		this._oid = activityOid;
	}

	public break(): void {
		this._ctx.variables.set(this._oid, true);
	}
}
