import { CancellationToken } from "@zxteam/contract";

import {
	Activity, BreakpointActivity, BusinessActivity, ContextActivity,
	ConsoleLogActivity, DelayActivity, LoopActivity, NativeActivity, RandomIntActivity,
	RandomUintActivity, SequenceActivity, WorkflowVirtualMachine, IfActivity, IfElement
} from "../src";
import { WorkflowInvoker } from "../src";

import { createInterface } from "readline";

// let testStartBreakpoint: BreakpointActivity<any>;
// let testFinishBreakpoint: BreakpointActivity<any>;
let workflowInvoker: WorkflowInvoker;

// class SetupBreakpointActivity extends BreakpointActivity {
// 	private readonly _breakpointResumedSymbol: symbol;

// 	public constructor(opts: BreakpointActivity.Opts, child: Activity) {
// 		super(opts);
// 		this._breakpointResumedSymbol = Symbol.for("BreakpointActivity.Awaiter:" + this.name);
// 	}

// 	public async execute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.NativeExecutionContext): Promise<void> {
// 		const { runtimeSymbols } = ctx;

// 		this.resolveAwaiters(runtimeSymbols);

// 		if (this.isResumeAllowed(ctx)) {
// 			if (runtimeSymbols.has(this._breakpointResumedSymbol)) {
// 				// remove itself
// 				ctx.stackPop();
// 			} else {
// 				// push child
// 				ctx.stackPush(cancellationToken);
// 			}
// 		}
// 	}
// }

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

	// interface Context { readonly appName: string; }
	// interface PersonContext { name: string; age: number; }

	@Activity.Id("46d44efd-7341-4b7e-a581-41b605ac5f6c")
	class PersonRenderActivity extends BusinessActivity {
		protected onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext) {
			console.log(`Application '${ctx.variables.getString("appName")}' The ${ctx.variables.getString("name")} is ${ctx.variables.getInteger("age")} years old.`);
		}
	}

	@Activity.Id("5b839031-04ff-4e52-849a-194ddd28b094")
	class IncrementAgeAndBreakLoop extends BusinessActivity {
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
		protected onExecute(cancellationToken: CancellationToken, ctx: WorkflowVirtualMachine.ExecutionContext): void {
			throw "Crash";
		}
	}

	class IsRandomPositive extends BusinessActivity {
		protected onExecute(cancellationToken: CancellationToken, wvm: WorkflowVirtualMachine.ExecutionContext): void {
			const ifElement: IfElement = IfActivity.of(wvm);
			if (wvm.variables.getInteger("random") > 0) {
				ifElement.markTrue();
			} else {
				ifElement.markFalse();
			}
		}
	}

	// const workflow = new WhileActivity({
	// 	condition: new CodeActivity(async (cancellationToken, $$) => {
	// 		if ($$.age === undefined) { $$.age = 42; }
	// 		console.log("Checking condition in CodeActivity");
	// 		$$.age++;
	// 		if ($$.age > 45) {
	// 			$$[WhileActivity.Done]();
	// 		}
	// 		return;
	// 	}),
	// 	child: new SequenceActivity({
	// 		children: [
	// 			new ConsoleLogActivity(($$) => { text: `one: ${$$.age}` }),
	// 			new DelayActivity({ durationMilliseconds: 100 }),
	// 			new ConsoleLogActivity(($$) => { text: `two: ${$$.age}` }),
	// 			new DelayActivity({ durationMilliseconds: 200 }),
	// 			new ConsoleLogActivity(($$) => { text: `three: ${$$.age}` }),
	// 			new DelayActivity({ durationMilliseconds: 300 }),
	// 			new PersonRenderActivity()
	// 		]
	// 	})

	// });

	// const workflow = new ContextActivity({ appName: "example1", random: 0 },
	// 	new SequenceActivity(
	// 		new RandomUintActivity({ targetVariable: "random" }),
	// 		new ContextActivity({ name: "Maks", age: 40 },
	// 			new IfActivity(
	// 				new IsRandomPositive(),
	// 				new LoopActivity(
	// 					new SequenceActivity(
	// 						new ConsoleLogActivity({ text: "one" }),
	// 						new DelayActivity({ durationMilliseconds: 100 }),
	// 						new ConsoleLogActivity({ text: "two" }),
	// 						new DelayActivity({ durationMilliseconds: 200 }),
	// 						new ConsoleLogActivity({ text: "three" }),
	// 						new DelayActivity({ durationMilliseconds: 300 }),
	// 						new PersonRenderActivity(),
	// 						new IncrementAgeAndBreakLoop(),
	// 						new BreakpointActivity({ name: "LOOP_BREAKPOINT", description: "Waiting user's approval to continue" })
	// 					)
	// 				),
	// 				new ConsoleLogActivity({ text: "Random value is NEGATIVE" })
	// 			)
	// 		),
	// 		new BreakpointActivity({ name: "TEST_BREAKPOINT", description: "Waiting user's approval to continue" })
	// 	)
	// );


	const workflow = new ContextActivity({ appName: "example1", random: 0 },
		new BreakpointActivity({ name: "SETUP_BREAKPOINT", description: "Setup data" },
			new SequenceActivity(
				//new CrashTestActivity(),
				new RandomIntActivity({ targetVariable: "random" }),
				//new ContextActivity({ name: "Maks", age: 40 },
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
				//)
				,
				new MyBreakpointActivity({ name: "TEST_BREAKPOINT", description: "Waiting user's approval to continue" }),
				new ConsoleLogActivity({ text: "Workflow is finished" })
			)
		)
	);

	// const workflow = new ContextActivity({ age: 18 },
	// 	new ConsoleLogActivity({ text: "two" })
	// );

	// const workflow = new ContextActivity({ age: 18 },
	// 	new AgeLogActivity()
	// );

	// const workflow = new ConsoleLogActivity({ text: "one" });

	workflowInvoker = new WorkflowInvoker("example", workflow);

	workflowInvoker.waitForBreakpoint(dummyCancellationToken, "SETUP_BREAKPOINT").then(() => {
		const variables = workflowInvoker.currentExecutionContext.variables;
		variables.define("name", "Maks", WorkflowVirtualMachine.Scope.INHERIT);
		variables.define("age", 40, WorkflowVirtualMachine.Scope.INHERIT);
		workflowInvoker.resumeBreakpoint("SETUP_BREAKPOINT");
	});


	workflowInvoker.waitForBreakpoint(dummyCancellationToken, "TEST_BREAKPOINT")
		.then((brk) => {
			console.log("UUUha! TEST_BREAKPOINT is reached. Will resume it in 5 seconds. Description: " + brk.description);
			setTimeout(function () {
				workflowInvoker.resumeBreakpoint("TEST_BREAKPOINT");
				console.log("Resumed TEST_BREAKPOINT");
			}, 5000);
		})
		.catch(reason => {
			console.log("Wau1! TEST_BREAKPOINT is crashed");
		});

	workflowInvoker.waitForBreakpoint(dummyCancellationToken, "TEST_BREAKPOINT")
		.catch(reason => {
			console.log("Wau2! TEST_BREAKPOINT is crashed");
		});

	workflowInvoker.waitForBreakpoint(dummyCancellationToken, "TEST_BREAKPOINT")
		.catch(reason => {
			console.log("Wau3! TEST_BREAKPOINT is crashed");
		});

	await workflowInvoker.invoke(dummyCancellationToken);
	//await WorkflowInvoker.run(dummyCancellationToken, workflow);
}

main()
	.then(() => { process.exit(0); })
	.catch((e: Error) => console.error(e && e.stack || e));

// const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "Admin> " });
// rl.prompt();
// rl.on("line", (line) => {
// 	switch (line.trim()) {
// 		case "hup":
// 			console.log(`Resume breakpoint TEST_BREAKPOINT`);
// 			workflowInvoker.resumeBreakpoint("TEST_BREAKPOINT");
// 			break;
// 		case "loop":
// 			console.log(`Resume breakpoint LOOP_BREAKPOINT`);
// 			workflowInvoker.resumeBreakpoint("LOOP_BREAKPOINT");
// 			break;
// 		default:
// 			rl.prompt();
// 			break;
// 	}
// 	rl.prompt();
// });
