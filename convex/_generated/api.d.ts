/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analyses from "../analyses.js";
import type * as auth from "../auth.js";
import type * as authRelay from "../authRelay.js";
import type * as chat from "../chat.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as notes from "../notes.js";
import type * as savedReports from "../savedReports.js";
import type * as settings from "../settings.js";
import type * as userActivity from "../userActivity.js";
import type * as userCredits from "../userCredits.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analyses: typeof analyses;
  auth: typeof auth;
  authRelay: typeof authRelay;
  chat: typeof chat;
  crons: typeof crons;
  documents: typeof documents;
  http: typeof http;
  notes: typeof notes;
  savedReports: typeof savedReports;
  settings: typeof settings;
  userActivity: typeof userActivity;
  userCredits: typeof userCredits;
  userSettings: typeof userSettings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
