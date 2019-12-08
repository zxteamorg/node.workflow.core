import { Activity } from "../activities/Activity";
import { InvalidOperationError } from "@zxteam/errors";

const activitiesMapSymbol = Symbol.for("6bfe3dff-3d25-4709-b8f9-2c50478d6764");
const G: any = global || window || {};
if (!(activitiesMapSymbol in G)) {
	G[activitiesMapSymbol] = Object.freeze({ byId: new Map(), byCtor: new Map() });
}

export function getActivityConstructor(activityUUID: string): Activity.Constructor {
	const activityConstructor = G[activitiesMapSymbol].byId.get(activityUUID);
	if (activityConstructor === undefined) {
		throw new InvalidOperationError(`Wrong operation. An activityUUID: '${activityUUID}' is not registered.`);
	}
	return activityConstructor;
}

export function getActivityUUID(activityConstructor: Activity.Constructor): string {
	const activityUUID = G[activitiesMapSymbol].byCtor.get(activityConstructor);
	if (activityUUID === undefined) {
		throw new InvalidOperationError(`Wrong operation. An activity constructor '${activityConstructor.name}' is not registered.`);
	}
	return activityUUID;
}


export function registerActivity(activityUUID: string, activityConstructor: Activity.Constructor): void {
	if (G[activitiesMapSymbol].byId.has(activityUUID)) {
		throw new InvalidOperationError(`Wrong operation. An activityUUID: '${activityUUID}' already registered. Duplicate?`);
	}

	G[activitiesMapSymbol].byId.set(activityUUID, activityConstructor);
	G[activitiesMapSymbol].byCtor.set(activityConstructor, activityUUID);
}
