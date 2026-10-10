# messageHandler function size map

Archivo: `lib/handlers/messageHandler.ts`
Líneas totales: 13298
Declaraciones detectadas: 343

> Scan estático readonly. Los rangos son aproximados y dependen de llaves `{}`.

---

## 1. Funciones clave

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `buildReservationCanonicalState` | L2556-L2608 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `resolveReservationReference` | L3237-L3345 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `detectDominantTurnDomain` | L3578-L3637 | 60 | `function detectDominantTurnDomain(` |
| `getReservationDomainLockSignal` | L3910-L3945 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `shouldUseReservationLocalFallback` | L4082-L4133 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L4135-L4270 | 136 | `function buildReservationLocalFallbackReply(` |
| `assessReservationDateCoherence` | L4272-L4285 | 14 | `function assessReservationDateCoherence(` |
| `tryStructuredAnalyze` | L4764-L4891 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `preLLM` | L4954-L5166 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `bodyLLM` | L5825-L12434 | 6610 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `posLLM` | L12929-L12970 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L12974-L13298 | 325 | `export async function handleIncomingMessage(` |

---

## 2. Declaraciones más grandes

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `bodyLLM` | L5825-L12434 | 6610 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `preLLM` | L4954-L5166 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `tryBodyLLMKnowledgeShortcuts` | L5436-L5646 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationLocalFallbackReply` | L4135-L4270 | 136 | `function buildReservationLocalFallbackReply(` |
| `tryStructuredAnalyze` | L4764-L4891 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `resolveReservationReference` | L3237-L3345 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `applyExplicitConversationalActorToGuest` | L305-L411 | 107 | `async function applyExplicitConversationalActorToGuest(` |
| `runBodyLLMGraphPath` | L5648-L5752 | 105 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `tryConversationalGuestNameCapture` | L5342-L5434 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationListAnswer` | L2775-L2862 | 88 | `function buildReservationListAnswer(` |
| `getObjectiveContext` | L978-L1063 | 86 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `buildModifyPreviewReply` | L1336-L1409 | 74 | `function buildModifyPreviewReply(` |
| `jidFromGuest` | L9795-L9863 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `executeModifyReservationWithSnapshot` | L2334-L2401 | 68 | `async function executeModifyReservationWithSnapshot(` |
| `jidFromGuest` | L9674-L9741 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L9796-L9863 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `jidFromConv` | L9675-L9741 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `buildReservationSnapshotAnswer` | L508-L570 | 63 | `function buildReservationSnapshotAnswer(` |
| `buildDeterministicBillingReply` | L12555-L12617 | 63 | `async function buildDeterministicBillingReply(` |
| `detectDominantTurnDomain` | L3578-L3637 | 60 | `function detectDominantTurnDomain(` |
| `validateCreateDraftConsistency` | L1743-L1800 | 58 | `function validateCreateDraftConsistency(` |
| `resolveReservationListSource` | L2899-L2956 | 58 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildModifyOptionsMenu` | L12768-L12823 | 56 | `function buildModifyOptionsMenu(` |
| `buildFocusContinuationPrompt` | L2022-L2075 | 54 | `function buildFocusContinuationPrompt(` |
| `buildReservationCanonicalState` | L2556-L2608 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `buildReservationReferenceCandidates` | L3003-L3055 | 53 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `harmonizeBillingCurrencyAnswer` | L12487-L12539 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `shouldUseReservationLocalFallback` | L4082-L4133 | 52 | `function shouldUseReservationLocalFallback(` |
| `resolveFarewellResponseLanguage` | L624-L674 | 51 | `function resolveFarewellResponseLanguage(pre: {` |
| `buildPureCreateLateralFailsafeReply` | L2140-L2190 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistModifyPreviewContext` | L1484-L1532 | 49 | `async function persistModifyPreviewContext(` |
| `buildModifySuccessReply` | L2285-L2332 | 48 | `function buildModifySuccessReply(lang: "es" \| "en" \| "pt", updated: Reservation): string {` |
| `extractRawOrderedDateRange` | L4287-L4329 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `posLLM` | L12929-L12970 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `extractModifyAvailabilitySupplementalLines` | L1534-L1574 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `extractExplicitConversationalActorName` | L243-L282 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `tryBodyLLMStructuredEnrichment` | L5754-L5791 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `detectReservationSnapshotQuery` | L470-L506 | 37 | `function detectReservationSnapshotQuery(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L936-L972 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `anchorCreateDayRangeToDraft` | L4331-L4367 | 37 | `function anchorCreateDayRangeToDraft(` |

---

## 3. Todas las declaraciones detectadas

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `getWaPhoneMetrics` | L96-L96 | 1 | `export function getWaPhoneMetrics() { return { ...waPhoneMetrics }; }` |
| `resetWaPhoneMetrics` | L97-L97 | 1 | `export function resetWaPhoneMetrics() { waPhoneMetrics.invalidAttempts = 0; waPhoneMetrics.accepted = 0; }` |
| `normalizeWA` | L99-L110 | 12 | `function normalizeWA(raw: string): { normalized?: string; reason?: string } {` |
| `isPastReservationCheckInISO` | L112-L119 | 8 | `function isPastReservationCheckInISO(iso?: string) {` |
| `isPastReservationDateISO` | L121-L128 | 8 | `function isPastReservationDateISO(iso?: string) {` |
| `askedToConfirmReservation` | L130-L134 | 5 | `function askedToConfirmReservation(lcHistory: (HumanMessage \| AIMessage)[]): boolean {` |
| `isVerifyAvailabilityPrompt` | L136-L140 | 5 | `function isVerifyAvailabilityPrompt(text: string): boolean {` |
| `buildPastReservationCheckInPrompt` | L142-L147 | 6 | `function buildPastReservationCheckInPrompt(lang: string, iso?: string) {` |
| `isSafeCreateTemporalLeadGuestNameCandidate` | L167-L190 | 24 | `function isSafeCreateTemporalLeadGuestNameCandidate(candidate: string): boolean {` |
| `extractSafeCreateTemporalLeadGuestName` | L192-L201 | 10 | `function extractSafeCreateTemporalLeadGuestName(text: string): string \| undefined {` |
| `isSafeConversationalActorName` | L206-L215 | 10 | `function isSafeConversationalActorName(candidate: string): boolean {` |
| `sanitizeInlineConversationalActorCandidate` | L217-L225 | 9 | `function sanitizeInlineConversationalActorCandidate(candidate: string): string \| undefined {` |
| `extractInlineConversationalActorFromTail` | L227-L241 | 15 | `function extractInlineConversationalActorFromTail(tail: string): string \| undefined {` |
| `extractExplicitConversationalActorName` | L243-L282 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `tryExtractFromStart` | L254-L261 | 8 | `const tryExtractFromStart = (candidateText: string): string \| undefined => {` |
| `extractExplicitGuestIdentityCorrection` | L284-L303 | 20 | `export function extractExplicitGuestIdentityCorrection(text: string): string \| undefined {` |
| `applyExplicitConversationalActorToGuest` | L305-L411 | 107 | `async function applyExplicitConversationalActorToGuest(` |
| `buildAvailabilityGuestContext` | L413-L430 | 18 | `function buildAvailabilityGuestContext(pre: PreLLMResult, rawTurnText: string) {` |
| `isCreateWordDatesTraceCandidate` | L432-L442 | 11 | `function isCreateWordDatesTraceCandidate(text: string): boolean {` |
| `traceCreateWordDates` | L444-L451 | 8 | `function traceCreateWordDates(step: string, payload: Record<string, unknown>) {` |
| `getConfiguredCheckTimes` | L453-L466 | 14 | `function getConfiguredCheckTimes(hotel: any): { checkIn?: string; checkOut?: string } {` |
| `detectReservationSnapshotQuery` | L470-L506 | 37 | `function detectReservationSnapshotQuery(` |
| `buildReservationSnapshotAnswer` | L508-L570 | 63 | `function buildReservationSnapshotAnswer(` |
| `normalizeRuntimeLanguage` | L572-L579 | 8 | `function normalizeRuntimeLanguage(value: unknown): "es" \| "en" \| "pt" \| null {` |
| `inferRuntimeLanguageFromText` | L581-L611 | 31 | `function inferRuntimeLanguageFromText(text: string): "es" \| "en" \| "pt" \| null {` |
| `bump` | L592-L596 | 5 | `const bump = (lang: "es" \| "en" \| "pt", patterns: RegExp[]) => {` |
| `ranked` | L608-L613 | 6 | `const ranked = (Object.keys(scores) as Array<"es" \| "en" \| "pt">)` |
| `isLowSignalLanguageMessage` | L613-L622 | 10 | `function isLowSignalLanguageMessage(text: string): boolean {` |
| `resolveFarewellResponseLanguage` | L624-L674 | 51 | `function resolveFarewellResponseLanguage(pre: {` |
| `ranked` | L667-L671 | 5 | `const ranked = (Object.keys(historyScores) as Array<"es" \| "en" \| "pt">)` |
| `resolveReservationSnapshotLanguage` | L676-L686 | 11 | `function resolveReservationSnapshotLanguage(pre: {` |
| `resolveReservationConversationLanguage` | L688-L694 | 7 | `function resolveReservationConversationLanguage(pre: {` |
| `combineModes` | L755-L757 | 3 | `function combineModes(a?: ChannelMode, b?: ChannelMode): ChannelMode {` |
| `isSafeAutosendCategory` | L759-L762 | 4 | `function isSafeAutosendCategory(cat?: string \| null): boolean {` |
| `applyConversationalProposalVocative` | L764-L779 | 16 | `function applyConversationalProposalVocative(` |
| `buildConversationalGreetingNamePrompt` | L786-L802 | 17 | `function buildConversationalGreetingNamePrompt(` |
| `buildConversationalGreetingKnownGuest` | L804-L808 | 5 | `function buildConversationalGreetingKnownGuest(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameCapturedReply` | L810-L824 | 15 | `function buildConversationalNameCapturedReply(` |
| `buildConversationalNameCorrectedReply` | L826-L830 | 5 | `function buildConversationalNameCorrectedReply(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameDeclinedReply` | L832-L836 | 5 | `function buildConversationalNameDeclinedReply(lang: "es" \| "en" \| "pt"): string {` |
| `wasConversationalNameRequested` | L838-L844 | 7 | `function wasConversationalNameRequested(` |
| `hasRecentConversationalNameHandshake` | L846-L858 | 13 | `function hasRecentConversationalNameHandshake(` |
| `isConversationalNameDecline` | L860-L862 | 3 | `function isConversationalNameDecline(text: string): boolean {` |
| `isPureConversationalGreeting` | L864-L868 | 5 | `function isPureConversationalGreeting(text: string): boolean {` |
| `hasPriorConversationTurns` | L870-L877 | 8 | `function hasPriorConversationTurns(lcHistory: (HumanMessage \| AIMessage)[], currentUserText: string): boolean {` |
| `deriveClassifierSource` | L901-L907 | 7 | `function deriveClassifierSource(graphResult: any): RoutingDecisionLog["classifier_source"] {` |
| `emitRoutingDecision` | L909-L919 | 11 | `function emitRoutingDecision(` |
| `emitStableIntentRouting` | L921-L931 | 11 | `function emitStableIntentRouting(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L936-L972 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `setUsePrePosLLM` | L976-L976 | 1 | `export function setUsePrePosLLM(val: boolean) { USE_PRELLM_POSLLM = val; }` |
| `getObjectiveContext` | L978-L1063 | 86 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `lang` | L1031-L1048 | 18 | `const lang = (` |
| `safeNowISO` | L1064-L1064 | 1 | `function safeNowISO() { return new Date().toISOString(); }` |
| `getHotelConfigSafe` | L1066-L1072 | 7 | `async function getHotelConfigSafe(hotelId: string) {` |
| `computeInModifyMode` | L1074-L1086 | 13 | `function computeInModifyMode(` |
| `wantsAdditionalReservation` | L1088-L1111 | 24 | `function wantsAdditionalReservation(` |
| `mergeReservationHistory` | L1113-L1120 | 8 | `function mergeReservationHistory(` |
| `buildPersistedReservationRecord` | L1122-L1140 | 19 | `function buildPersistedReservationRecord(` |
| `buildDraftReservationContext` | L1142-L1150 | 9 | `function buildDraftReservationContext(` |
| `buildFocusedReservationContext` | L1152-L1162 | 11 | `function buildFocusedReservationContext(` |
| `buildSelectedReservationTarget` | L1164-L1178 | 15 | `function buildSelectedReservationTarget(` |
| `buildSelectedReservationTargetFromReference` | L1180-L1187 | 8 | `function buildSelectedReservationTargetFromReference(` |
| `normalizeModifyFieldQueue` | L1191-L1198 | 8 | `function normalizeModifyFieldQueue(fields: Array<ModifyField \| null \| undefined \| false>): ModifyField[] {` |
| `getNextQueuedModifyState` | L1200-L1204 | 5 | `function getNextQueuedModifyState(modifyState?: ModifyState \| null): ModifyState \| null {` |
| `resolveRequestedModifyFieldsInOrder` | L1206-L1262 | 57 | `function resolveRequestedModifyFieldsInOrder(` |
| `pushEarliestPhrase` | L1212-L1219 | 8 | `const pushEarliestPhrase = (field: ModifyField, phrases: string[]) => {` |
| `buildModifyState` | L1264-L1271 | 8 | `function buildModifyState(activeField: ModifyState["activeField"], pendingFields: ModifyField[] = []): ModifyState \| null {` |
| `buildModifyPreviewState` | L1273-L1281 | 9 | `function buildModifyPreviewState(` |
| `buildModifyPreviewPatch` | L1283-L1297 | 15 | `function buildModifyPreviewPatch(` |
| `applyModifyPreviewPatch` | L1299-L1312 | 14 | `function applyModifyPreviewPatch(` |
| `hydrateModifyPreviewTarget` | L1314-L1334 | 21 | `function hydrateModifyPreviewTarget(` |
| `buildModifyPreviewReply` | L1336-L1409 | 74 | `function buildModifyPreviewReply(` |
| `buildModifyPreviewReminder` | L1411-L1417 | 7 | `function buildModifyPreviewReminder(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyPreviewRejectedReply` | L1419-L1425 | 7 | `function buildModifyPreviewRejectedReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyInactiveTargetReply` | L1427-L1433 | 7 | `function buildModifyInactiveTargetReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildCancelInactiveTargetReply` | L1435-L1441 | 7 | `function buildCancelInactiveTargetReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyReservationCodeNotFoundReply` | L1443-L1449 | 7 | `function buildModifyReservationCodeNotFoundReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyMissingPatchReply` | L1451-L1457 | 7 | `function buildModifyMissingPatchReply(lang: "es" \| "en" \| "pt"): string {` |
| `validateModifySnapshot` | L1459-L1482 | 24 | `function validateModifySnapshot(` |
| `persistModifyPreviewContext` | L1484-L1532 | 49 | `async function persistModifyPreviewContext(` |
| `extractModifyAvailabilitySupplementalLines` | L1534-L1574 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `buildModifyDatesPreviewWithAvailability` | L1576-L1590 | 15 | `async function buildModifyDatesPreviewWithAvailability(` |
| `resolveCurrentModifyPreviewTarget` | L1592-L1602 | 11 | `function resolveCurrentModifyPreviewTarget(pre: PreLLMResult): ReservationReferenceTarget \| null {` |
| `buildConversationFocus` | L1604-L1611 | 8 | `function buildConversationFocus(subFlow: ConversationFocus["subFlow"]): ConversationFocus {` |
| `getConversationFocus` | L1613-L1632 | 20 | `function getConversationFocus(state?: Partial<{` |
| `shouldSwitchFlow` | L1634-L1639 | 6 | `function shouldSwitchFlow(` |
| `buildModifyFieldPrompt` | L1641-L1655 | 15 | `function buildModifyFieldPrompt(lang: "es" \| "en" \| "pt", activeField: ModifyState["activeField"]): string {` |
| `getNextCreateFlowMissingField` | L1667-L1674 | 8 | `function getNextCreateFlowMissingField(slots: ReservationSlotsStrict): CreateFlowMissingField {` |
| `getCreateFlowMissingFields` | L1676-L1684 | 9 | `function getCreateFlowMissingFields(slots: ReservationSlotsStrict): CreateFlowMissingField[] {` |
| `buildCreateFlowPrompt` | L1686-L1706 | 21 | `function buildCreateFlowPrompt(` |
| `buildCreateDraftCapacityReply` | L1708-L1741 | 34 | `function buildCreateDraftCapacityReply(` |
| `validateCreateDraftConsistency` | L1743-L1800 | 58 | `function validateCreateDraftConsistency(` |
| `getNextAvailabilityInquiryMissingField` | L1804-L1809 | 6 | `function getNextAvailabilityInquiryMissingField(slots: ReservationSlotsStrict): AvailabilityInquiryMissingField {` |
| `buildAvailabilityInquiryPrompt` | L1811-L1823 | 13 | `function buildAvailabilityInquiryPrompt(` |
| `isExplicitCreateReservationIntent` | L1825-L1833 | 9 | `function isExplicitCreateReservationIntent(text: string): boolean {` |
| `normalizeAvailabilityInquiryText` | L1835-L1840 | 6 | `function normalizeAvailabilityInquiryText(text: string): string {` |
| `isAvailabilityInquiryIntent` | L1842-L1855 | 14 | `function isAvailabilityInquiryIntent(text: string): boolean {` |
| `isExplicitPureAvailabilityInquiryIntent` | L1857-L1862 | 6 | `function isExplicitPureAvailabilityInquiryIntent(text: string): boolean {` |
| `isAvailabilityInquiryActive` | L1864-L1867 | 4 | `function isAvailabilityInquiryActive(pre: Pick<PreLLMResult, "st" \| "prevCategory">): boolean {` |
| `buildAvailabilityInquiryFollowup` | L1869-L1875 | 7 | `function buildAvailabilityInquiryFollowup(lang: "es" \| "en" \| "pt"): string {` |
| `buildAvailabilityInquiryCreateClarification` | L1877-L1883 | 7 | `function buildAvailabilityInquiryCreateClarification(lang: "es" \| "en" \| "pt"): string {` |
| `offeredAvailabilityInquiryCreateFollowup` | L1885-L1904 | 20 | `function offeredAvailabilityInquiryCreateFollowup(` |
| `isAvailabilityInquiryCreateAdvanceIntent` | L1906-L1920 | 15 | `function isAvailabilityInquiryCreateAdvanceIntent(` |
| `shouldStartCreateFromAvailabilityInquiry` | L1922-L1929 | 8 | `function shouldStartCreateFromAvailabilityInquiry(` |
| `isAvailabilityInquiryAmbiguousAdvanceReply` | L1931-L1948 | 18 | `function isAvailabilityInquiryAmbiguousAdvanceReply(` |
| `persistAvailabilityInquiry` | L1950-L1970 | 21 | `async function persistAvailabilityInquiry(` |
| `isCreateStateReadyForQuote` | L1972-L1980 | 9 | `function isCreateStateReadyForQuote(slots: ReservationSlotsStrict): boolean {` |
| `resolveReservationFastPathSubFlow` | L1982-L2004 | 23 | `function resolveReservationFastPathSubFlow(pre: PreLLMResult, userText?: string): "create" \| "modify" {` |
| `shouldAppendFocusContinuation` | L2006-L2020 | 15 | `function shouldAppendFocusContinuation(` |
| `buildFocusContinuationPrompt` | L2022-L2075 | 54 | `function buildFocusContinuationPrompt(` |
| `menuSlots` | L2053-L2061 | 9 | `const menuSlots = (canonicalRecord` |
| `persistCreateLateralCategoryIfNeeded` | L2077-L2106 | 30 | `async function persistCreateLateralCategoryIfNeeded(` |
| `isCreateContextActive` | L2108-L2117 | 10 | `function isCreateContextActive(pre: PreLLMResult): boolean {` |
| `isPureLateralTurnWhileCreateActive` | L2119-L2138 | 20 | `function isPureLateralTurnWhileCreateActive(` |
| `buildPureCreateLateralFailsafeReply` | L2140-L2190 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistCreateDraft` | L2192-L2211 | 20 | `async function persistCreateDraft(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `persistCreateDraftSnapshot` | L2213-L2231 | 19 | `async function persistCreateDraftSnapshot(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `isModifyExecutionActive` | L2233-L2242 | 10 | `function isModifyExecutionActive(pre: PreLLMResult): boolean {` |
| `getModifyExecutionReservationId` | L2244-L2259 | 16 | `function getModifyExecutionReservationId(` |
| `persistModifyExecutionContext` | L2261-L2277 | 17 | `async function persistModifyExecutionContext(` |
| `buildInvalidUpdatedReservationReply` | L2279-L2283 | 5 | `function buildInvalidUpdatedReservationReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifySuccessReply` | L2285-L2332 | 48 | `function buildModifySuccessReply(lang: "es" \| "en" \| "pt", updated: Reservation): string {` |
| `executeModifyReservationWithSnapshot` | L2334-L2401 | 68 | `async function executeModifyReservationWithSnapshot(` |
| `getRecentModifyRoomTypeCandidate` | L2403-L2413 | 11 | `function getRecentModifyRoomTypeCandidate(` |
| `shouldPersistCreateAvailabilityVerification` | L2415-L2430 | 16 | `function shouldPersistCreateAvailabilityVerification(` |
| `resolveAuthoritativeNumGuests` | L2444-L2451 | 8 | `function resolveAuthoritativeNumGuests(` |
| `normalizeReferenceText` | L2466-L2471 | 6 | `function normalizeReferenceText(text: string): string {` |
| `toISODateOffset` | L2473-L2478 | 6 | `function toISODateOffset(days: number): string {` |
| `getEffectiveActiveReservationContext` | L2480-L2501 | 22 | `function getEffectiveActiveReservationContext(state: any): ActiveReservationContext \| undefined {` |
| `hasCanonicalConfirmedReservationContext` | L2503-L2509 | 7 | `function hasCanonicalConfirmedReservationContext(state: any): boolean {` |
| `hasDominantDraftProposalContext` | L2511-L2513 | 3 | `function hasDominantDraftProposalContext(state: any): boolean {` |
| `normalizeCanonicalReservationStatus` | L2515-L2520 | 6 | `function normalizeCanonicalReservationStatus(status: string \| null \| undefined): CanonicalReservationRecord["canonicalStatus"] {` |
| `hasMaterializedReservationPayload` | L2522-L2531 | 10 | `function hasMaterializedReservationPayload(item: any): boolean {` |
| `isCanonicalReservationRecordEligible` | L2533-L2538 | 6 | `function isCanonicalReservationRecordEligible(item: any): boolean {` |
| `historyContainsReservationId` | L2540-L2546 | 7 | `function historyContainsReservationId(` |
| `shouldPreserveLastReservationRecord` | L2548-L2554 | 7 | `function shouldPreserveLastReservationRecord(` |
| `buildReservationCanonicalState` | L2556-L2608 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `mergeSameReservation` | L2564-L2574 | 11 | `const mergeSameReservation = (base: CanonicalReservationRecord, preferred: CanonicalReservationRecord) => ({` |
| `buildCanonicalReservationRecords` | L2610-L2612 | 3 | `function buildCanonicalReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `buildPresentedReservationRecords` | L2614-L2626 | 13 | `function buildPresentedReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `collectPersistedReservationRecords` | L2628-L2633 | 6 | `function collectPersistedReservationRecords(state: any): LastReservation[] {` |
| `getMergedIntoGuestId` | L2635-L2640 | 6 | `function getMergedIntoGuestId(guest: { tags?: unknown } \| null \| undefined): string \| undefined {` |
| `getCanonicalReservationRecordById` | L2642-L2648 | 7 | `function getCanonicalReservationRecordById(` |
| `buildCanonicalReservationTarget` | L2650-L2675 | 26 | `function buildCanonicalReservationTarget(` |
| `resolveConfirmedReservationFollowupSnapshot` | L2677-L2705 | 29 | `function resolveConfirmedReservationFollowupSnapshot(` |
| `getHotelToday` | L2709-L2725 | 17 | `function getHotelToday(timezone?: string, now = new Date()): string {` |
| `normalizeReservationCalendarDate` | L2727-L2735 | 9 | `function normalizeReservationCalendarDate(value?: string): string \| undefined {` |
| `getReservationTemporalRelation` | L2737-L2747 | 11 | `function getReservationTemporalRelation(` |
| `orderReservationsForTemporalPresentation` | L2749-L2773 | 25 | `function orderReservationsForTemporalPresentation(` |
| `buildReservationListAnswer` | L2775-L2862 | 88 | `function buildReservationListAnswer(` |
| `safeFindGuestByAnyId` | L2864-L2872 | 9 | `async function safeFindGuestByAnyId(hotelId: string, rawId: string) {` |
| `presentedReservationScopeMatchesCanonicalGuest` | L2874-L2884 | 11 | `async function presentedReservationScopeMatchesCanonicalGuest(` |
| `safeGetConversationsByGuestId` | L2886-L2897 | 12 | `async function safeGetConversationsByGuestId(input: {` |
| `resolveReservationListSource` | L2899-L2956 | 58 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildLastPresentedReservations` | L2958-L2979 | 22 | `function buildLastPresentedReservations(source: {` |
| `getConfirmedGuestReservationCandidates` | L2981-L2985 | 5 | `function getConfirmedGuestReservationCandidates(reservations: CanonicalReservationRecord[]) {` |
| `buildGuestReservationAmbiguityReply` | L2987-L3001 | 15 | `function buildGuestReservationAmbiguityReply(` |
| `buildReservationReferenceCandidates` | L3003-L3055 | 53 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildOrderedReservationHistoryCandidates` | L3057-L3072 | 16 | `function buildOrderedReservationHistoryCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildActionableReservationCandidates` | L3074-L3086 | 13 | `function buildActionableReservationCandidates(state: any): ReservationReferenceTarget[] {` |
| `resolveSingleActionableReservationTarget` | L3088-L3091 | 4 | `function resolveSingleActionableReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `extractReservationOrdinalReferenceSpec` | L3093-L3100 | 8 | `function extractReservationOrdinalReferenceSpec(text: string): ReservationOrdinalReference \| null {` |
| `extractReservationOrdinalReference` | L3102-L3105 | 4 | `function extractReservationOrdinalReference(text: string): "first" \| "second" \| "third" \| "fourth" \| "last" \| null {` |
| `validateOrdinalReservationReference` | L3107-L3128 | 22 | `function validateOrdinalReservationReference(` |
| `resolveValidatedOrdinalReservationTarget` | L3130-L3136 | 7 | `function resolveValidatedOrdinalReservationTarget(` |
| `buildOutOfRangeReservationReferenceReply` | L3138-L3159 | 22 | `function buildOutOfRangeReservationReferenceReply(` |
| `buildReservationReferenceGuardReply` | L3161-L3169 | 9 | `function buildReservationReferenceGuardReply(` |
| `buildAmbiguousReservationSelectionReply` | L3171-L3189 | 19 | `function buildAmbiguousReservationSelectionReply(` |
| `getAmbiguousReservationAction` | L3191-L3218 | 28 | `function getAmbiguousReservationAction(` |
| `resolveExplicitOrdinalReservationTarget` | L3220-L3222 | 3 | `function resolveExplicitOrdinalReservationTarget(state: any, userText: string): ReservationReferenceTarget \| null {` |
| `getReservationReferenceTargetById` | L3224-L3229 | 6 | `function getReservationReferenceTargetById(state: any, reservationId?: string \| null): ReservationReferenceTarget \| null {` |
| `resolveSelectedReservationTarget` | L3231-L3235 | 5 | `function resolveSelectedReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `resolveReservationReference` | L3237-L3345 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `buildReservationReferenceClarification` | L3347-L3353 | 7 | `function buildReservationReferenceClarification(lang: "es" \| "en" \| "pt"): string {` |
| `getRecentHistorySafe` | L3355-L3363 | 9 | `async function getRecentHistorySafe(` |
| `toStrictSlots` | L3365-L3374 | 10 | `function toStrictSlots(slots?: DbReservationSlots \| null): ReservationSlotsStrict {` |
| `mergeReservationSlots` | L3376-L3390 | 15 | `function mergeReservationSlots(` |
| `toLC` | L3392-L3397 | 6 | `function toLC(msg: ChannelMessage) {` |
| `getRecentHistory` | L3405-L3435 | 31 | `async function getRecentHistory(` |
| `extractTextFromLCContent` | L3438-L3453 | 16 | `function extractTextFromLCContent(content: any): string {` |
| `extractLastAIText` | L3455-L3466 | 12 | `function extractLastAIText(messages: any[] \| undefined): string {` |
| `emitReply` | L3481-L3488 | 8 | `async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: RichPayload) {` |
| `ruleBasedFallback` | L3491-L3510 | 20 | `function ruleBasedFallback(lang: string, userText: string): string {` |
| `t` | L3492-L3501 | 10 | `const t = (userText \|\| "").toLowerCase();` |
| `detectIntent` | L3513-L3530 | 18 | `export function detectIntent(` |
| `t` | L3517-L3544 | 28 | `const t = (userText \|\| "").toLowerCase();` |
| `mapStructuredIntentToCategory` | L3533-L3557 | 25 | `export function mapStructuredIntentToCategory(` |
| `looksTransactionalPricingIntent` | L3559-L3569 | 11 | `function looksTransactionalPricingIntent(text: string): boolean {` |
| `detectDominantTurnDomain` | L3578-L3637 | 60 | `function detectDominantTurnDomain(` |
| `isExplicitModifyExitTurn` | L3640-L3645 | 6 | `function isExplicitModifyExitTurn(text: string): boolean {` |
| `buildPricingClarificationReply` | L3647-L3666 | 20 | `function buildPricingClarificationReply(` |
| `isRoomTypeFollowupInReservation` | L3668-L3680 | 13 | `function isRoomTypeFollowupInReservation(` |
| `isGuestsFollowupInReservation` | L3682-L3703 | 22 | `function isGuestsFollowupInReservation(` |
| `isGuestNameFollowupInReservation` | L3705-L3715 | 11 | `function isGuestNameFollowupInReservation(` |
| `hasHolderCorrectionIntent` | L3717-L3727 | 11 | `function hasHolderCorrectionIntent(text: string): boolean {` |
| `hasDraftHolderCorrectionIntent` | L3729-L3731 | 3 | `function hasDraftHolderCorrectionIntent(text: string): boolean {` |
| `buildAskDraftHolderName` | L3733-L3739 | 7 | `function buildAskDraftHolderName(lang: "es" \| "en" \| "pt"): string {` |
| `buildConfirmedHolderChangeNotSupportedReply` | L3741-L3747 | 7 | `function buildConfirmedHolderChangeNotSupportedReply(lang: "es" \| "en" \| "pt"): string {` |
| `resolveDraftHolderCandidate` | L3749-L3763 | 15 | `function resolveDraftHolderCandidate(` |
| `hasActiveReservationDomain` | L3765-L3798 | 34 | `function hasActiveReservationDomain(pre: PreLLMResult): boolean {` |
| `isReservationConfirmSignal` | L3800-L3804 | 5 | `function isReservationConfirmSignal(text: string): boolean {` |
| `isStrictCreateProposalConfirmation` | L3806-L3814 | 9 | `function isStrictCreateProposalConfirmation(text: string): boolean {` |
| `isQuotedCreateNegativeReply` | L3816-L3819 | 4 | `function isQuotedCreateNegativeReply(text: string): boolean {` |
| `buildQuotedCreateConfirmClarification` | L3821-L3827 | 7 | `function buildQuotedCreateConfirmClarification(lang: "es" \| "en" \| "pt"): string {` |
| `buildQuotedCreateProposalPausedReply` | L3829-L3835 | 7 | `function buildQuotedCreateProposalPausedReply(lang: "es" \| "en" \| "pt"): string {` |
| `isPendingCreateProposalContext` | L3837-L3854 | 18 | `function isPendingCreateProposalContext(` |
| `hasStrongReservationDomainExitIntent` | L3856-L3863 | 8 | `function hasStrongReservationDomainExitIntent(text: string): boolean {` |
| `isReservationSnapshotFollowupSignal` | L3865-L3880 | 16 | `function isReservationSnapshotFollowupSignal(pre: PreLLMResult, text: string): boolean {` |
| `isReservationModifySubstateSignal` | L3882-L3908 | 27 | `function isReservationModifySubstateSignal(pre: PreLLMResult, text: string): boolean {` |
| `getReservationDomainLockSignal` | L3910-L3945 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `buildReservationDomainLockReply` | L3947-L4068 | 122 | `function buildReservationDomainLockReply(` |
| `knownSlots` | L3973-L3981 | 9 | `const knownSlots = (canonicalRecord` |
| `isReservationFlowStillActive` | L4070-L4080 | 11 | `function isReservationFlowStillActive(pre: PreLLMResult): boolean {` |
| `shouldUseReservationLocalFallback` | L4082-L4133 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L4135-L4270 | 136 | `function buildReservationLocalFallbackReply(` |
| `knownSlots` | L4153-L4161 | 9 | `const knownSlots = (canonicalRecord` |
| `assessReservationDateCoherence` | L4272-L4285 | 14 | `function assessReservationDateCoherence(` |
| `extractRawOrderedDateRange` | L4287-L4329 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `toIso` | L4292-L4298 | 7 | `const toIso = (token: string) => {` |
| `anchorCreateDayRangeToDraft` | L4331-L4367 | 37 | `function anchorCreateDayRangeToDraft(` |
| `hasNumericDateRangeWithoutYear` | L4369-L4373 | 5 | `function hasNumericDateRangeWithoutYear(text: string): boolean {` |
| `extractRelativeWeekendDateRange` | L4375-L4398 | 24 | `function extractRelativeWeekendDateRange(` |
| `extractRelativeWeekdayRange` | L4400-L4436 | 37 | `function extractRelativeWeekdayRange(` |
| `extractRelativeWeekdayDate` | L4438-L4452 | 15 | `function extractRelativeWeekdayDate(` |
| `extractSupportedTemporalDateRange` | L4454-L4467 | 14 | `async function extractSupportedTemporalDateRange(` |
| `detectModifyTemporalSideIntent` | L4469-L4482 | 14 | `function detectModifyTemporalSideIntent(` |
| `buildModifyPartialDateSlots` | L4484-L4504 | 21 | `function buildModifyPartialDateSlots(` |
| `resolveModifyDatesContextualMissingSide` | L4506-L4519 | 14 | `function resolveModifyDatesContextualMissingSide(` |
| `detectShortRelativeWeekday` | L4521-L4538 | 18 | `function detectShortRelativeWeekday(text: string): number \| undefined {` |
| `firstWeekdayStrictlyAfter` | L4540-L4548 | 9 | `function firstWeekdayStrictlyAfter(baseIso: string, weekday: number): string \| undefined {` |
| `firstWeekdayOnOrAfter` | L4550-L4557 | 8 | `function firstWeekdayOnOrAfter(baseIso: string, weekday: number): string \| undefined {` |
| `delta` | L4554-L4561 | 8 | `const delta = (weekday - candidate.getUTCDay() + 7) % 7;` |
| `anchorRelativeWeekdayToCheckOutAfterCheckIn` | L4559-L4574 | 16 | `function anchorRelativeWeekdayToCheckOutAfterCheckIn(` |
| `anchorModifyRelativeDateToContext` | L4576-L4590 | 15 | `function anchorModifyRelativeDateToContext(` |
| `resolveCreateDatesContextualMissingSide` | L4592-L4609 | 18 | `function resolveCreateDatesContextualMissingSide(` |
| `anchorCreateRelativeDateToContext` | L4611-L4646 | 36 | `function anchorCreateRelativeDateToContext(` |
| `anchorAvailabilityInquiryDateToContext` | L4648-L4677 | 30 | `function anchorAvailabilityInquiryDateToContext(` |
| `hasModifyDateCorrectionCue` | L4679-L4683 | 5 | `function hasModifyDateCorrectionCue(text: string): boolean {` |
| `hasModifyDatesEntrySignal` | L4685-L4694 | 10 | `function hasModifyDatesEntrySignal(` |
| `buildInvalidReservationDatesReply` | L4696-L4716 | 21 | `function buildInvalidReservationDatesReply(lang: "es" \| "en" \| "pt", reason: "check_order" \| "range_too_long" \| "invalid_format"): string {` |
| `buildInvalidCreateCalendarDateReply` | L4718-L4728 | 11 | `function buildInvalidCreateCalendarDateReply(` |
| `buildInvalidCreateCheckOutReply` | L4730-L4736 | 7 | `function buildInvalidCreateCheckOutReply(lang: "es" \| "en" \| "pt"): string {` |
| `detectRawReservationDateIssue` | L4738-L4761 | 24 | `function detectRawReservationDateIssue(text: string): { reason: "check_order" \| "range_too_long" \| "invalid_format" } \| null {` |
| `tryStructuredAnalyze` | L4764-L4891 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `preLLM` | L4954-L5166 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `lang` | L5001-L5019 | 19 | `const lang = (` |
| `pref` | L5078-L5086 | 9 | `const pref = (hotelConfig as any)?.nearbyPointsMode;` |
| `hasRecentReservationMention` | L5169-L5176 | 8 | `function hasRecentReservationMention(pre: PreLLMResult): boolean {` |
| `shouldClearSelectedReservationTargetForCategory` | L5178-L5200 | 23 | `function shouldClearSelectedReservationTargetForCategory(` |
| `looksLikeEventsQuery` | L5201-L5204 | 4 | `function looksLikeEventsQuery(text: string): boolean {` |
| `buildStateSummary` | L5205-L5214 | 10 | `function buildStateSummary(slots: ReservationSlotsStrict, st: any) {` |
| `initBodyLLMState` | L5227-L5236 | 10 | `function initBodyLLMState(pre: PreLLMResult): BodyLLMState {` |
| `toBodyLLMResult` | L5238-L5247 | 10 | `function toBodyLLMResult(state: BodyLLMState) {` |
| `isRenderableRoomImageUrl` | L5249-L5252 | 4 | `function isRenderableRoomImageUrl(value: unknown): boolean {` |
| `roomInfoImgBodyHasRenderableImages` | L5254-L5257 | 4 | `function roomInfoImgBodyHasRenderableImages(body: unknown): boolean {` |
| `hotelConfigHasRenderableRoomImages` | L5259-L5269 | 11 | `function hotelConfigHasRenderableRoomImages(hotelConfig: unknown): boolean {` |
| `rooms` | L5260-L5260 | 1 | `const rooms = (hotelConfig as { rooms?: unknown })?.rooms;` |
| `hotelHasRenderableRoomInventoryVisuals` | L5271-L5288 | 18 | `async function hotelHasRenderableRoomInventoryVisuals(pre: PreLLMResult): Promise<boolean> {` |
| `runKbPrecedenceRichPath` | L5290-L5321 | 32 | `async function runKbPrecedenceRichPath(pre: PreLLMResult, promptKey: string): Promise<{` |
| `rbLast` | L5306-L5320 | 15 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5308-L5320 | 13 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMTestGreetingFastpath` | L5323-L5340 | 18 | `function tryBodyLLMTestGreetingFastpath(pre: PreLLMResult, state: BodyLLMState): boolean {` |
| `tryConversationalGuestNameCapture` | L5342-L5434 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `tryBodyLLMKnowledgeShortcuts` | L5436-L5646 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `looksEventIntent` | L5464-L5475 | 12 | `const looksEventIntent = (() => {` |
| `runBodyLLMGraphPath` | L5648-L5752 | 105 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `last` | L5676-L5686 | 11 | `const last = (state.graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L5711-L5721 | 11 | `const resolved = (state.graphResult as any)?.resolved;` |
| `classified` | L5712-L5721 | 10 | `const classified = (state.graphResult as any)?.classified;` |
| `rbLast` | L5735-L5745 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5737-L5745 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMStructuredEnrichment` | L5754-L5791 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `tryBodyLLMStructuredFallback` | L5793-L5822 | 30 | `async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `bodyLLM` | L5825-L12434 | 6610 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `code` | L7362-L7363 | 2 | `const code = (e as any)?.code;` |
| `prevAttempt` | L7385-L7396 | 12 | `const prevAttempt = (pre.st as any)?.lastEmailCopyAttempt;` |
| `toDDMMYYYY` | L7407-L7407 | 1 | `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };` |
| `prevFailures` | L7457-L7468 | 12 | `const prevFailures = (prevAttempt?.failures \|\| 0) + 1;` |
| `quotedTurnDirectWeekdayRange` | L9294-L9303 | 10 | `const quotedTurnDirectWeekdayRange = (() => {` |
| `toDDMMYYYY` | L9545-L9548 | 4 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L9578-L9580 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `toDDMMYYYY` | L9616-L9618 | 3 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L9646-L9648 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `jidFromGuest` | L9674-L9741 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L9675-L9741 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `code` | L9721-L9722 | 2 | `const code = (e as any)?.code;` |
| `code` | L9777-L9778 | 2 | `const code = (e as any)?.code;` |
| `jidFromGuest` | L9795-L9863 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L9796-L9863 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `code` | L9842-L9843 | 2 | `const code = (e as any)?.code;` |
| `code` | L9899-L9900 | 2 | `const code = (e as any)?.code;` |
| `code` | L9956-L9957 | 2 | `const code = (e as any)?.code;` |
| `pendingAvailabilityVerification` | L9984-L9984 | 1 | `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;` |
| `pendingCancellation` | L9999-L9999 | 1 | `const pendingCancellation = (pre.st as any)?.pendingCancellation as { reservationId?: string; awaitingConfirmation?: boolean } \| undefined;` |
| `snapshotSlots` | L10898-L10907 | 10 | `const snapshotSlots = (canonicalSlots` |
| `looksEventIntent` | L10970-L10984 | 15 | `const looksEventIntent = (() => {` |
| `last` | L11279-L11289 | 11 | `const last = (graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L11318-L11328 | 11 | `const resolved = (graphResult as any)?.resolved;` |
| `classified` | L11319-L11328 | 10 | `const classified = (graphResult as any)?.classified;` |
| `rbLast` | L11342-L11352 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L11344-L11352 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `cons` | L11935-L11946 | 12 | `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({` |
| `txt` | L11980-L11982 | 3 | `const txt = (finalText \|\| '').trim();` |
| `toDDMMYYYY` | L11985-L11989 | 5 | `const toDDMMYYYY = (iso?: string) => {` |
| `currentDates` | L12013-L12013 | 1 | `const currentDates = (String(pre.msg.content \|\| '').match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) \|\| []).map(d => d);` |
| `toISO` | L12026-L12028 | 3 | `const toISO = (d: string) => {` |
| `toDDMMYYYY` | L12033-L12033 | 1 | `const toDDMMYYYY = (iso?: string) => iso ? iso.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') : '';` |
| `stripOffTopicAmenitiesTail` | L12436-L12458 | 23 | `function stripOffTopicAmenitiesTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripOffTopicBillingTail` | L12460-L12485 | 26 | `function stripOffTopicBillingTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `harmonizeBillingCurrencyAnswer` | L12487-L12539 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `ensureBillingContextualFollowup` | L12541-L12553 | 13 | `function ensureBillingContextualFollowup(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildDeterministicBillingReply` | L12555-L12617 | 63 | `async function buildDeterministicBillingReply(` |
| `textNorm` | L12570-L12574 | 5 | `const textNorm = (userText \|\| "").toLowerCase();` |
| `applyCommittedHotelTone` | L12619-L12654 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripGlobalTailNoise` | L12656-L12667 | 12 | `function stripGlobalTailNoise(text: string): string {` |
| `buildModifyGuidance` | L12669-L12684 | 16 | `function buildModifyGuidance(` |
| `es` | L12674-L12676 | 3 | `const es = () =>` |
| `en` | L12677-L12679 | 3 | `const en = () =>` |
| `pt` | L12680-L12682 | 3 | `const pt = () =>` |
| `isContactHotelText` | L12686-L12695 | 10 | `function isContactHotelText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L12687-L12703 | 17 | `const t = (text \|\| "").toLowerCase();` |
| `isQuoteOrConfirmText` | L12703-L12711 | 9 | `function isQuoteOrConfirmText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L12704-L12714 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `wantsGenericModify` | L12714-L12731 | 18 | `function wantsGenericModify(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L12715-L12725 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `isExecutableModifyIntent` | L12733-L12740 | 8 | `function isExecutableModifyIntent(` |
| `buildModifyInquiryReply` | L12742-L12766 | 25 | `function buildModifyInquiryReply(lang: "es" \| "en" \| "pt", text: string): string \| null {` |
| `buildModifyOptionsMenu` | L12768-L12823 | 56 | `function buildModifyOptionsMenu(` |
| `buildModifyReservationSelectionIntro` | L12825-L12858 | 34 | `function buildModifyReservationSelectionIntro(` |
| `isGenericFallbackText` | L12862-L12871 | 10 | `function isGenericFallbackText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L12863-L12874 | 12 | `const t = (text \|\| "").toLowerCase();` |
| `parseReservationCode` | L12874-L12883 | 10 | `function parseReservationCode(text: string): string \| undefined {` |
| `extractReservationCodeLikeToken` | L12884-L12887 | 4 | `function extractReservationCodeLikeToken(text: string): string \| undefined {` |
| `buildAskReservationCode` | L12888-L12892 | 5 | `function buildAskReservationCode(lang: "es" \| "en" \| "pt"): string {` |
| `buildReservationCopySummary` | L12896-L12906 | 11 | `function buildReservationCopySummary(pre: PreLLMResult, nextSlots: ReservationSlotsStrict) {` |
| `detectWhatsAppCopyRequest` | L12908-L12926 | 19 | `function detectWhatsAppCopyRequest(pre: PreLLMResult, text: string): { matched: boolean; mode?: 'explicit' \| 'light'; inlinePhone?: string } {` |
| `posLLM` | L12929-L12970 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L12974-L13298 | 325 | `export async function handleIncomingMessage(` |
| `respCategory` | L13179-L13204 | 26 | `const respCategory = (body?.graphResult?.category \|\| body?.nextCategory \|\| pre.prevCategory) as string \| undefined;` |
| `respPromptKey` | L13180-L13204 | 25 | `const respPromptKey = (` |
| `respContentVersion` | L13186-L13204 | 19 | `const respContentVersion = (` |
| `respSource` | L13191-L13204 | 14 | `const respSource = (` |
| `respSalesStage` | L13195-L13204 | 10 | `const respSalesStage = (body?.graphResult?.salesStage \|\| pre.st?.salesStage) as string \| undefined;` |
