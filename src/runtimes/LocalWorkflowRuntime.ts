import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../Activity";
import { WorkflowRuntime } from "../WorkflowRuntime";
import "../internal/WorkflowActivityMixin";

export abstract class LocalWorkflowRuntime implements WorkflowRuntime {
	public abstract readonly globalState: Map<string, string>;
	public readonly localState: Map<string, string>;
	public readonly currentActivity: Activity<unknown>;

	private _needRetryCurrentActivity: boolean;

	public markRetryCurrentActivity(): void {
		if (this._needRetryCurrentActivity === true) {
			throw new Error("Wrong operation. Already marked for retry.");
		}
		this._needRetryCurrentActivity = true;
	}
	public abstract scheduleActivity<TContext>(
		cancellationToken: CancellationToken, activity: Activity<TContext>, context: TContext
	): Promise<void>;

	public static async invoke<T>(cancellationToken: CancellationToken, activity: Activity<T>, context: T): Promise<void> {
		const rootRuntime = new RootLocalWorkflowRuntime(activity);
		const workerRuntime = new WorkerLocalWorkflowRuntime(activity, rootRuntime);
		return await workerRuntime.exec(cancellationToken, activity, context);
	}

	protected constructor(currentActivity: Activity<unknown>) {
		this.currentActivity = currentActivity;
		this.localState = new Map();
		this._needRetryCurrentActivity = false;
	}

	protected get isNeedRetryCurrentActivity(): boolean { return this._needRetryCurrentActivity; }

	protected reset(): void {
		this._needRetryCurrentActivity = false;
	}
}

class RootLocalWorkflowRuntime extends LocalWorkflowRuntime {
	public readonly globalState: Map<string, string>;
	public readonly stack: Array<Function>;

	public constructor(currentActivity: Activity<unknown>) {
		super(currentActivity);
		this.globalState = new Map();
		this.stack = [];
	}

	public async scheduleActivity<TContext>(
		cancellationToken: CancellationToken, activity: Activity<TContext>, context: TContext
	): Promise<void> {
		const childRuntime = new WorkerLocalWorkflowRuntime(activity, this);
		return await childRuntime.exec(cancellationToken, activity, context);
	}
}

class WorkerLocalWorkflowRuntime extends LocalWorkflowRuntime {
	private readonly _rootRuntime: RootLocalWorkflowRuntime;

	public constructor(currentActivity: Activity<unknown>, rootRuntime: RootLocalWorkflowRuntime) {
		super(currentActivity);
		this._rootRuntime = rootRuntime;
	}

	public get globalState(): Map<string, string> { return this._rootRuntime.globalState; }

	public async scheduleActivity<TContext>(
		cancellationToken: CancellationToken, activity: Activity<TContext>, context: TContext
	): Promise<void> {
		const childRuntime = new WorkerLocalWorkflowRuntime(activity, this._rootRuntime);
		return await childRuntime.exec(cancellationToken, activity, context);
	}

	public async exec<TContext>(cancellationToken: CancellationToken, activity: Activity<TContext>, context: TContext): Promise<void> {
		this._rootRuntime.stack.push(activity.constructor);
		try {
			//const stackId = this.stack.join(".");
			// let activityRuntime: WorkflowInvoker.ActivityContextImpl | undefined = undefined;// this.activityContexts.get(stackId);
			// if (activityRuntime === undefined) {
			// 	activityRuntime = new WorkflowInvoker.ActivityContextImpl();
			// 	//this.activityContexts.set(stackId, activityRuntime);
			// }

			//const state = new Map<string, string>();
			while (true) {
				this.reset();

				// let nextActivity: {
				// 	readonly activity: Activity<unknown>,
				// 	readonly executionContext: unknown,
				// 	resolve: () => void
				// } | null = null;

				// const scheduleActivity = <TContext>(activity: Activity<TContext>, executionContext: TContext): Promise<void> => {
				// 	return this.exec(activity, executionContext);
				// 	// return new Promise<void>((resolve) => {
				// 	// 	nextActivity = { activity, executionContext, resolve };
				// 	// });
				// };

				await activity.exec(cancellationToken, context, this);

				// if (nextActivity !== null) {
				// 	const { activity: childActivity, executionContext: childExecutionContext, resolve } = nextActivity;
				// 	await this.exec(childActivity, childExecutionContext);
				// 	//resolve();
				// }
				// if (activityRuntime.needDelayDuration !== null) {
				// 	const sleepDuration = activityRuntime.needDelayDuration;
				// 	await new Promise(wakeup => setTimeout(wakeup, sleepDuration));
				// }
				if (!this.isNeedRetryCurrentActivity) {
					break;
				}
			}

		} finally {
			this._rootRuntime.stack.pop();
		}
	}
}

