// export function extendContext<T, TExtend>(context: T, extend: TExtend): T & TExtend {
// 	const wrap: any = {};

// 	Object.keys(context).forEach(key => {
// 		const value = (context as any)[key];
// 		if (typeof value === "function") {
// 			wrap[key] = value.bind(context);
// 		} else {
// 			Object.defineProperty(wrap, key, {
// 				get() {
// 					return (context as any)[key];
// 				},
// 				set(v: any) {
// 					(context as any)[key] = v;
// 				}
// 			});
// 		}
// 	});
// 	Object.getOwnPropertySymbols(context).forEach(sym => {
// 		const value = (context as any)[sym];
// 		if (typeof value === "function") {
// 			wrap[sym] = value.bind(context);
// 		} else {
// 			Object.defineProperty(wrap, sym, {
// 				get() {
// 					return (context as any)[sym];
// 				},
// 				set(v: any) {
// 					(context as any)[sym] = v;
// 				}
// 			});
// 		}
// 	});

// 	Object.keys(extend).forEach(key => {
// 		const value = (extend as any)[key];
// 		if (typeof value === "function") {
// 			wrap[key] = value.bind(extend);
// 		} else {
// 			Object.defineProperty(wrap, key, {
// 				get() {
// 					return (extend as any)[key];
// 				},
// 				set(v: any) {
// 					(extend as any)[key] = v;
// 				}
// 			});
// 		}
// 	});
// 	Object.getOwnPropertySymbols(extend).forEach(sym => {
// 		const value = (extend as any)[sym];
// 		if (typeof value === "function") {
// 			wrap[sym] = value.bind(extend);
// 		} else {
// 			Object.defineProperty(wrap, sym, {
// 				get() {
// 					return (extend as any)[sym];
// 				},
// 				set(v: any) {
// 					(extend as any)[sym] = v;
// 				}
// 			});
// 		}
// 	});

// 	return wrap;
// }
