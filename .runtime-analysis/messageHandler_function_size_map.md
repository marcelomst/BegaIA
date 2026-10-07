# messageHandler function size map

Archivo: `lib/handlers/messageHandler.ts`
current_code_commit: `59c7f39c95eb2ccea2b1ab74b9490449148642b8`
messageHandler_lines: 13204
Declaraciones detectadas: 340

> Scan estático readonly. Los rangos son aproximados y dependen de llaves `{}`.

---

## 1. Funciones clave

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `buildReservationCanonicalState` | L2464-L2514 | 51 | `function buildReservationCanonicalState(state: any): {` |
| `resolveReservationReference` | L3143-L3251 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `detectDominantTurnDomain` | L3484-L3543 | 60 | `function detectDominantTurnDomain(` |
| `getReservationDomainLockSignal` | L3816-L3851 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `shouldUseReservationLocalFallback` | L3988-L4039 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L4041-L4176 | 136 | `function buildReservationLocalFallbackReply(` |
| `assessReservationDateCoherence` | L4178-L4191 | 14 | `function assessReservationDateCoherence(` |
| `tryStructuredAnalyze` | L4670-L4797 | 128 | `async function tryStructuredAnalyze(params: {` |
| `preLLM` | L4860-L5072 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `bodyLLM` | L5731-L12340 | 6610 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `posLLM` | L12835-L12876 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L12880-L13204 | 325 | `export async function handleIncomingMessage(` |

---

## 2. Declaraciones más grandes

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `bodyLLM` | L5731-L12340 | 6610 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `preLLM` | L4860-L5072 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `tryBodyLLMKnowledgeShortcuts` | L5342-L5552 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationLocalFallbackReply` | L4041-L4176 | 136 | `function buildReservationLocalFallbackReply(` |
| `tryStructuredAnalyze` | L4670-L4797 | 128 | `async function tryStructuredAnalyze(params: {` |
| `resolveReservationReference` | L3143-L3251 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `applyExplicitConversationalActorToGuest` | L303-L409 | 107 | `async function applyExplicitConversationalActorToGuest(` |
| `runBodyLLMGraphPath` | L5554-L5658 | 105 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `tryConversationalGuestNameCapture` | L5248-L5340 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationListAnswer` | L2681-L2768 | 88 | `function buildReservationListAnswer(` |
| `getObjectiveContext` | L976-L1061 | 86 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `buildModifyPreviewReply` | L1334-L1407 | 74 | `function buildModifyPreviewReply(` |
| `jidFromGuest` | L9701-L9769 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromGuest` | L9580-L9647 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L9702-L9769 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `jidFromConv` | L9581-L9647 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `buildReservationSnapshotAnswer` | L506-L568 | 63 | `function buildReservationSnapshotAnswer(` |
| `buildDeterministicBillingReply` | L12461-L12523 | 63 | `async function buildDeterministicBillingReply(` |
| `detectDominantTurnDomain` | L3484-L3543 | 60 | `function detectDominantTurnDomain(` |
| `validateCreateDraftConsistency` | L1736-L1793 | 58 | `function validateCreateDraftConsistency(` |
| `resolveReservationListSource` | L2805-L2862 | 58 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildModifyOptionsMenu` | L12674-L12729 | 56 | `function buildModifyOptionsMenu(` |
| `buildFocusContinuationPrompt` | L2015-L2068 | 54 | `function buildFocusContinuationPrompt(` |
| `buildReservationReferenceCandidates` | L2909-L2961 | 53 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `harmonizeBillingCurrencyAnswer` | L12393-L12445 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `shouldUseReservationLocalFallback` | L3988-L4039 | 52 | `function shouldUseReservationLocalFallback(` |
| `resolveFarewellResponseLanguage` | L622-L672 | 51 | `function resolveFarewellResponseLanguage(pre: {` |
| `buildPureCreateLateralFailsafeReply` | L2133-L2183 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `buildReservationCanonicalState` | L2464-L2514 | 51 | `function buildReservationCanonicalState(state: any): {` |
| `executeModifyReservationWithSnapshot` | L2272-L2318 | 47 | `async function executeModifyReservationWithSnapshot(` |
| `persistModifyPreviewContext` | L1482-L1525 | 44 | `async function persistModifyPreviewContext(` |
| `extractRawOrderedDateRange` | L4193-L4235 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `posLLM` | L12835-L12876 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `extractModifyAvailabilitySupplementalLines` | L1527-L1567 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `extractExplicitConversationalActorName` | L241-L280 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `tryBodyLLMStructuredEnrichment` | L5660-L5697 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `detectReservationSnapshotQuery` | L468-L504 | 37 | `function detectReservationSnapshotQuery(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L934-L970 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `anchorCreateDayRangeToDraft` | L4237-L4273 | 37 | `function anchorCreateDayRangeToDraft(` |
| `extractRelativeWeekdayRange` | L4306-L4342 | 37 | `function extractRelativeWeekdayRange(` |

---

## 3. Todas las declaraciones detectadas

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `getWaPhoneMetrics` | L94-L94 | 1 | `export function getWaPhoneMetrics() { return { ...waPhoneMetrics }; }` |
| `resetWaPhoneMetrics` | L95-L95 | 1 | `export function resetWaPhoneMetrics() { waPhoneMetrics.invalidAttempts = 0; waPhoneMetrics.accepted = 0; }` |
| `normalizeWA` | L97-L108 | 12 | `function normalizeWA(raw: string): { normalized?: string; reason?: string } {` |
| `isPastReservationCheckInISO` | L110-L117 | 8 | `function isPastReservationCheckInISO(iso?: string) {` |
| `isPastReservationDateISO` | L119-L126 | 8 | `function isPastReservationDateISO(iso?: string) {` |
| `askedToConfirmReservation` | L128-L132 | 5 | `function askedToConfirmReservation(lcHistory: (HumanMessage \| AIMessage)[]): boolean {` |
| `isVerifyAvailabilityPrompt` | L134-L138 | 5 | `function isVerifyAvailabilityPrompt(text: string): boolean {` |
| `buildPastReservationCheckInPrompt` | L140-L145 | 6 | `function buildPastReservationCheckInPrompt(lang: string, iso?: string) {` |
| `isSafeCreateTemporalLeadGuestNameCandidate` | L165-L188 | 24 | `function isSafeCreateTemporalLeadGuestNameCandidate(candidate: string): boolean {` |
| `extractSafeCreateTemporalLeadGuestName` | L190-L199 | 10 | `function extractSafeCreateTemporalLeadGuestName(text: string): string \| undefined {` |
| `isSafeConversationalActorName` | L204-L213 | 10 | `function isSafeConversationalActorName(candidate: string): boolean {` |
| `sanitizeInlineConversationalActorCandidate` | L215-L223 | 9 | `function sanitizeInlineConversationalActorCandidate(candidate: string): string \| undefined {` |
| `extractInlineConversationalActorFromTail` | L225-L239 | 15 | `function extractInlineConversationalActorFromTail(tail: string): string \| undefined {` |
| `extractExplicitConversationalActorName` | L241-L280 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `tryExtractFromStart` | L252-L259 | 8 | `const tryExtractFromStart = (candidateText: string): string \| undefined => {` |
| `extractExplicitGuestIdentityCorrection` | L282-L301 | 20 | `export function extractExplicitGuestIdentityCorrection(text: string): string \| undefined {` |
| `applyExplicitConversationalActorToGuest` | L303-L409 | 107 | `async function applyExplicitConversationalActorToGuest(` |
| `buildAvailabilityGuestContext` | L411-L428 | 18 | `function buildAvailabilityGuestContext(pre: PreLLMResult, rawTurnText: string) {` |
| `isCreateWordDatesTraceCandidate` | L430-L440 | 11 | `function isCreateWordDatesTraceCandidate(text: string): boolean {` |
| `traceCreateWordDates` | L442-L449 | 8 | `function traceCreateWordDates(step: string, payload: Record<string, unknown>) {` |
| `getConfiguredCheckTimes` | L451-L464 | 14 | `function getConfiguredCheckTimes(hotel: any): { checkIn?: string; checkOut?: string } {` |
| `detectReservationSnapshotQuery` | L468-L504 | 37 | `function detectReservationSnapshotQuery(` |
| `buildReservationSnapshotAnswer` | L506-L568 | 63 | `function buildReservationSnapshotAnswer(` |
| `normalizeRuntimeLanguage` | L570-L577 | 8 | `function normalizeRuntimeLanguage(value: unknown): "es" \| "en" \| "pt" \| null {` |
| `inferRuntimeLanguageFromText` | L579-L609 | 31 | `function inferRuntimeLanguageFromText(text: string): "es" \| "en" \| "pt" \| null {` |
| `bump` | L590-L594 | 5 | `const bump = (lang: "es" \| "en" \| "pt", patterns: RegExp[]) => {` |
| `ranked` | L606-L611 | 6 | `const ranked = (Object.keys(scores) as Array<"es" \| "en" \| "pt">)` |
| `isLowSignalLanguageMessage` | L611-L620 | 10 | `function isLowSignalLanguageMessage(text: string): boolean {` |
| `resolveFarewellResponseLanguage` | L622-L672 | 51 | `function resolveFarewellResponseLanguage(pre: {` |
| `ranked` | L665-L669 | 5 | `const ranked = (Object.keys(historyScores) as Array<"es" \| "en" \| "pt">)` |
| `resolveReservationSnapshotLanguage` | L674-L684 | 11 | `function resolveReservationSnapshotLanguage(pre: {` |
| `resolveReservationConversationLanguage` | L686-L692 | 7 | `function resolveReservationConversationLanguage(pre: {` |
| `combineModes` | L753-L755 | 3 | `function combineModes(a?: ChannelMode, b?: ChannelMode): ChannelMode {` |
| `isSafeAutosendCategory` | L757-L760 | 4 | `function isSafeAutosendCategory(cat?: string \| null): boolean {` |
| `applyConversationalProposalVocative` | L762-L765 | 4 | `function applyConversationalProposalVocative(` |
| `buildConversationalGreetingNamePrompt` | L784-L793 | 10 | `function buildConversationalGreetingNamePrompt(` |
| `buildConversationalGreetingKnownGuest` | L802-L806 | 5 | `function buildConversationalGreetingKnownGuest(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameCapturedReply` | L808-L815 | 8 | `function buildConversationalNameCapturedReply(` |
| `buildConversationalNameCorrectedReply` | L824-L828 | 5 | `function buildConversationalNameCorrectedReply(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameDeclinedReply` | L830-L834 | 5 | `function buildConversationalNameDeclinedReply(lang: "es" \| "en" \| "pt"): string {` |
| `wasConversationalNameRequested` | L836-L842 | 7 | `function wasConversationalNameRequested(` |
| `hasRecentConversationalNameHandshake` | L844-L856 | 13 | `function hasRecentConversationalNameHandshake(` |
| `isConversationalNameDecline` | L858-L860 | 3 | `function isConversationalNameDecline(text: string): boolean {` |
| `isPureConversationalGreeting` | L862-L866 | 5 | `function isPureConversationalGreeting(text: string): boolean {` |
| `hasPriorConversationTurns` | L868-L875 | 8 | `function hasPriorConversationTurns(lcHistory: (HumanMessage \| AIMessage)[], currentUserText: string): boolean {` |
| `deriveClassifierSource` | L899-L905 | 7 | `function deriveClassifierSource(graphResult: any): RoutingDecisionLog["classifier_source"] {` |
| `emitRoutingDecision` | L907-L917 | 11 | `function emitRoutingDecision(` |
| `emitStableIntentRouting` | L919-L929 | 11 | `function emitStableIntentRouting(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L934-L970 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `setUsePrePosLLM` | L974-L974 | 1 | `export function setUsePrePosLLM(val: boolean) { USE_PRELLM_POSLLM = val; }` |
| `getObjectiveContext` | L976-L1061 | 86 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `lang` | L1029-L1046 | 18 | `const lang = (` |
| `safeNowISO` | L1062-L1062 | 1 | `function safeNowISO() { return new Date().toISOString(); }` |
| `getHotelConfigSafe` | L1064-L1070 | 7 | `async function getHotelConfigSafe(hotelId: string) {` |
| `computeInModifyMode` | L1072-L1084 | 13 | `function computeInModifyMode(` |
| `wantsAdditionalReservation` | L1086-L1091 | 6 | `function wantsAdditionalReservation(` |
| `mergeReservationHistory` | L1111-L1118 | 8 | `function mergeReservationHistory(` |
| `buildPersistedReservationRecord` | L1120-L1138 | 19 | `function buildPersistedReservationRecord(` |
| `buildDraftReservationContext` | L1140-L1148 | 9 | `function buildDraftReservationContext(` |
| `buildFocusedReservationContext` | L1150-L1160 | 11 | `function buildFocusedReservationContext(` |
| `buildSelectedReservationTarget` | L1162-L1176 | 15 | `function buildSelectedReservationTarget(` |
| `buildSelectedReservationTargetFromReference` | L1178-L1185 | 8 | `function buildSelectedReservationTargetFromReference(` |
| `normalizeModifyFieldQueue` | L1189-L1196 | 8 | `function normalizeModifyFieldQueue(fields: Array<ModifyField \| null \| undefined \| false>): ModifyField[] {` |
| `getNextQueuedModifyState` | L1198-L1202 | 5 | `function getNextQueuedModifyState(modifyState?: ModifyState \| null): ModifyState \| null {` |
| `resolveRequestedModifyFieldsInOrder` | L1204-L1206 | 3 | `function resolveRequestedModifyFieldsInOrder(` |
| `pushEarliestPhrase` | L1210-L1217 | 8 | `const pushEarliestPhrase = (field: ModifyField, phrases: string[]) => {` |
| `buildModifyState` | L1262-L1269 | 8 | `function buildModifyState(activeField: ModifyState["activeField"], pendingFields: ModifyField[] = []): ModifyState \| null {` |
| `buildModifyPreviewState` | L1271-L1279 | 9 | `function buildModifyPreviewState(` |
| `buildModifyPreviewPatch` | L1281-L1295 | 15 | `function buildModifyPreviewPatch(` |
| `applyModifyPreviewPatch` | L1297-L1310 | 14 | `function applyModifyPreviewPatch(` |
| `hydrateModifyPreviewTarget` | L1312-L1332 | 21 | `function hydrateModifyPreviewTarget(` |
| `buildModifyPreviewReply` | L1334-L1407 | 74 | `function buildModifyPreviewReply(` |
| `buildModifyPreviewReminder` | L1409-L1415 | 7 | `function buildModifyPreviewReminder(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyPreviewRejectedReply` | L1417-L1423 | 7 | `function buildModifyPreviewRejectedReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyInactiveTargetReply` | L1425-L1431 | 7 | `function buildModifyInactiveTargetReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildCancelInactiveTargetReply` | L1433-L1439 | 7 | `function buildCancelInactiveTargetReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyReservationCodeNotFoundReply` | L1441-L1447 | 7 | `function buildModifyReservationCodeNotFoundReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyMissingPatchReply` | L1449-L1455 | 7 | `function buildModifyMissingPatchReply(lang: "es" \| "en" \| "pt"): string {` |
| `validateModifySnapshot` | L1457-L1480 | 24 | `function validateModifySnapshot(` |
| `persistModifyPreviewContext` | L1482-L1525 | 44 | `async function persistModifyPreviewContext(` |
| `extractModifyAvailabilitySupplementalLines` | L1527-L1567 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `buildModifyDatesPreviewWithAvailability` | L1569-L1583 | 15 | `async function buildModifyDatesPreviewWithAvailability(` |
| `resolveCurrentModifyPreviewTarget` | L1585-L1595 | 11 | `function resolveCurrentModifyPreviewTarget(pre: PreLLMResult): ReservationReferenceTarget \| null {` |
| `buildConversationFocus` | L1597-L1604 | 8 | `function buildConversationFocus(subFlow: ConversationFocus["subFlow"]): ConversationFocus {` |
| `getConversationFocus` | L1606-L1625 | 20 | `function getConversationFocus(state?: Partial<{` |
| `shouldSwitchFlow` | L1627-L1632 | 6 | `function shouldSwitchFlow(` |
| `buildModifyFieldPrompt` | L1634-L1648 | 15 | `function buildModifyFieldPrompt(lang: "es" \| "en" \| "pt", activeField: ModifyState["activeField"]): string {` |
| `getNextCreateFlowMissingField` | L1660-L1667 | 8 | `function getNextCreateFlowMissingField(slots: ReservationSlotsStrict): CreateFlowMissingField {` |
| `getCreateFlowMissingFields` | L1669-L1677 | 9 | `function getCreateFlowMissingFields(slots: ReservationSlotsStrict): CreateFlowMissingField[] {` |
| `buildCreateFlowPrompt` | L1679-L1699 | 21 | `function buildCreateFlowPrompt(` |
| `buildCreateDraftCapacityReply` | L1701-L1734 | 34 | `function buildCreateDraftCapacityReply(` |
| `validateCreateDraftConsistency` | L1736-L1793 | 58 | `function validateCreateDraftConsistency(` |
| `getNextAvailabilityInquiryMissingField` | L1797-L1802 | 6 | `function getNextAvailabilityInquiryMissingField(slots: ReservationSlotsStrict): AvailabilityInquiryMissingField {` |
| `buildAvailabilityInquiryPrompt` | L1804-L1816 | 13 | `function buildAvailabilityInquiryPrompt(` |
| `isExplicitCreateReservationIntent` | L1818-L1826 | 9 | `function isExplicitCreateReservationIntent(text: string): boolean {` |
| `normalizeAvailabilityInquiryText` | L1828-L1833 | 6 | `function normalizeAvailabilityInquiryText(text: string): string {` |
| `isAvailabilityInquiryIntent` | L1835-L1848 | 14 | `function isAvailabilityInquiryIntent(text: string): boolean {` |
| `isExplicitPureAvailabilityInquiryIntent` | L1850-L1855 | 6 | `function isExplicitPureAvailabilityInquiryIntent(text: string): boolean {` |
| `isAvailabilityInquiryActive` | L1857-L1860 | 4 | `function isAvailabilityInquiryActive(pre: Pick<PreLLMResult, "st" \| "prevCategory">): boolean {` |
| `buildAvailabilityInquiryFollowup` | L1862-L1868 | 7 | `function buildAvailabilityInquiryFollowup(lang: "es" \| "en" \| "pt"): string {` |
| `buildAvailabilityInquiryCreateClarification` | L1870-L1876 | 7 | `function buildAvailabilityInquiryCreateClarification(lang: "es" \| "en" \| "pt"): string {` |
| `offeredAvailabilityInquiryCreateFollowup` | L1878-L1897 | 20 | `function offeredAvailabilityInquiryCreateFollowup(` |
| `isAvailabilityInquiryCreateAdvanceIntent` | L1899-L1913 | 15 | `function isAvailabilityInquiryCreateAdvanceIntent(` |
| `shouldStartCreateFromAvailabilityInquiry` | L1915-L1922 | 8 | `function shouldStartCreateFromAvailabilityInquiry(` |
| `isAvailabilityInquiryAmbiguousAdvanceReply` | L1924-L1941 | 18 | `function isAvailabilityInquiryAmbiguousAdvanceReply(` |
| `persistAvailabilityInquiry` | L1943-L1963 | 21 | `async function persistAvailabilityInquiry(` |
| `isCreateStateReadyForQuote` | L1965-L1973 | 9 | `function isCreateStateReadyForQuote(slots: ReservationSlotsStrict): boolean {` |
| `resolveReservationFastPathSubFlow` | L1975-L1997 | 23 | `function resolveReservationFastPathSubFlow(pre: PreLLMResult, userText?: string): "create" \| "modify" {` |
| `shouldAppendFocusContinuation` | L1999-L2005 | 7 | `function shouldAppendFocusContinuation(` |
| `buildFocusContinuationPrompt` | L2015-L2068 | 54 | `function buildFocusContinuationPrompt(` |
| `menuSlots` | L2046-L2054 | 9 | `const menuSlots = (canonicalRecord` |
| `persistCreateLateralCategoryIfNeeded` | L2070-L2099 | 30 | `async function persistCreateLateralCategoryIfNeeded(` |
| `isCreateContextActive` | L2101-L2110 | 10 | `function isCreateContextActive(pre: PreLLMResult): boolean {` |
| `isPureLateralTurnWhileCreateActive` | L2112-L2131 | 20 | `function isPureLateralTurnWhileCreateActive(` |
| `buildPureCreateLateralFailsafeReply` | L2133-L2183 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistCreateDraft` | L2185-L2204 | 20 | `async function persistCreateDraft(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `persistCreateDraftSnapshot` | L2206-L2224 | 19 | `async function persistCreateDraftSnapshot(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `isModifyExecutionActive` | L2226-L2235 | 10 | `function isModifyExecutionActive(pre: PreLLMResult): boolean {` |
| `getModifyExecutionReservationId` | L2237-L2252 | 16 | `function getModifyExecutionReservationId(` |
| `persistModifyExecutionContext` | L2254-L2257 | 4 | `async function persistModifyExecutionContext(` |
| `executeModifyReservationWithSnapshot` | L2272-L2318 | 47 | `async function executeModifyReservationWithSnapshot(` |
| `getRecentModifyRoomTypeCandidate` | L2320-L2330 | 11 | `function getRecentModifyRoomTypeCandidate(` |
| `shouldPersistCreateAvailabilityVerification` | L2332-L2347 | 16 | `function shouldPersistCreateAvailabilityVerification(` |
| `normalizeReferenceText` | L2374-L2379 | 6 | `function normalizeReferenceText(text: string): string {` |
| `toISODateOffset` | L2381-L2386 | 6 | `function toISODateOffset(days: number): string {` |
| `getEffectiveActiveReservationContext` | L2388-L2409 | 22 | `function getEffectiveActiveReservationContext(state: any): ActiveReservationContext \| undefined {` |
| `hasCanonicalConfirmedReservationContext` | L2411-L2417 | 7 | `function hasCanonicalConfirmedReservationContext(state: any): boolean {` |
| `hasDominantDraftProposalContext` | L2419-L2421 | 3 | `function hasDominantDraftProposalContext(state: any): boolean {` |
| `normalizeCanonicalReservationStatus` | L2423-L2428 | 6 | `function normalizeCanonicalReservationStatus(status: string \| null \| undefined): CanonicalReservationRecord["canonicalStatus"] {` |
| `hasMaterializedReservationPayload` | L2430-L2439 | 10 | `function hasMaterializedReservationPayload(item: any): boolean {` |
| `isCanonicalReservationRecordEligible` | L2441-L2446 | 6 | `function isCanonicalReservationRecordEligible(item: any): boolean {` |
| `historyContainsReservationId` | L2448-L2454 | 7 | `function historyContainsReservationId(` |
| `shouldPreserveLastReservationRecord` | L2456-L2462 | 7 | `function shouldPreserveLastReservationRecord(` |
| `buildReservationCanonicalState` | L2464-L2514 | 51 | `function buildReservationCanonicalState(state: any): {` |
| `mergeSameReservation` | L2472-L2480 | 9 | `const mergeSameReservation = (base: CanonicalReservationRecord, preferred: CanonicalReservationRecord) => ({` |
| `buildCanonicalReservationRecords` | L2516-L2518 | 3 | `function buildCanonicalReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `buildPresentedReservationRecords` | L2520-L2532 | 13 | `function buildPresentedReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `collectPersistedReservationRecords` | L2534-L2539 | 6 | `function collectPersistedReservationRecords(state: any): LastReservation[] {` |
| `getMergedIntoGuestId` | L2541-L2546 | 6 | `function getMergedIntoGuestId(guest: { tags?: unknown } \| null \| undefined): string \| undefined {` |
| `getCanonicalReservationRecordById` | L2548-L2554 | 7 | `function getCanonicalReservationRecordById(` |
| `buildCanonicalReservationTarget` | L2556-L2581 | 26 | `function buildCanonicalReservationTarget(` |
| `resolveConfirmedReservationFollowupSnapshot` | L2583-L2585 | 3 | `function resolveConfirmedReservationFollowupSnapshot(` |
| `getHotelToday` | L2615-L2631 | 17 | `function getHotelToday(timezone?: string, now = new Date()): string {` |
| `normalizeReservationCalendarDate` | L2633-L2641 | 9 | `function normalizeReservationCalendarDate(value?: string): string \| undefined {` |
| `getReservationTemporalRelation` | L2643-L2653 | 11 | `function getReservationTemporalRelation(` |
| `orderReservationsForTemporalPresentation` | L2655-L2679 | 25 | `function orderReservationsForTemporalPresentation(` |
| `buildReservationListAnswer` | L2681-L2768 | 88 | `function buildReservationListAnswer(` |
| `safeFindGuestByAnyId` | L2770-L2778 | 9 | `async function safeFindGuestByAnyId(hotelId: string, rawId: string) {` |
| `presentedReservationScopeMatchesCanonicalGuest` | L2780-L2790 | 11 | `async function presentedReservationScopeMatchesCanonicalGuest(` |
| `safeGetConversationsByGuestId` | L2792-L2803 | 12 | `async function safeGetConversationsByGuestId(input: {` |
| `resolveReservationListSource` | L2805-L2862 | 58 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildLastPresentedReservations` | L2864-L2885 | 22 | `function buildLastPresentedReservations(source: {` |
| `getConfirmedGuestReservationCandidates` | L2887-L2891 | 5 | `function getConfirmedGuestReservationCandidates(reservations: CanonicalReservationRecord[]) {` |
| `buildGuestReservationAmbiguityReply` | L2893-L2907 | 15 | `function buildGuestReservationAmbiguityReply(` |
| `buildReservationReferenceCandidates` | L2909-L2961 | 53 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildOrderedReservationHistoryCandidates` | L2963-L2978 | 16 | `function buildOrderedReservationHistoryCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildActionableReservationCandidates` | L2980-L2992 | 13 | `function buildActionableReservationCandidates(state: any): ReservationReferenceTarget[] {` |
| `resolveSingleActionableReservationTarget` | L2994-L2997 | 4 | `function resolveSingleActionableReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `extractReservationOrdinalReferenceSpec` | L2999-L3006 | 8 | `function extractReservationOrdinalReferenceSpec(text: string): ReservationOrdinalReference \| null {` |
| `extractReservationOrdinalReference` | L3008-L3011 | 4 | `function extractReservationOrdinalReference(text: string): "first" \| "second" \| "third" \| "fourth" \| "last" \| null {` |
| `validateOrdinalReservationReference` | L3013-L3034 | 22 | `function validateOrdinalReservationReference(` |
| `resolveValidatedOrdinalReservationTarget` | L3036-L3042 | 7 | `function resolveValidatedOrdinalReservationTarget(` |
| `buildOutOfRangeReservationReferenceReply` | L3044-L3065 | 22 | `function buildOutOfRangeReservationReferenceReply(` |
| `buildReservationReferenceGuardReply` | L3067-L3075 | 9 | `function buildReservationReferenceGuardReply(` |
| `buildAmbiguousReservationSelectionReply` | L3077-L3095 | 19 | `function buildAmbiguousReservationSelectionReply(` |
| `getAmbiguousReservationAction` | L3097-L3109 | 13 | `function getAmbiguousReservationAction(` |
| `resolveExplicitOrdinalReservationTarget` | L3126-L3128 | 3 | `function resolveExplicitOrdinalReservationTarget(state: any, userText: string): ReservationReferenceTarget \| null {` |
| `getReservationReferenceTargetById` | L3130-L3135 | 6 | `function getReservationReferenceTargetById(state: any, reservationId?: string \| null): ReservationReferenceTarget \| null {` |
| `resolveSelectedReservationTarget` | L3137-L3141 | 5 | `function resolveSelectedReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `resolveReservationReference` | L3143-L3251 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `buildReservationReferenceClarification` | L3253-L3259 | 7 | `function buildReservationReferenceClarification(lang: "es" \| "en" \| "pt"): string {` |
| `getRecentHistorySafe` | L3261-L3269 | 9 | `async function getRecentHistorySafe(` |
| `toStrictSlots` | L3271-L3280 | 10 | `function toStrictSlots(slots?: DbReservationSlots \| null): ReservationSlotsStrict {` |
| `mergeReservationSlots` | L3282-L3296 | 15 | `function mergeReservationSlots(` |
| `toLC` | L3298-L3303 | 6 | `function toLC(msg: ChannelMessage) {` |
| `getRecentHistory` | L3311-L3341 | 31 | `async function getRecentHistory(` |
| `extractTextFromLCContent` | L3344-L3359 | 16 | `function extractTextFromLCContent(content: any): string {` |
| `extractLastAIText` | L3361-L3372 | 12 | `function extractLastAIText(messages: any[] \| undefined): string {` |
| `emitReply` | L3387-L3394 | 8 | `async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: RichPayload) {` |
| `ruleBasedFallback` | L3397-L3416 | 20 | `function ruleBasedFallback(lang: string, userText: string): string {` |
| `t` | L3398-L3407 | 10 | `const t = (userText \|\| "").toLowerCase();` |
| `detectIntent` | L3419-L3436 | 18 | `export function detectIntent(` |
| `t` | L3423-L3450 | 28 | `const t = (userText \|\| "").toLowerCase();` |
| `mapStructuredIntentToCategory` | L3439-L3463 | 25 | `export function mapStructuredIntentToCategory(` |
| `looksTransactionalPricingIntent` | L3465-L3475 | 11 | `function looksTransactionalPricingIntent(text: string): boolean {` |
| `detectDominantTurnDomain` | L3484-L3543 | 60 | `function detectDominantTurnDomain(` |
| `isExplicitModifyExitTurn` | L3546-L3551 | 6 | `function isExplicitModifyExitTurn(text: string): boolean {` |
| `buildPricingClarificationReply` | L3553-L3572 | 20 | `function buildPricingClarificationReply(` |
| `isRoomTypeFollowupInReservation` | L3574-L3586 | 13 | `function isRoomTypeFollowupInReservation(` |
| `isGuestsFollowupInReservation` | L3588-L3609 | 22 | `function isGuestsFollowupInReservation(` |
| `isGuestNameFollowupInReservation` | L3611-L3621 | 11 | `function isGuestNameFollowupInReservation(` |
| `hasHolderCorrectionIntent` | L3623-L3633 | 11 | `function hasHolderCorrectionIntent(text: string): boolean {` |
| `hasDraftHolderCorrectionIntent` | L3635-L3637 | 3 | `function hasDraftHolderCorrectionIntent(text: string): boolean {` |
| `buildAskDraftHolderName` | L3639-L3645 | 7 | `function buildAskDraftHolderName(lang: "es" \| "en" \| "pt"): string {` |
| `buildConfirmedHolderChangeNotSupportedReply` | L3647-L3653 | 7 | `function buildConfirmedHolderChangeNotSupportedReply(lang: "es" \| "en" \| "pt"): string {` |
| `resolveDraftHolderCandidate` | L3655-L3658 | 4 | `function resolveDraftHolderCandidate(` |
| `hasActiveReservationDomain` | L3671-L3704 | 34 | `function hasActiveReservationDomain(pre: PreLLMResult): boolean {` |
| `isReservationConfirmSignal` | L3706-L3710 | 5 | `function isReservationConfirmSignal(text: string): boolean {` |
| `isStrictCreateProposalConfirmation` | L3712-L3720 | 9 | `function isStrictCreateProposalConfirmation(text: string): boolean {` |
| `isQuotedCreateNegativeReply` | L3722-L3725 | 4 | `function isQuotedCreateNegativeReply(text: string): boolean {` |
| `buildQuotedCreateConfirmClarification` | L3727-L3733 | 7 | `function buildQuotedCreateConfirmClarification(lang: "es" \| "en" \| "pt"): string {` |
| `buildQuotedCreateProposalPausedReply` | L3735-L3741 | 7 | `function buildQuotedCreateProposalPausedReply(lang: "es" \| "en" \| "pt"): string {` |
| `isPendingCreateProposalContext` | L3743-L3760 | 18 | `function isPendingCreateProposalContext(` |
| `hasStrongReservationDomainExitIntent` | L3762-L3769 | 8 | `function hasStrongReservationDomainExitIntent(text: string): boolean {` |
| `isReservationSnapshotFollowupSignal` | L3771-L3786 | 16 | `function isReservationSnapshotFollowupSignal(pre: PreLLMResult, text: string): boolean {` |
| `isReservationModifySubstateSignal` | L3788-L3814 | 27 | `function isReservationModifySubstateSignal(pre: PreLLMResult, text: string): boolean {` |
| `getReservationDomainLockSignal` | L3816-L3851 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `buildReservationDomainLockReply` | L3853-L3863 | 11 | `function buildReservationDomainLockReply(` |
| `knownSlots` | L3879-L3887 | 9 | `const knownSlots = (canonicalRecord` |
| `isReservationFlowStillActive` | L3976-L3986 | 11 | `function isReservationFlowStillActive(pre: PreLLMResult): boolean {` |
| `shouldUseReservationLocalFallback` | L3988-L4039 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L4041-L4176 | 136 | `function buildReservationLocalFallbackReply(` |
| `knownSlots` | L4059-L4067 | 9 | `const knownSlots = (canonicalRecord` |
| `assessReservationDateCoherence` | L4178-L4191 | 14 | `function assessReservationDateCoherence(` |
| `extractRawOrderedDateRange` | L4193-L4235 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `toIso` | L4198-L4204 | 7 | `const toIso = (token: string) => {` |
| `anchorCreateDayRangeToDraft` | L4237-L4273 | 37 | `function anchorCreateDayRangeToDraft(` |
| `hasNumericDateRangeWithoutYear` | L4275-L4279 | 5 | `function hasNumericDateRangeWithoutYear(text: string): boolean {` |
| `extractRelativeWeekendDateRange` | L4281-L4304 | 24 | `function extractRelativeWeekendDateRange(` |
| `extractRelativeWeekdayRange` | L4306-L4342 | 37 | `function extractRelativeWeekdayRange(` |
| `extractRelativeWeekdayDate` | L4344-L4358 | 15 | `function extractRelativeWeekdayDate(` |
| `extractSupportedTemporalDateRange` | L4360-L4373 | 14 | `async function extractSupportedTemporalDateRange(` |
| `detectModifyTemporalSideIntent` | L4375-L4377 | 3 | `function detectModifyTemporalSideIntent(` |
| `buildModifyPartialDateSlots` | L4390-L4392 | 3 | `function buildModifyPartialDateSlots(` |
| `resolveModifyDatesContextualMissingSide` | L4412-L4425 | 14 | `function resolveModifyDatesContextualMissingSide(` |
| `detectShortRelativeWeekday` | L4427-L4444 | 18 | `function detectShortRelativeWeekday(text: string): number \| undefined {` |
| `firstWeekdayStrictlyAfter` | L4446-L4454 | 9 | `function firstWeekdayStrictlyAfter(baseIso: string, weekday: number): string \| undefined {` |
| `firstWeekdayOnOrAfter` | L4456-L4463 | 8 | `function firstWeekdayOnOrAfter(baseIso: string, weekday: number): string \| undefined {` |
| `delta` | L4460-L4467 | 8 | `const delta = (weekday - candidate.getUTCDay() + 7) % 7;` |
| `anchorRelativeWeekdayToCheckOutAfterCheckIn` | L4465-L4467 | 3 | `function anchorRelativeWeekdayToCheckOutAfterCheckIn(` |
| `anchorModifyRelativeDateToContext` | L4482-L4485 | 4 | `function anchorModifyRelativeDateToContext(` |
| `resolveCreateDatesContextualMissingSide` | L4498-L4515 | 18 | `function resolveCreateDatesContextualMissingSide(` |
| `anchorCreateRelativeDateToContext` | L4517-L4520 | 4 | `function anchorCreateRelativeDateToContext(` |
| `anchorAvailabilityInquiryDateToContext` | L4554-L4557 | 4 | `function anchorAvailabilityInquiryDateToContext(` |
| `hasModifyDateCorrectionCue` | L4585-L4589 | 5 | `function hasModifyDateCorrectionCue(text: string): boolean {` |
| `hasModifyDatesEntrySignal` | L4591-L4593 | 3 | `function hasModifyDatesEntrySignal(` |
| `buildInvalidReservationDatesReply` | L4602-L4622 | 21 | `function buildInvalidReservationDatesReply(lang: "es" \| "en" \| "pt", reason: "check_order" \| "range_too_long" \| "invalid_format"): string {` |
| `buildInvalidCreateCalendarDateReply` | L4624-L4634 | 11 | `function buildInvalidCreateCalendarDateReply(` |
| `buildInvalidCreateCheckOutReply` | L4636-L4642 | 7 | `function buildInvalidCreateCheckOutReply(lang: "es" \| "en" \| "pt"): string {` |
| `detectRawReservationDateIssue` | L4644-L4667 | 24 | `function detectRawReservationDateIssue(text: string): { reason: "check_order" \| "range_too_long" \| "invalid_format" } \| null {` |
| `tryStructuredAnalyze` | L4670-L4797 | 128 | `async function tryStructuredAnalyze(params: {` |
| `preLLM` | L4860-L5072 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `lang` | L4907-L4925 | 19 | `const lang = (` |
| `pref` | L4984-L4992 | 9 | `const pref = (hotelConfig as any)?.nearbyPointsMode;` |
| `hasRecentReservationMention` | L5075-L5082 | 8 | `function hasRecentReservationMention(pre: PreLLMResult): boolean {` |
| `shouldClearSelectedReservationTargetForCategory` | L5084-L5106 | 23 | `function shouldClearSelectedReservationTargetForCategory(` |
| `looksLikeEventsQuery` | L5107-L5110 | 4 | `function looksLikeEventsQuery(text: string): boolean {` |
| `buildStateSummary` | L5111-L5120 | 10 | `function buildStateSummary(slots: ReservationSlotsStrict, st: any) {` |
| `initBodyLLMState` | L5133-L5142 | 10 | `function initBodyLLMState(pre: PreLLMResult): BodyLLMState {` |
| `toBodyLLMResult` | L5144-L5153 | 10 | `function toBodyLLMResult(state: BodyLLMState) {` |
| `isRenderableRoomImageUrl` | L5155-L5158 | 4 | `function isRenderableRoomImageUrl(value: unknown): boolean {` |
| `roomInfoImgBodyHasRenderableImages` | L5160-L5163 | 4 | `function roomInfoImgBodyHasRenderableImages(body: unknown): boolean {` |
| `hotelConfigHasRenderableRoomImages` | L5165-L5175 | 11 | `function hotelConfigHasRenderableRoomImages(hotelConfig: unknown): boolean {` |
| `rooms` | L5166-L5166 | 1 | `const rooms = (hotelConfig as { rooms?: unknown })?.rooms;` |
| `hotelHasRenderableRoomInventoryVisuals` | L5177-L5194 | 18 | `async function hotelHasRenderableRoomInventoryVisuals(pre: PreLLMResult): Promise<boolean> {` |
| `runKbPrecedenceRichPath` | L5196-L5227 | 32 | `async function runKbPrecedenceRichPath(pre: PreLLMResult, promptKey: string): Promise<{` |
| `rbLast` | L5212-L5226 | 15 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5214-L5226 | 13 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMTestGreetingFastpath` | L5229-L5246 | 18 | `function tryBodyLLMTestGreetingFastpath(pre: PreLLMResult, state: BodyLLMState): boolean {` |
| `tryConversationalGuestNameCapture` | L5248-L5340 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `tryBodyLLMKnowledgeShortcuts` | L5342-L5552 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `looksEventIntent` | L5370-L5381 | 12 | `const looksEventIntent = (() => {` |
| `runBodyLLMGraphPath` | L5554-L5658 | 105 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `last` | L5582-L5592 | 11 | `const last = (state.graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L5617-L5627 | 11 | `const resolved = (state.graphResult as any)?.resolved;` |
| `classified` | L5618-L5627 | 10 | `const classified = (state.graphResult as any)?.classified;` |
| `rbLast` | L5641-L5651 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5643-L5651 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMStructuredEnrichment` | L5660-L5697 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `tryBodyLLMStructuredFallback` | L5699-L5728 | 30 | `async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `bodyLLM` | L5731-L12340 | 6610 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `code` | L7268-L7269 | 2 | `const code = (e as any)?.code;` |
| `prevAttempt` | L7291-L7302 | 12 | `const prevAttempt = (pre.st as any)?.lastEmailCopyAttempt;` |
| `toDDMMYYYY` | L7313-L7313 | 1 | `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };` |
| `prevFailures` | L7363-L7374 | 12 | `const prevFailures = (prevAttempt?.failures \|\| 0) + 1;` |
| `quotedTurnDirectWeekdayRange` | L9200-L9209 | 10 | `const quotedTurnDirectWeekdayRange = (() => {` |
| `toDDMMYYYY` | L9451-L9454 | 4 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L9484-L9486 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `toDDMMYYYY` | L9522-L9524 | 3 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L9552-L9554 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `jidFromGuest` | L9580-L9647 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L9581-L9647 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `code` | L9627-L9628 | 2 | `const code = (e as any)?.code;` |
| `code` | L9683-L9684 | 2 | `const code = (e as any)?.code;` |
| `jidFromGuest` | L9701-L9769 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L9702-L9769 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `code` | L9748-L9749 | 2 | `const code = (e as any)?.code;` |
| `code` | L9805-L9806 | 2 | `const code = (e as any)?.code;` |
| `code` | L9862-L9863 | 2 | `const code = (e as any)?.code;` |
| `pendingAvailabilityVerification` | L9890-L9890 | 1 | `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;` |
| `pendingCancellation` | L9905-L9905 | 1 | `const pendingCancellation = (pre.st as any)?.pendingCancellation as { reservationId?: string; awaitingConfirmation?: boolean } \| undefined;` |
| `snapshotSlots` | L10803-L10812 | 10 | `const snapshotSlots = (canonicalSlots` |
| `looksEventIntent` | L10875-L10889 | 15 | `const looksEventIntent = (() => {` |
| `last` | L11184-L11194 | 11 | `const last = (graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L11223-L11233 | 11 | `const resolved = (graphResult as any)?.resolved;` |
| `classified` | L11224-L11233 | 10 | `const classified = (graphResult as any)?.classified;` |
| `rbLast` | L11247-L11257 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L11249-L11257 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `cons` | L11840-L11851 | 12 | `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({` |
| `txt` | L11885-L11887 | 3 | `const txt = (finalText \|\| '').trim();` |
| `toDDMMYYYY` | L11890-L11894 | 5 | `const toDDMMYYYY = (iso?: string) => {` |
| `currentDates` | L11918-L11918 | 1 | `const currentDates = (String(pre.msg.content \|\| '').match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) \|\| []).map(d => d);` |
| `toISO` | L11931-L11933 | 3 | `const toISO = (d: string) => {` |
| `toDDMMYYYY` | L11938-L11938 | 1 | `const toDDMMYYYY = (iso?: string) => iso ? iso.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') : '';` |
| `stripOffTopicAmenitiesTail` | L12342-L12364 | 23 | `function stripOffTopicAmenitiesTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripOffTopicBillingTail` | L12366-L12391 | 26 | `function stripOffTopicBillingTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `harmonizeBillingCurrencyAnswer` | L12393-L12445 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `ensureBillingContextualFollowup` | L12447-L12459 | 13 | `function ensureBillingContextualFollowup(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildDeterministicBillingReply` | L12461-L12523 | 63 | `async function buildDeterministicBillingReply(` |
| `textNorm` | L12476-L12480 | 5 | `const textNorm = (userText \|\| "").toLowerCase();` |
| `applyCommittedHotelTone` | L12525-L12560 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripGlobalTailNoise` | L12562-L12573 | 12 | `function stripGlobalTailNoise(text: string): string {` |
| `buildModifyGuidance` | L12575-L12590 | 16 | `function buildModifyGuidance(` |
| `es` | L12580-L12582 | 3 | `const es = () =>` |
| `en` | L12583-L12585 | 3 | `const en = () =>` |
| `pt` | L12586-L12588 | 3 | `const pt = () =>` |
| `isContactHotelText` | L12592-L12601 | 10 | `function isContactHotelText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L12593-L12609 | 17 | `const t = (text \|\| "").toLowerCase();` |
| `isQuoteOrConfirmText` | L12609-L12617 | 9 | `function isQuoteOrConfirmText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L12610-L12620 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `wantsGenericModify` | L12620-L12637 | 18 | `function wantsGenericModify(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L12621-L12631 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `isExecutableModifyIntent` | L12639-L12646 | 8 | `function isExecutableModifyIntent(` |
| `buildModifyInquiryReply` | L12648-L12672 | 25 | `function buildModifyInquiryReply(lang: "es" \| "en" \| "pt", text: string): string \| null {` |
| `buildModifyOptionsMenu` | L12674-L12729 | 56 | `function buildModifyOptionsMenu(` |
| `buildModifyReservationSelectionIntro` | L12731-L12764 | 34 | `function buildModifyReservationSelectionIntro(` |
| `isGenericFallbackText` | L12768-L12777 | 10 | `function isGenericFallbackText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L12769-L12780 | 12 | `const t = (text \|\| "").toLowerCase();` |
| `parseReservationCode` | L12780-L12789 | 10 | `function parseReservationCode(text: string): string \| undefined {` |
| `extractReservationCodeLikeToken` | L12790-L12793 | 4 | `function extractReservationCodeLikeToken(text: string): string \| undefined {` |
| `buildAskReservationCode` | L12794-L12798 | 5 | `function buildAskReservationCode(lang: "es" \| "en" \| "pt"): string {` |
| `buildReservationCopySummary` | L12802-L12812 | 11 | `function buildReservationCopySummary(pre: PreLLMResult, nextSlots: ReservationSlotsStrict) {` |
| `detectWhatsAppCopyRequest` | L12814-L12832 | 19 | `function detectWhatsAppCopyRequest(pre: PreLLMResult, text: string): { matched: boolean; mode?: 'explicit' \| 'light'; inlinePhone?: string } {` |
| `posLLM` | L12835-L12876 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L12880-L13204 | 325 | `export async function handleIncomingMessage(` |
| `respCategory` | L13085-L13110 | 26 | `const respCategory = (body?.graphResult?.category \|\| body?.nextCategory \|\| pre.prevCategory) as string \| undefined;` |
| `respPromptKey` | L13086-L13110 | 25 | `const respPromptKey = (` |
| `respContentVersion` | L13092-L13110 | 19 | `const respContentVersion = (` |
| `respSource` | L13097-L13110 | 14 | `const respSource = (` |
| `respSalesStage` | L13101-L13110 | 10 | `const respSalesStage = (body?.graphResult?.salesStage \|\| pre.st?.salesStage) as string \| undefined;` |
