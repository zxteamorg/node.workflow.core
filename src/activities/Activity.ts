import "reflect-metadata";
import * as _ from "lodash";

import * as meta from "../internal/meta";

export abstract class Activity {
}

export namespace Activity {
	export function Id(activityUUID: string): ClassDecorator {
		function decorator(target: Function): void {
			//
			meta.registerActivity(activityUUID, target as Activity.Constructor);
		}
		return decorator;
	}

	export type Constructor = <T extends Activity>(...children: ReadonlyArray<Activity>) => T;
}
