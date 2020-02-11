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
	 * TODO: Deprecated
	 */
	readonly runtimeSymbols: WorkflowVirtualMachine.RuntimeSymbols;

	/**
	 * Get persistable variables storage.
	 * TODO: Deprecated
	 */
	readonly variables: WorkflowVirtualMachine.Variables;

	/**
	 * Get map of the breakpoints of the executed workflow
	 * TODO: Deprecated
	 */
	readonly breakpoints: ReadonlyMap<BreakpointActivity["name"], BreakpointActivity>;

	getActivityOid(activity: Activity): string;

	stackPush(index: number): Promise<void>;
	stackPop(): void;

	/**
	 * Returns named activity by name
	 * @param name Activity name
	 */
	//getByName(name: string): Activity;

	/**
	 * Delays execution of machie on @period function, guarantees that
	 * next tick will at least after @period. If -1 passed (default) machine
	 * will be delayed on default period, which can be automatically increased
	 * with next delays.
	 * @param period Delay period in seconds, can be with 3 decimal digits for ms.
	 */
	delay(period: number): void;

	/**
	 * Countdown to execution of next tick of workflow virtual machine
	 * @returns Time in milliseconds to execution of next tick. 0 - ready for execution.
	 */
	tickCountdown(): number;

	/**
	 * Execute next workflow item
	 * @returns Idle status. `true` is nothing to do (check isPaused/isTerminated flags)
	 */
	tick(cancellationToken: CancellationToken): Promise<boolean>;

	preserve(): WorkflowVirtualMachine.WorkflowVirtualMachineState;
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
		// /**
		//  * Get named activity by name
		//  * @param name
		//  */
		// getByName(name: string): Activity;
	}
	export interface NativeExecutionContext extends ExecutionContext {
		//TODO: Deprecate
		readonly runtimeSymbols: WorkflowVirtualMachine.RuntimeSymbols;

		delay(period?: number): void;
		stackPush(child: number): Promise<void>;
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

	export interface WorkflowVirtualMachineState {
		activity: string;
		nextTick: string | undefined;
		stack: WorkflowVirtualMachine.Stack.StackState;
	}

	export namespace Stack {

		export type StackState = FrameData[];

		export interface VariableData {
			name: string;
			scope: WorkflowVirtualMachine.Scope;
			value: any;
		}

		export interface FrameData  {
			idx: number;
			calls: number;
			variables: VariableData[];
		}
	}
}
