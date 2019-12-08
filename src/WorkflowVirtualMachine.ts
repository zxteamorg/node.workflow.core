import { CancellationToken } from "@zxteam/contract";
import { Activity } from "./activities";

export interface WorkflowVirtualMachine {
	/**
	 * Return number of call attempts of current activity
	 */
	readonly currentActivityCallCount: number;
	readonly currentActivity: Activity;
	readonly rootActivity: Activity;
	readonly isTerminated: boolean;
	readonly ancestorChain: ReadonlyArray<Activity>;
	//breakpoints: ReadonlyArray<BreakpointActivity>;

	hasVariable(key: string | Symbol): boolean;
	variable(key: string | Symbol): WorkflowVirtualMachine.Variable;
	variable(key: string, scope: WorkflowVirtualMachine.Scope, value: any): WorkflowVirtualMachine.Variable;
	variable(key: Symbol, scope: WorkflowVirtualMachine.Scope.SYMBOL, value: any): WorkflowVirtualMachine.Variable;

	callstackPush(cancellationToken: CancellationToken, activity: Activity): Promise<void>;
	callstackPop(): void;

	//breakpoint(name: string): void;

	tick(cancellationToken: CancellationToken): Promise<void>;

}
export namespace WorkflowVirtualMachine {
	export const enum Scope {
		/**
		 * Accessible for all inner activities
		 */
		PUBLIC = "PUBLIC",
		/**
		 * Accessible for current activity only
		 */
		PRIVATE = "PRIVATE",
		/**
		 * Shared access based on Symbol
		 */
		SYMBOL = "SYMBOL"
	}

	export interface Variable {
		readonly scope: Scope;
		value: any;
	}
}
