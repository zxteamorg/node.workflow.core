import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

export class IfElement {
	private readonly _ctx: WorkflowVirtualMachine.ExecutionContext;
	private readonly _oid: string;

	public constructor(ctx: WorkflowVirtualMachine.ExecutionContext, activityOid: string) {
		this._ctx = ctx;
		this._oid = activityOid;
	}

	public markTrue(): void {
		this._ctx.variables.set(this._oid, true);
	}

	public markFalse(): void {
		this._ctx.variables.set(this._oid, false);
	}
}
