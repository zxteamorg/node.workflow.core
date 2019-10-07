import { CancellationToken } from "@zxteam/contract";

import { Activity } from "../src/Activity";

import { CodeActivity, ConsoleLogActivity, ContextActivity, DelayActivity, SequenceActivity, WhileActivity } from "../src";
import { LocalWorkflowRuntime } from "../src";

async function main(): Promise<void> {
	const dummyCancellationToken: CancellationToken = {
		isCancellationRequested: false,
		addCancelListener(cb: Function): void { /* noop */ },
		removeCancelListener(cb: Function): void { /* noop */ },
		throwIfCancellationRequested(): void { /* noop */ }
	};

	interface Context { readonly appName: string; }
	interface PersonContext { name: string; age: number; }

	class PersonRenderActivity extends Activity<PersonContext & Context> {
		protected onExecute(cancellationToken: CancellationToken, context: PersonContext & Context): void | Promise<void> {
			console.log(`${context.appName} The ${context.name} is ${context.age} years old.`);
		}
	}

	const workflow = new ContextActivity<Context, PersonContext>({
		initContext: { name: "Noname", age: 42 },
		child: new WhileActivity({
			condition: new CodeActivity((ctx) => {
				console.log("Checking condition in CodeActivity");
				ctx.age++;
				if (ctx.age > 45) {
					ctx[WhileActivity.Done]();
				}
			}),
			child: new SequenceActivity({
				children: [
					new ConsoleLogActivity({ text: "one" }),
					new DelayActivity({ durationMilliseconds: 100 }),
					new ConsoleLogActivity({ text: "two" }),
					new DelayActivity({ durationMilliseconds: 200 }),
					new ConsoleLogActivity({ text: "three" }),
					new DelayActivity({ durationMilliseconds: 300 }),
					new PersonRenderActivity()
				]
			})
		})
	});

	console.log("LocalWorkflowRuntime.invoke(activity, context)");
	const appContext: Context = { appName: "example1" };
	await LocalWorkflowRuntime.invoke(dummyCancellationToken, workflow, appContext);
}

main().catch((e) => console.error(e));
