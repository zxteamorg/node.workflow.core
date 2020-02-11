import { CancellationToken } from "@zxteam/contract";

import { NativeActivity } from "./activities";
import { WorkflowVirtualMachine } from "./WorkflowVirtualMachine";
import { Logger, logger } from "@zxteam/logger";
import _ = require("lodash");
import { InvalidOperationError, ArgumentError } from "@zxteam/errors";
import { v4 as uuid } from "uuid";
import { WorkflowVirtualMachineCountdown } from "./internal/WorkflowVirtualMachineCountdown";

export class WorkflowInvokerCountdown {

	private readonly _log: Logger;
	private readonly _wvm: WorkflowVirtualMachine;
	private readonly _workflowId: string;

	private _status: WorkflowInvokerCountdown.Status;
	private _injections: WorkflowInvokerCountdown.Injection[] = [];

	/**
	 * Creates new instance of workflow invoker application
	 * @param activity Activity to run
	 */
	public constructor(activity: NativeActivity)
	/**
	 * Restores workflow invoker appclition from preserved state
	 * @param state Application state to restore from
	 */
	public constructor(state: WorkflowInvokerCountdown.State)
	public constructor(activityOrState: NativeActivity | WorkflowInvokerCountdown.State) {

		this._log = logger.getLogger("WorkflowInvoker");

		// Creation of application
		if (activityOrState instanceof NativeActivity) {

			this._workflowId = uuid();
			this._wvm = WorkflowVirtualMachineCountdown.create(activityOrState);
			this._status = WorkflowInvokerCountdown.Status.IDLE;

			return;
		}

		// Restoring of application
		if (WorkflowInvokerCountdown.isState(activityOrState)) {

			this._workflowId = activityOrState.workflowId;
			this._wvm = WorkflowVirtualMachineCountdown.restore(activityOrState.wvm);
			this._status = WorkflowInvokerCountdown.Status.IDLE;

			return;
		}

		throw new ArgumentError(`activityOrState should be of type NativeActivity | WorkflowApplication.State.`);
	}

	protected get log(): Logger {
		return this._log;
	}

	public get state(): WorkflowInvokerCountdown.Status {
		return this._status;
	}

	public get tickCountdown(): number {
		return this._wvm.tickCountdown();
	}

	public inject(
		callback: WorkflowInvokerCountdown.InjectionCallback,
		condition?: WorkflowInvokerCountdown.InjectionCondition,
		once?: boolean) {

		if (_.isUndefined(once)) {
			once = true;
		}

		const injection = new WorkflowInvokerCountdown.Injection(callback, condition, once);
		this._injections.push(injection);
	}

	// TODO: Discuss, it should awaitable becuse it is only one way to get time
	// of next tick.
	public async execute(ct: CancellationToken): Promise<void> {

		if (this._status === WorkflowInvokerCountdown.Status.WORKING
			|| this._status === WorkflowInvokerCountdown.Status.SUSPENDED) {
			// execution in process
			return;
		}

		if (this._status === WorkflowInvokerCountdown.Status.ABORTED
			|| this._status === WorkflowInvokerCountdown.Status.COMPLETED) {
			// already finished
			throw new InvalidOperationError(`Workflow application is ${this._status}, and can't be executed.`);
		}

		await this.step(ct);
	}

	public preserve(): WorkflowInvokerCountdown.State {
		return {
			workflowId: this._workflowId,
			status: this._status,
			wvm: this._wvm.preserve()
		};
	}

	protected async step(ct: CancellationToken): Promise<void> {

		if (this._status !== WorkflowInvokerCountdown.Status.IDLE) {
			return;
		}

		const countdown = this._wvm.tickCountdown();
		if (countdown > 0) {
			return;
		}

		this._status = WorkflowInvokerCountdown.Status.WORKING;

		while (true) {

			await this.processInjections(ct);

			try {

				await this._wvm.tick(ct);
			} catch (e) {

				this.log.error(`Workflow application '${this._workflowId}' aborted.`, e);
				this._status = WorkflowInvokerCountdown.Status.ABORTED;
				break;
			}

			await this.processInjections(ct);

			if (this._wvm.isPaused) {
				this._status = WorkflowInvokerCountdown.Status.IDLE;
				break;
			}

			if (this._wvm.isTerminated) {
				this._status = WorkflowInvokerCountdown.Status.COMPLETED;
				break;
			}
		}

	}

	protected async processInjections(ct: CancellationToken) {

		const previous = this._status;
		let complated = 0;

		for (let injection of this._injections) {

			if (injection.check(this._wvm) && !injection.complated()) {

				this._status = WorkflowInvokerCountdown.Status.SUSPENDED;

				try {
					await injection.call(ct, this._wvm);
				} catch (ex) {
					this.log.error("Injection execution failed.", ex);
				}
			}

			if (injection.complated()) {
				complated++;
			}
		}

		// Removing of comapleated injections
		if (complated > 10) {

			let copy: WorkflowInvokerCountdown.Injection[] = [];
			for (let injection of this._injections) {

				if (injection.complated()) {
					copy.push(injection);
				}
			}

			this._injections = copy;
		}

		if (this._status !== previous) {
			this._status = previous;
		}
	}


}

export namespace WorkflowInvokerCountdown {

	export type InjectionCallback = (ct: CancellationToken, context: WorkflowVirtualMachine.ExecutionContext) => Promise<void>;
	export type InjectionCondition = (context: WorkflowVirtualMachine.ExecutionContext) => boolean;

	export class Injection {

		private readonly _once: boolean;
		private readonly _condition: InjectionCondition | undefined;
		private readonly _callback: InjectionCallback;
		private _calls: number;

		public constructor(callback: InjectionCallback, condition: InjectionCondition | undefined, once: boolean) {
			this._callback = callback;
			this._once = once;
			this._condition = condition;
			this._calls = 0;
		}

		public get once() {
			return this._once;
		}

		public get calls() {
			return this._calls;
		}

		public check(context: any) {

			if (!this._condition) {
				return true;
			}

			return this._condition(context);
		}

		public  complated() {

			return this._once && this._calls > 0;
		}

		public async call(ct: CancellationToken, context: WorkflowVirtualMachine.ExecutionContext) {

			// I expect that it is safer to count injection failure as
			// completion, but it could be wrong.
			// TODO: find out what is correct.
			this._calls ++;
			await this._callback(ct, context);
		}
	}

	export enum Status {
		IDLE = "Idle",
		WORKING = "Working",
		SUSPENDED = "Suspended",
		ABORTED = "Aborted",
		COMPLETED = "Completed"
	}

	export interface State {
		workflowId: string;
		status: Status;
		wvm: WorkflowVirtualMachine.WorkflowVirtualMachineState;
	}

	export function isState(somthing: any): somthing is State {
		return _.isString((somthing as State).workflowId)
			&& Object.values(Status).includes((somthing as State)?.status)
			&& !_.isUndefined((somthing as State));
	}
}
