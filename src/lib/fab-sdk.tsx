/**
 * @/lib/fab-sdk — the CLIENT SDK (the bridge with the control-plane). It is PROVIDED by the platform and is NOT editable by the app:
 * the data (collection), the auth (useAuth/FabProvider), the runtime AI (invokeLLM/generateImage/extractData), notifications,
 * integrations, uploads, realtime (useLive), billing (useSubscribe/useQuota…), orgs, push, admin.
 *
 * The BOUNDARY of the "app-owned" model (the Base44 pivot): the SDK lives here (provided, stable); the UI COMPONENTS/pieces
 * (Chat, SlotPicker, Rating, PdfReader, the auth screens, RichText, the gating…) become editable APP CODE (seeded in
 * `src/components/*`). The components import the SDK from here. The `@/lib/fab-client` remains as a compatibility facade.
 *
 * ⚠️ `ApiError` is a CLASS, so it is a VALUE export (the screens write `e instanceof ApiError`). It sat in the
 * `export type` list until 2026-09-24, where the build erases it, and every app that imported it from here failed with
 * "ApiError is not exported by src/lib/fab-sdk.tsx" (6 of 98 GPT-6 Luna builds that day). QA passed it, since the
 * name IS exported, and the repair could not fix it, since this file is provided. No comments INSIDE the braces
 * below: `qa.parse_template_reexports` reads them as export names.
 */
export {
  fabConfig,
  collection, uploadFile,
  useAuth, useLocale, useSeo, FabHead, FabProvider,
  invokeLLM, generateImage, extractData, extractDocument, getExtraction, cancelExtraction,
  notify, sendPush, integrations, callConnector, google, googleCall,
  computeRoute, straightLineDistanceKm,
  admin, oauthStartUrl, trackEvent,
  videoSource,
  Logo,
  useLive, useNotifications,
  useEntitlement, useCheckout, useSubscribe, useInstallments, useQuota, restorePurchases,
  RequireAuth, GuestOnly, useReturnTo,
  SubscribeGate, SubscribeUnavailable,
  createOrg, joinOrgByCode, useSpace,
  pushSupported, enablePush, disablePush, usePush,
  ApiError,
} from "./fab-client";

export type {
  Row, RowLike, AppUser, ListOptions, InvokeResult, ExtractionJob, ExtractionPage,
  LiveOptions, LiveState, QuotaState, Notification, InstallmentOption,
  OrgRef, SpaceValue, PushState, PushSendResult, PayMethod, Invite, IntegrationProvider,
  RoutePoint, TravelMode, RouteResult, RecordVersion, HistoryPage,
} from "./fab-client";
