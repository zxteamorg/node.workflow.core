import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

export class BreakpointElement {
	private readonly _ctx: WorkflowVirtualMachine.NativeExecutionContext;
	private readonly _name: string;
	private readonly _description: string;
	private readonly _breakpointResumeSymbol: symbol;

	public constructor(
		ctx: WorkflowVirtualMachine.NativeExecutionContext,
		name: string,
		description: string,
		breakpointResumeSymbol: symbol
	) {
		this._ctx = ctx;
		this._name = name;
		this._description = description;
		this._breakpointResumeSymbol = breakpointResumeSymbol;
	}

	public get name(): string { return this._name; }

	public get description(): string { return this._description; }

	public resume(): void {
		const { runtimeSymbols } = this._ctx;

		runtimeSymbols.set(this._breakpointResumeSymbol, true);
	}

}
