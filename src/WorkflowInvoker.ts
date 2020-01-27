import { CancellationToken } from "@zxteam/contract";

import { Activity, NativeActivity } from "./activities";
import { WorkflowVirtualMachine } from "./WorkflowVirtualMachine";
import { WorkflowVirtualMachineImpl } from "./internal/WorkflowVirtualMachineImpl";
import { BreakpointActivity } from "./activities/BreakpointActivity";
import { ArgumentError, wrapErrorIfNeeded, InvalidOperationError } from "@zxteam/errors";
import { sleep, DUMMY_CANCELLATION_TOKEN } from "@zxteam/cancellation";
import { throws } from "assert";
import { BreakpointElement } from "./elements";
import { WorkflowVirtualMachine1Impl } from "./internal/WorkflowVirtualMachine1Impl";

export class WorkflowInvoker {

	private readonly _wvm: WorkflowVirtualMachine;
	private _state: WorkflowInvoker.State;

	public static async run(cancellationToken: CancellationToken, workflowId: string, activity: NativeActivity): Promise<void> {
		const instance = WorkflowInvoker.create(workflowId, activity);
		return instance.invoke(cancellationToken);
	}

	public get currentExecutionContext(): WorkflowVirtualMachine.ExecutionContext {
		if (!this._wvm.isPaused) {
			throw new InvalidOperationError("Wrong operation at current state. A currentExecutionContext is available in pause-state only.");
		}
		if (this._wvm.isTerminated) {
			throw new InvalidOperationError("Wrong operation at current state. A WorkflowVirtualMachine is terminated.");
		}
		return this._wvm;
	}

	public async invoke(cancellationToken: CancellationToken) {
		while (true) {
			const completed = await this.step(cancellationToken);
			if (!completed) {
				await sleep(DUMMY_CANCELLATION_TOKEN, 1000);
			} else {
				break;
			}
		}
	}

	/**
	 * Executes virtual machine till pause or compeletition
	 * @param cancellationToken
	 */
	public async step(cancellationToken: CancellationToken): Promise<boolean> {

		if (![WorkflowInvoker.State.NEW, WorkflowInvoker.State.SLEEPING].includes(this._state)) {
			throw new InvalidOperationError(`Workflow is in ${this._state} state, unable perform next step.`);
		}

		try {
			this._state = WorkflowInvoker.State.WORKING;
			while (true) {
				const isIdle = await this._wvm.tick(cancellationToken);
				if (isIdle) {

					if (this._wvm.isPaused) {
						this._state = WorkflowInvoker.State.SLEEPING;
						return false;
					}

					if (this._wvm.isTerminated) {
						this._state = WorkflowInvoker.State.COMPLETED;
						return true;
					}
				}
			}
		} catch (e) {
			this._state = WorkflowInvoker.State.CRASHED;
			const err: Error = wrapErrorIfNeeded(e);
			for (const breakpoint of this._wvm.breakpoints.values()) {
				breakpoint.notifyAwaitersForCrash(err, this._wvm);
			}
			throw e;
		}
	}

	public waitForBreakpoint(cancellationToken: CancellationToken, breakpointName: string): Promise<BreakpointElement> {
		const breakpointActivity = this._wvm.breakpoints.get(breakpointName);
		if (breakpointActivity === undefined) {
			throw new ArgumentError("breakpointName", `A breakpoint '${breakpointName}' was not found`);
		}
		return breakpointActivity.wait(cancellationToken, this._wvm);
	}

	public resumeBreakpoint(breakpointName: string): void {
		const breakpointActivity = this._wvm.breakpoints.get(breakpointName);
		if (breakpointActivity === undefined) {
			throw new ArgumentError("breakpointName", `A breakpoint '${breakpointName}' was not found`);
		}
		breakpointActivity.resume(this._wvm);
	}

	public preserve(): WorkflowInvoker.WorkflowInvokerState {
		return {
			state: this._state,
			machine: this._wvm.preserve()
		};
	}

	private constructor(state: WorkflowInvoker.State, machine: WorkflowVirtualMachine) {
		this._state = WorkflowInvoker.State.NEW;
		this._wvm = machine;
	}

	public static create(workflowId: string, activity: NativeActivity) {
		const state = WorkflowInvoker.State.NEW;
		const wvm = WorkflowVirtualMachineImpl.create(activity);
		//const wvm = new WorkflowVirtualMachine1Impl(activity);
		return new WorkflowInvoker(state, wvm);
	}

	public static restore(source: WorkflowInvoker.WorkflowInvokerState) {
		const state = source.state;
		const wvm = WorkflowVirtualMachineImpl.restore(source.machine);
		return new WorkflowInvoker(state, wvm);
	}
}

export namespace WorkflowInvoker {
	export const enum State {
		NEW = "NEW",
		WORKING = "WORKING",
		SLEEPING = "SLEEPING",
		CRASHED = "CRASHED",
		COMPLETED = "COMPLETED"
	}

	export interface WorkflowInvokerState {
		state: State;
		machine: WorkflowVirtualMachine.WorkflowVirtualMachineState;
	}
}
