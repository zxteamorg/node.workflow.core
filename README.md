# ZXTeam's Workflow

## Samples
#### [Example 1](./test/example1.ts)
```typescript
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
```
Result:
```
LocalWorkflowRuntime.invoke(activity, context)
Checking condition in CodeActivity
one
two
three
example1 The Noname is 43 years old.
Checking condition in CodeActivity
one
two
three
example1 The Noname is 44 years old.
Checking condition in CodeActivity
one
two
three
example1 The Noname is 45 years old.
Checking condition in CodeActivity
```
