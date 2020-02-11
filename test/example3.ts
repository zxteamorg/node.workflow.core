import { CancellationToken } from "@zxteam/contract";

import {
	Activity, BreakpointActivity, BusinessActivity, ContextActivity,
	ConsoleLogActivity, DelayActivity, LoopActivity, NativeActivity, RandomIntActivity,
	RandomUintActivity, SequenceActivity, WorkflowVirtualMachine, IfActivity, IfElement
} from "../src";
import { sleep, DUMMY_CANCELLATION_TOKEN } from "@zxteam/cancellation";
import { BreakpointSimpleActivity } from "../src/activities/BreakpointSimpleActivity";
import { BreakpointSimpleElement } from "../src/elements/BreakpointSimpleElement";
import { WorkflowInvokerCountdown } from "../src/WorkflowInvokerCountdown";
import { WorkflowVirtualMachineCountdown } from "../src/internal/WorkflowVirtualMachineCountdown";
import { stat } from "fs";

class MyBreakpointActivity extends BreakpointSimpleActivity {

	public async execute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
		super.execute(cancellationToken, ctx);
		console.log("MyBreakpointActivity#execute");
	}
}

class OnStartResumer extends NativeActivity {

	public async onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {

		const rnd = Math.random();

		console.log(`On start resumer`);
		console.log(`Generated number ${rnd} > 0.4 = ${rnd > 0.4}`);

		if (rnd > 0.4) {

			console.log(`Resuming...`);
			const breakpoint = BreakpointSimpleElement.of(ctx);
			breakpoint.resume();
			ctx.stackPop();
		} else {

			console.log("Still on breakpoint...");
		}
	}
}

class PersonRenderActivity extends BusinessActivity {
	public constructor() { super(); }

	protected onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext) {
		console.log(`Application '${ctx.variables.getString("appName")}' The ${ctx.variables.getString("name")} is ${ctx.variables.getInteger("age")} years old.`);
	}
}

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

async function main(): Promise<void> {
	const dummyCancellationToken: CancellationToken = {
		isCancellationRequested: false,
		addCancelListener(cb: Function): void { /* noop */ },
		removeCancelListener(cb: Function): void { /* noop */ },
		throwIfCancellationRequested(): void { /* noop */ }
	};

	@Activity.Id("69152474-74df-4fa5-8a9a-74c7cb640f1a")
	class ExampleActivity extends ContextActivity {
		constructor() {
			super({ appName: "example2", random: 0 },
				new SequenceActivity(
					new RandomUintActivity("random"),
					new MyBreakpointActivity({ name: "FIRST_STOP", description: "Waiting for approve to start." }, new OnStartResumer()),
					new ContextActivity({ name: "Max", age: 40 },
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

	const inject = (wi: WorkflowInvokerCountdown) => {

		// wi.inject(
		// 	// injection code
		// 	async (ct, ctx) => {
		// 		console.log("Executing First Inject");
		// 		const breakpoint = BreakpointSimpleElement.of(ctx);
		// 		breakpoint.resume();
		// 		console.log("First Done");
		// 	},
		// 	// injection condition
		// 	ctx => (ctx.stack[0] instanceof BreakpointSimpleActivity && ctx.currentActivityCallCount > 2),
		// 	// true - execute injection only once
		// 	true
		// );

		wi.inject(
			// injection code
			async (ct, ctx) => {
				console.log("Executing Second Inject");
				const breakpoint = BreakpointSimpleElement.of(ctx, "SECOND_STOP");
				breakpoint.resume();
				console.log("Second Done");
			},
			// injection condition
			ctx => (ctx.stack[0] instanceof BreakpointSimpleActivity
					&& (ctx.stack[0] as BreakpointSimpleActivity).name === "SECOND_STOP"
					&& ctx.currentActivityCallCount > 1),
			// true - execute injection only once
			true
		);
	};

	// Create application
	let app = new WorkflowInvokerCountdown(new ExampleActivity());

	// Attach injections
	inject(app);

	while (true) {

		await app.execute(DUMMY_CANCELLATION_TOKEN);

		const countdown = app.tickCountdown;
		if (countdown > 0) {

			// Preserver application
			const state = app.preserve();
			const preserved = JSON.stringify(state, null, 2);

			console.log(``);
			console.log(`==== Preserved ==== ==== ==== ==== ==== ==== ==== ====`);
			console.log(preserved);
			console.log(`==== ==== ==== ==== ==== ==== ==== ==== ==== ==== ====`);
			console.log(``);

			// Restore application
			const restored = JSON.parse(preserved);
			app = new WorkflowInvokerCountdown(restored);

			const newCountdown = app.tickCountdown;
			console.log(`Countdown: ${countdown} -  ${newCountdown} = ${countdown - newCountdown}}`);

			// Attach injections to restored applicaion
			inject(app);

			if (newCountdown > 0) {
				await sleep(DUMMY_CANCELLATION_TOKEN, newCountdown);
			}
		}

		if (app.state === WorkflowInvokerCountdown.Status.ABORTED || app.state === WorkflowInvokerCountdown.Status.COMPLETED) {
			break;
		}
	}
}

main()
	.then(() => { process.exit(0); })
	.catch((e: Error) => {
		console.error(e && e.stack || e);
	});
