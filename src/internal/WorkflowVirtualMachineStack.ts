import * as _ from "lodash";
import { InvalidOperationError, ArgumentError } from "@zxteam/errors";

import { WorkflowVirtualMachine } from "../WorkflowVirtualMachine";
import { Activity, NativeActivity } from "../activities";
import { WorkflowVirtualMachineImpl } from "./WorkflowVirtualMachineImpl";

export class WorkflowVirtualMachineStack {

	private readonly _frames: WorkflowVirtualMachineStack.StackFrame[] = [];

	public get top(): WorkflowVirtualMachineStack.StackFrame {
		return this._frames[this._frames.length - 1];
	}

	public get root(): WorkflowVirtualMachineStack.StackFrame {
		return this._frames[0];
	}

	public get size(): number {
		return this._frames.length;
	}

	public get stack(): WorkflowVirtualMachineStack.StackFrame[] {
		return this._frames.slice().reverse();
	}

	public get frames(): WorkflowVirtualMachineStack.StackFrame[] {
		return this._frames;
	}

	public pushRoot(root: NativeActivity) {

		if (this.size !== 0) {
			throw new InvalidOperationError("Stack is not empty, forrbiden to push root activity");
		}

		const first = WorkflowVirtualMachineStack.StackFrame.create(root, 0);
		this._frames.push(first);
	}

	public push(index: number) {

		const parent = this.top.activity;

		if (!(parent instanceof NativeActivity)) {
			throw new Error(`Forbidden to push on stack of top is not NativeActivity.`);
		}

		if (index >= parent.children.length) {
			throw new Error(`Activity of type '${parent.constructor.name}' has no children with index ${index}.`);
		}

		const activity = parent.children[index];
		const frame = WorkflowVirtualMachineStack.StackFrame.create(activity, index);
		this._frames.push(frame);
	}

	public pop() {

		const frame = this._frames.pop();
		if (frame === undefined) {
			throw new InvalidOperationError("Stack underflow.");
		}
	}

	public defineVariable(name: string, scope: WorkflowVirtualMachine.Scope, value: any) {

		this.top.setVariable(name, scope, value);
	}

	public findVariable(name: string): WorkflowVirtualMachineStack.FrameVariable | undefined {

		for (let i = this._frames.length - 1; i >= 0; i--) {
			const frame = this._frames[i];
			const variable = frame.getVariable(name);
			if (variable) {

				if  (variable.scope === WorkflowVirtualMachine.Scope.INHERIT ||
					(variable.scope === WorkflowVirtualMachine.Scope.LOCAL && i === this._frames.length - 1)) {
					return variable;
				}
			}
		}

		return undefined;
	}

	public preserve(): WorkflowVirtualMachine.Stack.StackState {
		return _.map(this._frames, t => t.state);
	}

	public reconstruct(root: NativeActivity, source: WorkflowVirtualMachine.Stack.StackState) {

		let parent: NativeActivity | undefined = undefined;
		for (let item of source) {

			const index = item.idx;
			const activity: Activity = !parent ? root : parent.children[index];

			const frame = WorkflowVirtualMachineStack.StackFrame.restore(activity, item);
			this._frames.push(frame);

			parent = activity as NativeActivity;
		}
	}
}

export namespace WorkflowVirtualMachineStack {

	export class StackFrame {

		private readonly _data: FrameData;
		private readonly _activity: Activity;
		private readonly _variables: Map<string, FrameVariable> = new Map<string, FrameVariable>();

		public get index(): number {
			return this._data.idx;
		}

		public get calls(): number {
			return this._data.calls;
		}

		public set calls(value) {
			this._data.calls = value;
		}

		public get activity(): Activity {
			return this._activity;
		}

		public get state(): FrameData {
			return this._data;
		}

		public getVariable(name: string): FrameVariable | undefined {
			return this._variables.get(name);
		}

		public setVariable(name: string, scope: WorkflowVirtualMachine.Scope, value: any) {

			if (this._variables.has(name)) {
				throw new Error(`Variable '${name}' already defined.`);
			}

			const variable = FrameVariable.create(name, scope, value);
			this._data.variables.push(variable);
			this._variables.set(name, variable);
		}

		public static create(activity: Activity, index: number = 0): StackFrame {

			const data = FrameData.create(index);
			return new StackFrame(activity, data);
		}

		public static restore(activity: Activity, source: WorkflowVirtualMachine.Stack.FrameData): StackFrame {

			const data = FrameData.restore(source);
			const frame = new StackFrame(activity, data);
			frame._buildVariableMap();
			return frame;
		}

		public toJSON(): FrameData {
			return this.state;
		}

		private constructor(activity: Activity, data: FrameData) {
			this._data = data;
			this._activity = activity;
		}

		private _buildVariableMap() {
			for (let variable of this._data.variables) {
				this._variables.set(variable.name, variable);
			}
		}
	}

	export class FrameVariable implements WorkflowVirtualMachine.Stack.VariableData {

		private constructor(
			public name: string,
			public scope: WorkflowVirtualMachine.Scope,
			public value: any
		) { }

		public static create(name: string, scope: WorkflowVirtualMachine.Scope, value: any) {
			return new FrameVariable(name, scope, value);
		}

		public static restore(source: WorkflowVirtualMachine.Stack.VariableData) {
			return new FrameVariable(source.name, source.scope, source.value);
		}
	}

	export class FrameData implements WorkflowVirtualMachine.Stack.FrameData {

		private constructor(
			public idx: number,
			public calls: number = 0,
			public variables: FrameVariable[] = []
		) { }

		public static create(index: number) {
			return new FrameData(index);
		}

		public static restore(source: WorkflowVirtualMachine.Stack.FrameData) {
			const variables = _.map(source.variables, t => FrameVariable.restore(t));
			return new FrameData(source.idx, source.calls, variables);
		}
	}

	export class VariablesAccessor implements WorkflowVirtualMachine.Variables {

		private readonly _stack: WorkflowVirtualMachineStack;

		public constructor(stack: WorkflowVirtualMachineStack) {
			this._stack = stack;
		}

		public define(name: string, value: any, scope: WorkflowVirtualMachine.Scope = WorkflowVirtualMachine.Scope.LOCAL) {
			this._stack.defineVariable(name, scope, value);
		}

		public getTuple(name: string): FrameVariable {
			let variable = this._stack.findVariable(name);
			if (!variable) {
				throw new InvalidOperationError(`Variable '${name}' is not defined.`);
			}
			return variable;
		}

		public getBoolean(name: string) {
			const variable = this.getTuple(name);
			if (_.isBoolean(variable.value)) { return variable.value; }
			throw new InvalidOperationError(`Variable '${name}' is not boolean.`);
		}

		public getInteger(name: string) {
			const variable = this.getTuple(name);
			if (_.isSafeInteger(variable.value)) { return variable.value as number; }
			throw new InvalidOperationError(`Variable '${name}' is not integer.`);
		}

		public getNumber(name: string) {
			const variable = this.getTuple(name);
			if (_.isNumber(variable.value)) { return variable.value; }
			throw new InvalidOperationError(`Variable '${name}' is not number.`);
		}

		public getObject(name: string) {
			const variable = this.getTuple(name);
			if (_.isObject(variable.value)) { return variable.value; }
			throw new InvalidOperationError(`Variable '${name}' is not object.`);
		}

		public getString = (name: string) => {
			const variable = this.getTuple(name);
			if (_.isString(variable.value)) { return variable.value; }
			throw new InvalidOperationError(`Variable '${name}' is not string.`);
		}

		public has(name: string) {
			let variable = this._stack.findVariable(name);
			return !!variable;
		}

		public set(name: string, value: any) {
			const variable = this.getTuple(name);
			variable.value = value;
		}
	}
}
