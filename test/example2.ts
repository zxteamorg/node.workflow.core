import { CancellationToken } from "@zxteam/contract";

import {
	Activity, BreakpointActivity, BusinessActivity, ContextActivity,
	ConsoleLogActivity, DelayActivity, LoopActivity, NativeActivity, RandomIntActivity,
	RandomUintActivity, SequenceActivity, WorkflowVirtualMachine, IfActivity, IfElement
} from "../src";
import { WorkflowInvoker } from "../src";
import { sleep } from "@zxteam/cancellation";

let invoker0: WorkflowInvoker;

class MyBreakpointActivity extends BreakpointActivity {
	public async execute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
		console.log("MyBreakpointActivity#execute");
		return super.execute(cancellationToken, ctx);
	}
}

async function main(): Promise<void> {
	const dummyCancellationToken: CancellationToken = {
		isCancellationRequested: false,
		addCancelListener(cb: Function): void { /* noop */ },
		removeCancelListener(cb: Function): void { /* noop */ },
		throwIfCancellationRequested(): void { /* noop */ }
	};

	@Activity.Id("46d44efd-7341-4b7e-a581-41b605ac5f6c")
	class PersonRenderActivity extends BusinessActivity {
		public constructor() { super(); }

		protected onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext) {
			console.log(`Application '${ctx.variables.getString("appName")}' The ${ctx.variables.getString("name")} is ${ctx.variables.getInteger("age")} years old.`);
		}
	}

	@Activity.Id("5b839031-04ff-4e52-849a-194ddd28b094")
	class IncrementAgeAndBreakLoop extends BusinessActivity {
		public constructor() { super(); }

		protected onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext): void | Promise<void> {
			const currentAge = ctx.variables.getInteger("age");

			if (currentAge > 45) {
				LoopActivity.of(ctx).break();
			} else {
				ctx.variables.set("age", currentAge + 1);
			}
		}
	}

	class CrashTestActivity extends BusinessActivity {
		public constructor() { super(); }

		protected onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext): void {
			throw "Crash";
		}
	}

	class IsRandomPositive extends BusinessActivity {
		public constructor() { super(); }

		protected onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine.ExecutionContext): void {
			const ifElement: IfElement = IfActivity.of(wvm);
			if (wvm.variables.getInteger("random") > 0) {
				ifElement.markTrue();
			} else {
				ifElement.markFalse();
			}
		}
	}

	@Activity.Id("69152474-74df-4fa5-8a9a-74c7cb640f1a")
	class ExampleActivity extends ContextActivity {
		constructor() {
			super({ appName: "example2", random: 0 },
				new SequenceActivity(
					new RandomUintActivity("random"),
					new MyBreakpointActivity({ name: "FIRST_STOP", description: "Waiting for approve to start." }),
					new ContextActivity({ name: "Maks", age: 40 },
						new IfActivity({
							conditionActivity:
								new IsRandomPositive(),
							trueActivity: new LoopActivity(
								new SequenceActivity(
									new ConsoleLogActivity({ text: "Random value is POSITIVE" }),
									new ConsoleLogActivity({ text: "one" }),
									new DelayActivity({ durationMilliseconds: 100 }),
									new ConsoleLogActivity({ text: "two" }),
									new DelayActivity({ durationMilliseconds: 200 }),
									new ConsoleLogActivity({ text: "three" }),
									new DelayActivity({ durationMilliseconds: 300 }),
									new PersonRenderActivity(),
									new IncrementAgeAndBreakLoop()
								)
							),
							falseActivity: new ConsoleLogActivity({ text: "Random value is NEGATIVE" })
						})
					),
					new MyBreakpointActivity({ name: "SECOND_STOP", description: "Wating for approve to finish." }),
					new ConsoleLogActivity({ text: "Workflow is finished" })
				)
			);
		}
	}

	function reload(i: number, source: WorkflowInvoker) {
		let dump = JSON.stringify(source.preserve(), null, 2);
		console.log(`===== #${i} =========================`);
		console.log(dump);
		let loaded = JSON.parse(dump);
		return WorkflowInvoker.restore(loaded);
	}

	invoker0 = WorkflowInvoker.create("example", new ExampleActivity());
	await invoker0.step(dummyCancellationToken);

	const invoker1 = reload(1, invoker0);
	invoker1.resumeBreakpoint("FIRST_STOP");
	await invoker1.step(dummyCancellationToken);

	const invoker2 = reload(2, invoker1);
	invoker2.resumeBreakpoint("SECOND_STOP");
	await invoker2.step(dummyCancellationToken);

	await sleep(dummyCancellationToken, 1000);

	const fs = invoker2.preserve();
	console.log("===== FS =========================");
	console.log(JSON.stringify(fs, null, 2));
}


main()
	.then(() => { process.exit(0); })
	.catch((e: Error) => {
		console.error(e && e.stack || e);
	});
