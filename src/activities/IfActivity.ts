import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

import { getActivityUUID } from "../internal/meta";
import { InvalidOperationError } from "@zxteam/errors";

@Activity.Id("58dc3233-bd64-4388-8384-c3585e8df05c")
export class IfActivity extends Activity {
	private readonly _symbol: Symbol;

	public static of(wvm: WorkflowVirtualMachine): IfActivity {
		for (const activity of wvm.ancestorChain) {
			if (activity instanceof IfActivity) {
				return activity;
			}
		}
		throw new InvalidOperationError("IfActivity was not found in ancestorChain.");
	}

	public constructor(opts: { readonly conditionActivity: Activity, readonly trueActivity: Activity, readonly falseActivity?: Activity }) {
		const children = [opts.conditionActivity, opts.trueActivity];
		if (opts.falseActivity !== undefined) {
			children.push(opts.falseActivity);
		}
		super({}, ...children);
		this._symbol = Symbol.for(getActivityUUID(this.constructor as Activity.Constructor));
	}

	public markTrue(wvm: WorkflowVirtualMachine): void {
		wvm.variable(this._symbol).value = true;
	}

	public markFalse(wvm: WorkflowVirtualMachine): void {
		wvm.variable(this._symbol).value = false;
	}

	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		if (wvm.currentActivityCallCount === 1) {
			wvm.variable(this._symbol, WorkflowVirtualMachine.Scope.SYMBOL, false);
			await wvm.callstackPush(cancellationToken, this.children[0]);
		} else {
			const conditionVariable: WorkflowVirtualMachine.Variable = wvm.variable(this._symbol);
			if (conditionVariable.value === true) {
				const trueActivity: Activity = this.children[1];
				await wvm.callstackPush(cancellationToken, trueActivity);
				conditionVariable.value = null;
			} else if (conditionVariable.value === false && this.children.length > 2) {
				const falseActivity: Activity = this.children[2];
				await wvm.callstackPush(cancellationToken, falseActivity); // run falseActi
				conditionVariable.value = null;
			} else {
				wvm.callstackPop(); // remove itself
			}
		}
	}
}
