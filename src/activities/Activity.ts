import "reflect-metadata";
import * as _ from "lodash";

import * as meta from "../internal/meta";

export abstract class Activity {
	public readonly opts: Activity.Opts;

	public constructor(opts: Activity.Opts) {
		this.opts = opts;
	}
}

export namespace Activity {
	/**
	 * Activity'es options.
	 * Should be serializable.
	 */
	export interface Opts {
		readonly [name: string]: any;
	}

	export function Id(activityUUID: string): ClassDecorator {
		function decorator(target: Function): void {
			//
			meta.registerActivity(activityUUID, target as Activity.Constructor);
		}
		return decorator;
	}

	export type Constructor = <T extends Activity>(opts: Activity.Opts, ...children: ReadonlyArray<Activity>) => T;
}
