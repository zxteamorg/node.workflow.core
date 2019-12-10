import { Activity } from "../activities/Activity";
import { NativeActivity } from "../activities/NativeActivity";

export function activityRecursiveWalker(activity: Activity, callback: (walk: Activity) => void): void {
	callback(activity);
	if (activity instanceof NativeActivity) {
		for (const childActivity of activity.children) {
			activityRecursiveWalker(childActivity, callback);
		}
	}
}
