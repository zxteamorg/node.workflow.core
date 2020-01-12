import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError } from "@zxteam/errors";

import "reflect-metadata";
import * as _ from "lodash";

import { Activity } from "./Activity";
import { BreakpointActivity } from "./BreakpointActivity";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

import { activityRecursiveWalker } from "../utils/activityRecursiveWalker";

export abstract class NativeActivity extends Activity {
	private readonly _breakpoints: ReadonlyMap<BreakpointActivity["name"], BreakpointActivity>;
	private readonly _children: ReadonlyArray<Activity>;

	public constructor(...children: ReadonlyArray<Activity>) {
		super();
		this._children = Object.freeze(children);
		const breakpoints = new Map<BreakpointActivity["name"], BreakpointActivity>();
		activityRecursiveWalker(this, (activity) => {
			if (activity instanceof BreakpointActivity) {
				if (breakpoints.has(activity.name)) {
					throw new InvalidOperationError(`${this.constructor.name}: Breakpoint name duplicate detected '${activity.name}'`);
				}
				breakpoints.set(activity.name, activity);
			}
		});

		// TODO make real runtime read-only map
		this._breakpoints = breakpoints;
	}

	public get breakpoints(): ReadonlyMap<BreakpointActivity["name"], BreakpointActivity> {
		return this._breakpoints;
	}

	public get children(): ReadonlyArray<Activity> {
		return this._children;
	}

	public async execute(
		cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext
	): Promise<void> {
		await this.onExecute(cancellationToken, ctx);
	}

	protected abstract onExecute(
		cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext
	): void | Promise<void>;
}
