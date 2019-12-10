import { CancellationToken } from "@zxteam/contract";

import "reflect-metadata";
import * as _ from "lodash";

import { Activity } from "./Activity";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

export abstract class BusinessActivity extends Activity {
	public constructor(opts: Activity.Opts) {
		super(opts);
	}

	public async execute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext): Promise<void> {
		await this.onExecute(cancellationToken, ctx);
	}

	protected abstract onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext): void | Promise<void>;
}
