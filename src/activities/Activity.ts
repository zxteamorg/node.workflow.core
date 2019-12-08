import { CancellationToken } from "@zxteam/contract";
import { InvalidOperationError } from "@zxteam/errors";

import "reflect-metadata";
import * as _ from "lodash";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";
import * as meta from "../internal/meta";

export abstract class Activity {
	public readonly children: ReadonlyArray<Activity>;
	public readonly opts: Activity.Opts;

	public constructor(opts: Activity.Opts, ...children: ReadonlyArray<Activity>) {
		this.opts = opts;
		this.children = children;
	}

	public async execute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		await this.onExecute(cancellationToken, wvm);
	}

	protected abstract onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): void | Promise<void>;
}

export namespace Activity {
	/**
	 * Activity'es options.
	 * Should be serializable.
	 */
	export interface Opts {
		readonly [name: string]: any;
	}

	export function Id(activityUUID: string): ClassDecorator {
		function decorator(target: Function): void {
			//
			meta.registerActivity(activityUUID, target as Activity.Constructor);
		}
		return decorator;
	}

	export type Constructor = <T extends Activity>(opts: Activity.Opts, ...children: ReadonlyArray<Activity>) => T;
}
