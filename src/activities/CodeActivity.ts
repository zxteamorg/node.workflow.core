import { CancellationToken } from "@zxteam/contract";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("b9c1c0a9-a3c6-41df-a069-ee86784772b3")
export abstract class CodeActivity extends Activity {
	public constructor(opts?: Activity.Opts) { super(opts || {}); }

	protected abstract code(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): void | Promise<void>;

	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		await this.code(cancellationToken, wvm);
		wvm.callstackPop(); // remove itself
	}
}
