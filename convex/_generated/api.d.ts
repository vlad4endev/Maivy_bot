/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAuth from "../adminAuth.js";
import type * as analytics from "../analytics.js";
import type * as botApi from "../botApi.js";
import type * as botUsers from "../botUsers.js";
import type * as bots from "../bots.js";
import type * as buttons from "../buttons.js";
import type * as constructor from "../constructor.js";
import type * as events from "../events.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_mediaPaths from "../lib/mediaPaths.js";
import type * as lib_sectionKeyboard from "../lib/sectionKeyboard.js";
import type * as lib_urls from "../lib/urls.js";
import type * as lib_validators from "../lib/validators.js";
import type * as media from "../media.js";
import type * as sections from "../sections.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAuth: typeof adminAuth;
  analytics: typeof analytics;
  botApi: typeof botApi;
  botUsers: typeof botUsers;
  bots: typeof bots;
  buttons: typeof buttons;
  constructor: typeof constructor;
  events: typeof events;
  "lib/auth": typeof lib_auth;
  "lib/mediaPaths": typeof lib_mediaPaths;
  "lib/sectionKeyboard": typeof lib_sectionKeyboard;
  "lib/urls": typeof lib_urls;
  "lib/validators": typeof lib_validators;
  media: typeof media;
  sections: typeof sections;
  seed: typeof seed;
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
