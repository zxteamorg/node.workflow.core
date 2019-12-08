import { CancellationToken } from "@zxteam/contract";
import { sleep } from "@zxteam/cancellation";

import * as crypto from "crypto";

import { Activity } from "./Activity";
import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";

@Activity.Id("537f0a1c-4227-47bc-8ecc-b1da87a70e62")
export class RandomUintActivity extends Activity {
	public constructor(opts: RandomUintActivity.Opts) { super(opts); }

	protected async onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine): Promise<void> {
		const opts = this.opts as RandomUintActivity.Opts;

		const u8 = crypto.randomBytes(4);
		const u32bytes = u8.buffer.slice(0, 4); // last four bytes as a new `ArrayBuffer`
		const int = new Int32Array(u32bytes)[0];

		wvm.variable(opts.targetVariable).value = int;

		wvm.callstackPop(); // remove itself
	}
}

export namespace RandomUintActivity {
	export interface Opts {
		readonly targetVariable: string;
	}
}
