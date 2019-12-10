import { CancellationToken } from "@zxteam/contract";
import { Activity, BreakpointActivity } from "./activities";

export interface WorkflowVirtualMachine {
	/**
	 * Return number of call attempts of current activity
	 */
	readonly currentActivityCallCount: number;

	/***
	 * Gets current executing activity, or raise InvalidOperationError if isTerminated === true
	 */
	readonly currentActivity: Activity;

	/**
	 * Get root activity
	 */
	readonly rootActivity: Activity;

	readonly isPaused: boolean;
	readonly isTerminated: boolean;

	/**
	 * Gets callstack of activities
	 */
	readonly stack: ReadonlyArray<Activity>;

	/**
	 * Get runtime symbols storage.
	 * THIS IS NOT PERSISTABLE
	 */
	readonly runtimeSymbols: WorkflowVirtualMachine.RuntimeSymbols;

	/**
	 * Get persistable variables storage.
	 */
	readonly variables: WorkflowVirtualMachine.Variables;

	/**
	 * Get map of the breakpoints of the executed workflow
	 */
	readonly breakpoints: ReadonlyMap<BreakpointActivity["name"], BreakpointActivity>;

	getActivityOid(activity: Activity): string;

	stackPush(cancellationToken: CancellationToken, activity: Activity): Promise<void>;
	stackPop(): void;

	/**
	 * Execute next workflow item
	 * @returns Idle status. `true` is nothing to do (check isPaused/isTerminated flags)
	 */
	tick(cancellationToken: CancellationToken): Promise<boolean>;
}
export namespace WorkflowVirtualMachine {
	export const enum Scope {
		/**
		 * Accessible for all inner activities
		 */
		INHERIT = "INHERIT",
		/**
		 * Accessible for current activity only
		 */
		LOCAL = "LOCAL"
	}

	export interface ExecutionContext {
		readonly currentActivityCallCount: number;
		readonly stack: ReadonlyArray<Activity>;
		readonly variables: WorkflowVirtualMachine.Variables;
		/**
		 * Gets activity OID (finding in stack)
		 */
		getActivityOid(activity: Activity): string;
	}
	export interface NativeExecutionContext extends ExecutionContext {
		readonly runtimeSymbols: WorkflowVirtualMachine.RuntimeSymbols;
		stackPush(cancellationToken: CancellationToken, activity: Activity): Promise<void>;
		stackPop(): void;
	}

	export interface RuntimeSymbols {
		get(key: symbol): any;
		has(key: symbol): boolean;
		set(key: symbol, value: any): void;
	}

	export interface Variables {
		define(name: string, value: any, scope?: Scope): void;
		getBoolean(name: string): boolean;
		getInteger(name: string): number;
		getNumber(name: string): number;
		getObject(name: string): object;
		getString(name: string): string;
		has(name: string): boolean;
		set(name: string, value: boolean | number | object | string): void;
	}
}
