# messageHandler function size map

Archivo: `lib/handlers/messageHandler.ts`  
Líneas totales: 12183
Declaraciones detectadas: 304

> Scan estático readonly. Los rangos son aproximados y dependen de llaves `{}`.

---

## 1. Funciones clave

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `buildReservationCanonicalState` | L2230-L2267 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `resolveReservationReference` | L2731-L2838 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `detectDominantTurnDomain` | L3071-L3130 | 60 | `function detectDominantTurnDomain(` |
| `getReservationDomainLockSignal` | L3355-L3390 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `shouldUseReservationLocalFallback` | L3527-L3578 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L3580-L3715 | 136 | `function buildReservationLocalFallbackReply(` |
| `assessReservationDateCoherence` | L3717-L3730 | 14 | `function assessReservationDateCoherence(` |
| `tryStructuredAnalyze` | L4197-L4324 | 128 | `async function tryStructuredAnalyze(params: {` |
| `preLLM` | L4386-L4597 | 212 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `bodyLLM` | L5148-L11813 | 6666 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `posLLM` | L11814-L11858 | 45 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L11859-L12183 | 325 | `export async function handleIncomingMessage(` |

---

## 2. Declaraciones más grandes

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `bodyLLM` | L5148-L11813 | 6666 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `preLLM` | L4386-L4597 | 212 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `tryBodyLLMKnowledgeShortcuts` | L4793-L4970 | 178 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationLocalFallbackReply` | L3580-L3715 | 136 | `function buildReservationLocalFallbackReply(` |
| `tryStructuredAnalyze` | L4197-L4324 | 128 | `async function tryStructuredAnalyze(params: {` |
| `resolveReservationReference` | L2731-L2838 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `applyExplicitConversationalActorToGuest` | L281-L385 | 105 | `async function applyExplicitConversationalActorToGuest(` |
| `runBodyLLMGraphPath` | L4972-L5075 | 104 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `tryConversationalGuestNameCapture` | L4699-L4791 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `getObjectiveContext` | L850-L925 | 76 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `buildReservationListAnswer` | L2351-L2426 | 76 | `function buildReservationListAnswer(` |
| `buildModifyPreviewReply` | L1176-L1249 | 74 | `function buildModifyPreviewReply(` |
| `jidFromGuest` | L8836-L8904 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromGuest` | L8715-L8782 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L8837-L8904 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `jidFromConv` | L8716-L8782 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `resolveReservationListSource` | L2452-L2515 | 64 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildReservationSnapshotAnswer` | L482-L544 | 63 | `function buildReservationSnapshotAnswer(` |
| `buildDeterministicBillingReply` | L11440-L11502 | 63 | `async function buildDeterministicBillingReply(` |
| `detectDominantTurnDomain` | L3071-L3130 | 60 | `function detectDominantTurnDomain(` |
| `buildModifyOptionsMenu` | L11653-L11708 | 56 | `function buildModifyOptionsMenu(` |
| `buildFocusContinuationPrompt` | L1811-L1864 | 54 | `function buildFocusContinuationPrompt(` |
| `harmonizeBillingCurrencyAnswer` | L11372-L11424 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `shouldUseReservationLocalFallback` | L3527-L3578 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildPureCreateLateralFailsafeReply` | L1929-L1979 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `validateCreateDraftConsistency` | L1545-L1589 | 45 | `function validateCreateDraftConsistency(` |
| `extractRawOrderedDateRange` | L3732-L3774 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `posLLM` | L11814-L11855 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `extractModifyAvailabilitySupplementalLines` | L1336-L1376 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `extractExplicitConversationalActorName` | L240-L279 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `buildReservationCanonicalState` | L2230-L2267 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `buildReservationReferenceCandidates` | L2517-L2554 | 38 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `tryBodyLLMStructuredEnrichment` | L5077-L5114 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `detectReservationSnapshotQuery` | L444-L480 | 37 | `function detectReservationSnapshotQuery(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L808-L844 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `anchorCreateDayRangeToDraft` | L3776-L3812 | 37 | `function anchorCreateDayRangeToDraft(` |
| `extractRelativeWeekdayRange` | L3845-L3881 | 37 | `function extractRelativeWeekdayRange(` |
| `getReservationDomainLockSignal` | L3355-L3390 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `applyCommittedHotelTone` | L11504-L11539 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildCreateDraftCapacityReply` | L1510-L1543 | 34 | `function buildCreateDraftCapacityReply(` |

---

## 3. Todas las declaraciones detectadas

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `getWaPhoneMetrics` | L93-L93 | 1 | `export function getWaPhoneMetrics() { return { ...waPhoneMetrics }; }` |
| `resetWaPhoneMetrics` | L94-L94 | 1 | `export function resetWaPhoneMetrics() { waPhoneMetrics.invalidAttempts = 0; waPhoneMetrics.accepted = 0; }` |
| `normalizeWA` | L96-L107 | 12 | `function normalizeWA(raw: string): { normalized?: string; reason?: string } {` |
| `isPastReservationCheckInISO` | L109-L116 | 8 | `function isPastReservationCheckInISO(iso?: string) {` |
| `isPastReservationDateISO` | L118-L125 | 8 | `function isPastReservationDateISO(iso?: string) {` |
| `askedToConfirmReservation` | L127-L131 | 5 | `function askedToConfirmReservation(lcHistory: (HumanMessage \| AIMessage)[]): boolean {` |
| `isVerifyAvailabilityPrompt` | L133-L137 | 5 | `function isVerifyAvailabilityPrompt(text: string): boolean {` |
| `buildPastReservationCheckInPrompt` | L139-L144 | 6 | `function buildPastReservationCheckInPrompt(lang: string, iso?: string) {` |
| `isSafeCreateTemporalLeadGuestNameCandidate` | L164-L187 | 24 | `function isSafeCreateTemporalLeadGuestNameCandidate(candidate: string): boolean {` |
| `extractSafeCreateTemporalLeadGuestName` | L189-L198 | 10 | `function extractSafeCreateTemporalLeadGuestName(text: string): string \| undefined {` |
| `isSafeConversationalActorName` | L203-L212 | 10 | `function isSafeConversationalActorName(candidate: string): boolean {` |
| `sanitizeInlineConversationalActorCandidate` | L214-L222 | 9 | `function sanitizeInlineConversationalActorCandidate(candidate: string): string \| undefined {` |
| `extractInlineConversationalActorFromTail` | L224-L238 | 15 | `function extractInlineConversationalActorFromTail(tail: string): string \| undefined {` |
| `extractExplicitConversationalActorName` | L240-L279 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `tryExtractFromStart` | L251-L258 | 8 | `const tryExtractFromStart = (candidateText: string): string \| undefined => {` |
| `applyExplicitConversationalActorToGuest` | L281-L385 | 105 | `async function applyExplicitConversationalActorToGuest(` |
| `buildAvailabilityGuestContext` | L387-L404 | 18 | `function buildAvailabilityGuestContext(pre: PreLLMResult, rawTurnText: string) {` |
| `isCreateWordDatesTraceCandidate` | L406-L416 | 11 | `function isCreateWordDatesTraceCandidate(text: string): boolean {` |
| `traceCreateWordDates` | L418-L425 | 8 | `function traceCreateWordDates(step: string, payload: Record<string, unknown>) {` |
| `getConfiguredCheckTimes` | L427-L440 | 14 | `function getConfiguredCheckTimes(hotel: any): { checkIn?: string; checkOut?: string } {` |
| `detectReservationSnapshotQuery` | L444-L480 | 37 | `function detectReservationSnapshotQuery(` |
| `buildReservationSnapshotAnswer` | L482-L544 | 63 | `function buildReservationSnapshotAnswer(` |
| `normalizeRuntimeLanguage` | L546-L553 | 8 | `function normalizeRuntimeLanguage(value: unknown): "es" \| "en" \| "pt" \| null {` |
| `resolveReservationSnapshotLanguage` | L555-L565 | 11 | `function resolveReservationSnapshotLanguage(pre: {` |
| `resolveReservationConversationLanguage` | L567-L573 | 7 | `function resolveReservationConversationLanguage(pre: {` |
| `combineModes` | L633-L635 | 3 | `function combineModes(a?: ChannelMode, b?: ChannelMode): ChannelMode {` |
| `isSafeAutosendCategory` | L637-L640 | 4 | `function isSafeAutosendCategory(cat?: string \| null): boolean {` |
| `applyConversationalProposalVocative` | L642-L645 | 4 | `function applyConversationalProposalVocative(` |
| `buildConversationalGreetingNamePrompt` | L664-L673 | 10 | `function buildConversationalGreetingNamePrompt(` |
| `buildConversationalGreetingKnownGuest` | L682-L686 | 5 | `function buildConversationalGreetingKnownGuest(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameCapturedReply` | L688-L695 | 8 | `function buildConversationalNameCapturedReply(` |
| `buildConversationalNameDeclinedReply` | L704-L708 | 5 | `function buildConversationalNameDeclinedReply(lang: "es" \| "en" \| "pt"): string {` |
| `wasConversationalNameRequested` | L710-L716 | 7 | `function wasConversationalNameRequested(` |
| `hasRecentConversationalNameHandshake` | L718-L730 | 13 | `function hasRecentConversationalNameHandshake(` |
| `isConversationalNameDecline` | L732-L734 | 3 | `function isConversationalNameDecline(text: string): boolean {` |
| `isPureConversationalGreeting` | L736-L740 | 5 | `function isPureConversationalGreeting(text: string): boolean {` |
| `hasPriorConversationTurns` | L742-L749 | 8 | `function hasPriorConversationTurns(lcHistory: (HumanMessage \| AIMessage)[], currentUserText: string): boolean {` |
| `deriveClassifierSource` | L773-L779 | 7 | `function deriveClassifierSource(graphResult: any): RoutingDecisionLog["classifier_source"] {` |
| `emitRoutingDecision` | L781-L791 | 11 | `function emitRoutingDecision(` |
| `emitStableIntentRouting` | L793-L803 | 11 | `function emitStableIntentRouting(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L808-L844 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `setUsePrePosLLM` | L848-L848 | 1 | `export function setUsePrePosLLM(val: boolean) { USE_PRELLM_POSLLM = val; }` |
| `getObjectiveContext` | L850-L925 | 76 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `lang` | L893-L910 | 18 | `const lang = (` |
| `safeNowISO` | L926-L926 | 1 | `function safeNowISO() { return new Date().toISOString(); }` |
| `getHotelConfigSafe` | L928-L934 | 7 | `async function getHotelConfigSafe(hotelId: string) {` |
| `computeInModifyMode` | L936-L948 | 13 | `function computeInModifyMode(` |
| `wantsAdditionalReservation` | L950-L955 | 6 | `function wantsAdditionalReservation(` |
| `mergeReservationHistory` | L975-L982 | 8 | `function mergeReservationHistory(` |
| `buildPersistedReservationRecord` | L984-L1002 | 19 | `function buildPersistedReservationRecord(` |
| `buildDraftReservationContext` | L1004-L1012 | 9 | `function buildDraftReservationContext(` |
| `buildFocusedReservationContext` | L1014-L1024 | 11 | `function buildFocusedReservationContext(` |
| `buildSelectedReservationTarget` | L1026-L1040 | 15 | `function buildSelectedReservationTarget(` |
| `buildSelectedReservationTargetFromReference` | L1042-L1049 | 8 | `function buildSelectedReservationTargetFromReference(` |
| `normalizeModifyFieldQueue` | L1053-L1060 | 8 | `function normalizeModifyFieldQueue(fields: Array<ModifyField \| null \| undefined \| false>): ModifyField[] {` |
| `getNextQueuedModifyState` | L1062-L1066 | 5 | `function getNextQueuedModifyState(modifyState?: ModifyState \| null): ModifyState \| null {` |
| `resolveRequestedModifyFieldsInOrder` | L1068-L1070 | 3 | `function resolveRequestedModifyFieldsInOrder(` |
| `pushEarliestPhrase` | L1074-L1081 | 8 | `const pushEarliestPhrase = (field: ModifyField, phrases: string[]) => {` |
| `buildModifyState` | L1126-L1133 | 8 | `function buildModifyState(activeField: ModifyState["activeField"], pendingFields: ModifyField[] = []): ModifyState \| null {` |
| `buildModifyPreviewState` | L1135-L1143 | 9 | `function buildModifyPreviewState(` |
| `buildModifyPreviewPatch` | L1145-L1159 | 15 | `function buildModifyPreviewPatch(` |
| `applyModifyPreviewPatch` | L1161-L1174 | 14 | `function applyModifyPreviewPatch(` |
| `buildModifyPreviewReply` | L1176-L1249 | 74 | `function buildModifyPreviewReply(` |
| `buildModifyPreviewReminder` | L1251-L1257 | 7 | `function buildModifyPreviewReminder(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyPreviewRejectedReply` | L1259-L1265 | 7 | `function buildModifyPreviewRejectedReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyInactiveTargetReply` | L1267-L1273 | 7 | `function buildModifyInactiveTargetReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyReservationCodeNotFoundReply` | L1275-L1281 | 7 | `function buildModifyReservationCodeNotFoundReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyMissingPatchReply` | L1283-L1289 | 7 | `function buildModifyMissingPatchReply(lang: "es" \| "en" \| "pt"): string {` |
| `validateModifySnapshot` | L1291-L1314 | 24 | `function validateModifySnapshot(` |
| `persistModifyPreviewContext` | L1316-L1334 | 19 | `async function persistModifyPreviewContext(` |
| `extractModifyAvailabilitySupplementalLines` | L1336-L1376 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `buildModifyDatesPreviewWithAvailability` | L1378-L1392 | 15 | `async function buildModifyDatesPreviewWithAvailability(` |
| `resolveCurrentModifyPreviewTarget` | L1394-L1404 | 11 | `function resolveCurrentModifyPreviewTarget(pre: PreLLMResult): ReservationReferenceTarget \| null {` |
| `buildConversationFocus` | L1406-L1413 | 8 | `function buildConversationFocus(subFlow: ConversationFocus["subFlow"]): ConversationFocus {` |
| `getConversationFocus` | L1415-L1434 | 20 | `function getConversationFocus(state?: Partial<{` |
| `shouldSwitchFlow` | L1436-L1441 | 6 | `function shouldSwitchFlow(` |
| `buildModifyFieldPrompt` | L1443-L1457 | 15 | `function buildModifyFieldPrompt(lang: "es" \| "en" \| "pt", activeField: ModifyState["activeField"]): string {` |
| `getNextCreateFlowMissingField` | L1469-L1476 | 8 | `function getNextCreateFlowMissingField(slots: ReservationSlotsStrict): CreateFlowMissingField {` |
| `getCreateFlowMissingFields` | L1478-L1486 | 9 | `function getCreateFlowMissingFields(slots: ReservationSlotsStrict): CreateFlowMissingField[] {` |
| `buildCreateFlowPrompt` | L1488-L1508 | 21 | `function buildCreateFlowPrompt(` |
| `buildCreateDraftCapacityReply` | L1510-L1543 | 34 | `function buildCreateDraftCapacityReply(` |
| `validateCreateDraftConsistency` | L1545-L1589 | 45 | `function validateCreateDraftConsistency(` |
| `getNextAvailabilityInquiryMissingField` | L1593-L1598 | 6 | `function getNextAvailabilityInquiryMissingField(slots: ReservationSlotsStrict): AvailabilityInquiryMissingField {` |
| `buildAvailabilityInquiryPrompt` | L1600-L1612 | 13 | `function buildAvailabilityInquiryPrompt(` |
| `isExplicitCreateReservationIntent` | L1614-L1622 | 9 | `function isExplicitCreateReservationIntent(text: string): boolean {` |
| `normalizeAvailabilityInquiryText` | L1624-L1629 | 6 | `function normalizeAvailabilityInquiryText(text: string): string {` |
| `isAvailabilityInquiryIntent` | L1631-L1644 | 14 | `function isAvailabilityInquiryIntent(text: string): boolean {` |
| `isExplicitPureAvailabilityInquiryIntent` | L1646-L1651 | 6 | `function isExplicitPureAvailabilityInquiryIntent(text: string): boolean {` |
| `isAvailabilityInquiryActive` | L1653-L1656 | 4 | `function isAvailabilityInquiryActive(pre: Pick<PreLLMResult, "st" \| "prevCategory">): boolean {` |
| `buildAvailabilityInquiryFollowup` | L1658-L1664 | 7 | `function buildAvailabilityInquiryFollowup(lang: "es" \| "en" \| "pt"): string {` |
| `buildAvailabilityInquiryCreateClarification` | L1666-L1672 | 7 | `function buildAvailabilityInquiryCreateClarification(lang: "es" \| "en" \| "pt"): string {` |
| `offeredAvailabilityInquiryCreateFollowup` | L1674-L1693 | 20 | `function offeredAvailabilityInquiryCreateFollowup(` |
| `isAvailabilityInquiryCreateAdvanceIntent` | L1695-L1709 | 15 | `function isAvailabilityInquiryCreateAdvanceIntent(` |
| `shouldStartCreateFromAvailabilityInquiry` | L1711-L1718 | 8 | `function shouldStartCreateFromAvailabilityInquiry(` |
| `isAvailabilityInquiryAmbiguousAdvanceReply` | L1720-L1737 | 18 | `function isAvailabilityInquiryAmbiguousAdvanceReply(` |
| `persistAvailabilityInquiry` | L1739-L1759 | 21 | `async function persistAvailabilityInquiry(` |
| `isCreateStateReadyForQuote` | L1761-L1769 | 9 | `function isCreateStateReadyForQuote(slots: ReservationSlotsStrict): boolean {` |
| `resolveReservationFastPathSubFlow` | L1771-L1793 | 23 | `function resolveReservationFastPathSubFlow(pre: PreLLMResult, userText?: string): "create" \| "modify" {` |
| `shouldAppendFocusContinuation` | L1795-L1801 | 7 | `function shouldAppendFocusContinuation(` |
| `buildFocusContinuationPrompt` | L1811-L1864 | 54 | `function buildFocusContinuationPrompt(` |
| `menuSlots` | L1842-L1850 | 9 | `const menuSlots = (canonicalRecord` |
| `persistCreateLateralCategoryIfNeeded` | L1866-L1895 | 30 | `async function persistCreateLateralCategoryIfNeeded(` |
| `isCreateContextActive` | L1897-L1906 | 10 | `function isCreateContextActive(pre: PreLLMResult): boolean {` |
| `isPureLateralTurnWhileCreateActive` | L1908-L1927 | 20 | `function isPureLateralTurnWhileCreateActive(` |
| `buildPureCreateLateralFailsafeReply` | L1929-L1979 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistCreateDraft` | L1981-L2000 | 20 | `async function persistCreateDraft(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `persistCreateDraftSnapshot` | L2002-L2020 | 19 | `async function persistCreateDraftSnapshot(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `isModifyExecutionActive` | L2022-L2031 | 10 | `function isModifyExecutionActive(pre: PreLLMResult): boolean {` |
| `getModifyExecutionReservationId` | L2033-L2048 | 16 | `function getModifyExecutionReservationId(` |
| `persistModifyExecutionContext` | L2050-L2053 | 4 | `async function persistModifyExecutionContext(` |
| `executeModifyReservationWithSnapshot` | L2068-L2096 | 29 | `async function executeModifyReservationWithSnapshot(` |
| `getRecentModifyRoomTypeCandidate` | L2098-L2108 | 11 | `function getRecentModifyRoomTypeCandidate(` |
| `shouldPersistCreateAvailabilityVerification` | L2110-L2125 | 16 | `function shouldPersistCreateAvailabilityVerification(` |
| `normalizeReferenceText` | L2152-L2157 | 6 | `function normalizeReferenceText(text: string): string {` |
| `toISODateOffset` | L2159-L2164 | 6 | `function toISODateOffset(days: number): string {` |
| `getEffectiveActiveReservationContext` | L2166-L2187 | 22 | `function getEffectiveActiveReservationContext(state: any): ActiveReservationContext \| undefined {` |
| `normalizeCanonicalReservationStatus` | L2189-L2194 | 6 | `function normalizeCanonicalReservationStatus(status: string \| null \| undefined): CanonicalReservationRecord["canonicalStatus"] {` |
| `hasMaterializedReservationPayload` | L2196-L2205 | 10 | `function hasMaterializedReservationPayload(item: any): boolean {` |
| `isCanonicalReservationRecordEligible` | L2207-L2212 | 6 | `function isCanonicalReservationRecordEligible(item: any): boolean {` |
| `historyContainsReservationId` | L2214-L2220 | 7 | `function historyContainsReservationId(` |
| `shouldPreserveLastReservationRecord` | L2222-L2228 | 7 | `function shouldPreserveLastReservationRecord(` |
| `buildReservationCanonicalState` | L2230-L2267 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `buildCanonicalReservationRecords` | L2269-L2271 | 3 | `function buildCanonicalReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `collectPersistedReservationRecords` | L2273-L2278 | 6 | `function collectPersistedReservationRecords(state: any): LastReservation[] {` |
| `getMergedIntoGuestId` | L2280-L2285 | 6 | `function getMergedIntoGuestId(guest: { tags?: unknown } \| null \| undefined): string \| undefined {` |
| `getCanonicalReservationRecordById` | L2287-L2293 | 7 | `function getCanonicalReservationRecordById(` |
| `buildCanonicalReservationTarget` | L2295-L2320 | 26 | `function buildCanonicalReservationTarget(` |
| `resolveConfirmedReservationFollowupSnapshot` | L2322-L2324 | 3 | `function resolveConfirmedReservationFollowupSnapshot(` |
| `buildReservationListAnswer` | L2351-L2426 | 76 | `function buildReservationListAnswer(` |
| `safeFindGuestByAnyId` | L2428-L2436 | 9 | `async function safeFindGuestByAnyId(hotelId: string, rawId: string) {` |
| `safeGetConversationsForGuestPerspective` | L2438-L2450 | 13 | `async function safeGetConversationsForGuestPerspective(input: {` |
| `resolveReservationListSource` | L2452-L2515 | 64 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildReservationReferenceCandidates` | L2517-L2554 | 38 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildOrderedReservationHistoryCandidates` | L2556-L2569 | 14 | `function buildOrderedReservationHistoryCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildActionableReservationCandidates` | L2571-L2583 | 13 | `function buildActionableReservationCandidates(state: any): ReservationReferenceTarget[] {` |
| `resolveSingleActionableReservationTarget` | L2585-L2588 | 4 | `function resolveSingleActionableReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `extractReservationOrdinalReferenceSpec` | L2590-L2597 | 8 | `function extractReservationOrdinalReferenceSpec(text: string): ReservationOrdinalReference \| null {` |
| `extractReservationOrdinalReference` | L2599-L2602 | 4 | `function extractReservationOrdinalReference(text: string): "first" \| "second" \| "third" \| "fourth" \| "last" \| null {` |
| `validateOrdinalReservationReference` | L2604-L2625 | 22 | `function validateOrdinalReservationReference(` |
| `resolveValidatedOrdinalReservationTarget` | L2627-L2633 | 7 | `function resolveValidatedOrdinalReservationTarget(` |
| `buildOutOfRangeReservationReferenceReply` | L2635-L2656 | 22 | `function buildOutOfRangeReservationReferenceReply(` |
| `buildReservationReferenceGuardReply` | L2658-L2666 | 9 | `function buildReservationReferenceGuardReply(` |
| `buildAmbiguousReservationSelectionReply` | L2668-L2686 | 19 | `function buildAmbiguousReservationSelectionReply(` |
| `getAmbiguousReservationAction` | L2688-L2700 | 13 | `function getAmbiguousReservationAction(` |
| `resolveExplicitOrdinalReservationTarget` | L2714-L2716 | 3 | `function resolveExplicitOrdinalReservationTarget(state: any, userText: string): ReservationReferenceTarget \| null {` |
| `getReservationReferenceTargetById` | L2718-L2723 | 6 | `function getReservationReferenceTargetById(state: any, reservationId?: string \| null): ReservationReferenceTarget \| null {` |
| `resolveSelectedReservationTarget` | L2725-L2729 | 5 | `function resolveSelectedReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `resolveReservationReference` | L2731-L2838 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `buildReservationReferenceClarification` | L2840-L2846 | 7 | `function buildReservationReferenceClarification(lang: "es" \| "en" \| "pt"): string {` |
| `getRecentHistorySafe` | L2848-L2856 | 9 | `async function getRecentHistorySafe(` |
| `toStrictSlots` | L2858-L2867 | 10 | `function toStrictSlots(slots?: DbReservationSlots \| null): ReservationSlotsStrict {` |
| `mergeReservationSlots` | L2869-L2883 | 15 | `function mergeReservationSlots(` |
| `toLC` | L2885-L2890 | 6 | `function toLC(msg: ChannelMessage) {` |
| `getRecentHistory` | L2898-L2928 | 31 | `async function getRecentHistory(` |
| `extractTextFromLCContent` | L2931-L2946 | 16 | `function extractTextFromLCContent(content: any): string {` |
| `extractLastAIText` | L2948-L2959 | 12 | `function extractLastAIText(messages: any[] \| undefined): string {` |
| `emitReply` | L2974-L2981 | 8 | `async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: RichPayload) {` |
| `ruleBasedFallback` | L2984-L3003 | 20 | `function ruleBasedFallback(lang: string, userText: string): string {` |
| `t` | L2985-L2994 | 10 | `const t = (userText \|\| "").toLowerCase();` |
| `detectIntent` | L3006-L3023 | 18 | `export function detectIntent(` |
| `t` | L3010-L3037 | 28 | `const t = (userText \|\| "").toLowerCase();` |
| `mapStructuredIntentToCategory` | L3026-L3050 | 25 | `export function mapStructuredIntentToCategory(` |
| `looksTransactionalPricingIntent` | L3052-L3062 | 11 | `function looksTransactionalPricingIntent(text: string): boolean {` |
| `detectDominantTurnDomain` | L3071-L3130 | 60 | `function detectDominantTurnDomain(` |
| `isExplicitModifyExitTurn` | L3133-L3138 | 6 | `function isExplicitModifyExitTurn(text: string): boolean {` |
| `buildPricingClarificationReply` | L3140-L3159 | 20 | `function buildPricingClarificationReply(` |
| `isRoomTypeFollowupInReservation` | L3161-L3173 | 13 | `function isRoomTypeFollowupInReservation(` |
| `isGuestsFollowupInReservation` | L3175-L3196 | 22 | `function isGuestsFollowupInReservation(` |
| `isGuestNameFollowupInReservation` | L3198-L3208 | 11 | `function isGuestNameFollowupInReservation(` |
| `hasActiveReservationDomain` | L3210-L3243 | 34 | `function hasActiveReservationDomain(pre: PreLLMResult): boolean {` |
| `isReservationConfirmSignal` | L3245-L3249 | 5 | `function isReservationConfirmSignal(text: string): boolean {` |
| `isStrictCreateProposalConfirmation` | L3251-L3259 | 9 | `function isStrictCreateProposalConfirmation(text: string): boolean {` |
| `isQuotedCreateNegativeReply` | L3261-L3264 | 4 | `function isQuotedCreateNegativeReply(text: string): boolean {` |
| `buildQuotedCreateConfirmClarification` | L3266-L3272 | 7 | `function buildQuotedCreateConfirmClarification(lang: "es" \| "en" \| "pt"): string {` |
| `buildQuotedCreateProposalPausedReply` | L3274-L3280 | 7 | `function buildQuotedCreateProposalPausedReply(lang: "es" \| "en" \| "pt"): string {` |
| `isPendingCreateProposalContext` | L3282-L3299 | 18 | `function isPendingCreateProposalContext(` |
| `hasStrongReservationDomainExitIntent` | L3301-L3308 | 8 | `function hasStrongReservationDomainExitIntent(text: string): boolean {` |
| `isReservationSnapshotFollowupSignal` | L3310-L3325 | 16 | `function isReservationSnapshotFollowupSignal(pre: PreLLMResult, text: string): boolean {` |
| `isReservationModifySubstateSignal` | L3327-L3353 | 27 | `function isReservationModifySubstateSignal(pre: PreLLMResult, text: string): boolean {` |
| `getReservationDomainLockSignal` | L3355-L3390 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `buildReservationDomainLockReply` | L3392-L3402 | 11 | `function buildReservationDomainLockReply(` |
| `knownSlots` | L3418-L3426 | 9 | `const knownSlots = (canonicalRecord` |
| `isReservationFlowStillActive` | L3515-L3525 | 11 | `function isReservationFlowStillActive(pre: PreLLMResult): boolean {` |
| `shouldUseReservationLocalFallback` | L3527-L3578 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L3580-L3715 | 136 | `function buildReservationLocalFallbackReply(` |
| `knownSlots` | L3598-L3606 | 9 | `const knownSlots = (canonicalRecord` |
| `assessReservationDateCoherence` | L3717-L3730 | 14 | `function assessReservationDateCoherence(` |
| `extractRawOrderedDateRange` | L3732-L3774 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `toIso` | L3737-L3743 | 7 | `const toIso = (token: string) => {` |
| `anchorCreateDayRangeToDraft` | L3776-L3812 | 37 | `function anchorCreateDayRangeToDraft(` |
| `hasNumericDateRangeWithoutYear` | L3814-L3818 | 5 | `function hasNumericDateRangeWithoutYear(text: string): boolean {` |
| `extractRelativeWeekendDateRange` | L3820-L3843 | 24 | `function extractRelativeWeekendDateRange(` |
| `extractRelativeWeekdayRange` | L3845-L3881 | 37 | `function extractRelativeWeekdayRange(` |
| `extractRelativeWeekdayDate` | L3883-L3897 | 15 | `function extractRelativeWeekdayDate(` |
| `extractSupportedTemporalDateRange` | L3899-L3912 | 14 | `async function extractSupportedTemporalDateRange(` |
| `detectModifyTemporalSideIntent` | L3914-L3916 | 3 | `function detectModifyTemporalSideIntent(` |
| `buildModifyPartialDateSlots` | L3929-L3931 | 3 | `function buildModifyPartialDateSlots(` |
| `resolveModifyDatesContextualMissingSide` | L3951-L3964 | 14 | `function resolveModifyDatesContextualMissingSide(` |
| `detectShortRelativeWeekday` | L3966-L3983 | 18 | `function detectShortRelativeWeekday(text: string): number \| undefined {` |
| `firstWeekdayStrictlyAfter` | L3985-L3993 | 9 | `function firstWeekdayStrictlyAfter(baseIso: string, weekday: number): string \| undefined {` |
| `firstWeekdayOnOrAfter` | L3995-L4002 | 8 | `function firstWeekdayOnOrAfter(baseIso: string, weekday: number): string \| undefined {` |
| `delta` | L3999-L4006 | 8 | `const delta = (weekday - candidate.getUTCDay() + 7) % 7;` |
| `anchorRelativeWeekdayToCheckOutAfterCheckIn` | L4004-L4006 | 3 | `function anchorRelativeWeekdayToCheckOutAfterCheckIn(` |
| `anchorModifyRelativeDateToContext` | L4021-L4024 | 4 | `function anchorModifyRelativeDateToContext(` |
| `resolveCreateDatesContextualMissingSide` | L4037-L4054 | 18 | `function resolveCreateDatesContextualMissingSide(` |
| `anchorCreateRelativeDateToContext` | L4056-L4059 | 4 | `function anchorCreateRelativeDateToContext(` |
| `anchorAvailabilityInquiryDateToContext` | L4093-L4096 | 4 | `function anchorAvailabilityInquiryDateToContext(` |
| `hasModifyDateCorrectionCue` | L4124-L4128 | 5 | `function hasModifyDateCorrectionCue(text: string): boolean {` |
| `hasModifyDatesEntrySignal` | L4130-L4132 | 3 | `function hasModifyDatesEntrySignal(` |
| `buildInvalidReservationDatesReply` | L4141-L4161 | 21 | `function buildInvalidReservationDatesReply(lang: "es" \| "en" \| "pt", reason: "check_order" \| "range_too_long" \| "invalid_format"): string {` |
| `buildInvalidCreateCheckOutReply` | L4163-L4169 | 7 | `function buildInvalidCreateCheckOutReply(lang: "es" \| "en" \| "pt"): string {` |
| `detectRawReservationDateIssue` | L4171-L4194 | 24 | `function detectRawReservationDateIssue(text: string): { reason: "check_order" \| "range_too_long" \| "invalid_format" } \| null {` |
| `tryStructuredAnalyze` | L4197-L4324 | 128 | `async function tryStructuredAnalyze(params: {` |
| `preLLM` | L4386-L4597 | 212 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `lang` | L4433-L4451 | 19 | `const lang = (` |
| `pref` | L4510-L4518 | 9 | `const pref = (hotelConfig as any)?.nearbyPointsMode;` |
| `hasRecentReservationMention` | L4600-L4607 | 8 | `function hasRecentReservationMention(pre: PreLLMResult): boolean {` |
| `shouldClearSelectedReservationTargetForCategory` | L4609-L4631 | 23 | `function shouldClearSelectedReservationTargetForCategory(` |
| `looksLikeEventsQuery` | L4632-L4635 | 4 | `function looksLikeEventsQuery(text: string): boolean {` |
| `buildStateSummary` | L4636-L4645 | 10 | `function buildStateSummary(slots: ReservationSlotsStrict, st: any) {` |
| `initBodyLLMState` | L4658-L4667 | 10 | `function initBodyLLMState(pre: PreLLMResult): BodyLLMState {` |
| `toBodyLLMResult` | L4669-L4678 | 10 | `function toBodyLLMResult(state: BodyLLMState) {` |
| `tryBodyLLMTestGreetingFastpath` | L4680-L4697 | 18 | `function tryBodyLLMTestGreetingFastpath(pre: PreLLMResult, state: BodyLLMState): boolean {` |
| `tryConversationalGuestNameCapture` | L4699-L4791 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `tryBodyLLMKnowledgeShortcuts` | L4793-L4970 | 178 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `looksEventIntent` | L4821-L4832 | 12 | `const looksEventIntent = (() => {` |
| `runBodyLLMGraphPath` | L4972-L5075 | 104 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `last` | L4999-L5009 | 11 | `const last = (state.graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L5034-L5044 | 11 | `const resolved = (state.graphResult as any)?.resolved;` |
| `classified` | L5035-L5044 | 10 | `const classified = (state.graphResult as any)?.classified;` |
| `rbLast` | L5058-L5068 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5060-L5068 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMStructuredEnrichment` | L5077-L5114 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `tryBodyLLMStructuredFallback` | L5116-L5145 | 30 | `async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `bodyLLM` | L5148-L11813 | 6666 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `code` | L6563-L6564 | 2 | `const code = (e as any)?.code;` |
| `prevAttempt` | L6586-L6597 | 12 | `const prevAttempt = (pre.st as any)?.lastEmailCopyAttempt;` |
| `toDDMMYYYY` | L6608-L6608 | 1 | `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };` |
| `prevFailures` | L6658-L6669 | 12 | `const prevFailures = (prevAttempt?.failures \|\| 0) + 1;` |
| `quotedTurnDirectWeekdayRange` | L8335-L8344 | 10 | `const quotedTurnDirectWeekdayRange = (() => {` |
| `toDDMMYYYY` | L8586-L8589 | 4 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L8619-L8621 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `toDDMMYYYY` | L8657-L8659 | 3 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L8687-L8689 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `jidFromGuest` | L8715-L8782 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L8716-L8782 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `code` | L8762-L8763 | 2 | `const code = (e as any)?.code;` |
| `code` | L8818-L8819 | 2 | `const code = (e as any)?.code;` |
| `jidFromGuest` | L8836-L8904 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L8837-L8904 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `code` | L8883-L8884 | 2 | `const code = (e as any)?.code;` |
| `code` | L8940-L8941 | 2 | `const code = (e as any)?.code;` |
| `code` | L8997-L8998 | 2 | `const code = (e as any)?.code;` |
| `pendingAvailabilityVerification` | L9025-L9025 | 1 | `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;` |
| `pendingCancellation` | L9040-L9040 | 1 | `const pendingCancellation = (pre.st as any)?.pendingCancellation as { reservationId?: string; awaitingConfirmation?: boolean } \| undefined;` |
| `snapshotSlots` | L9814-L9822 | 9 | `const snapshotSlots = (canonicalSlots` |
| `looksEventIntent` | L9885-L9899 | 15 | `const looksEventIntent = (() => {` |
| `last` | L10163-L10173 | 11 | `const last = (graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L10202-L10212 | 11 | `const resolved = (graphResult as any)?.resolved;` |
| `classified` | L10203-L10212 | 10 | `const classified = (graphResult as any)?.classified;` |
| `rbLast` | L10226-L10236 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L10228-L10236 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `cons` | L10819-L10830 | 12 | `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({` |
| `txt` | L10864-L10866 | 3 | `const txt = (finalText \|\| '').trim();` |
| `toDDMMYYYY` | L10869-L10873 | 5 | `const toDDMMYYYY = (iso?: string) => {` |
| `currentDates` | L10897-L10897 | 1 | `const currentDates = (String(pre.msg.content \|\| '').match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) \|\| []).map(d => d);` |
| `toISO` | L10910-L10912 | 3 | `const toISO = (d: string) => {` |
| `toDDMMYYYY` | L10917-L10917 | 1 | `const toDDMMYYYY = (iso?: string) => iso ? iso.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') : '';` |
| `stripOffTopicAmenitiesTail` | L11321-L11343 | 23 | `function stripOffTopicAmenitiesTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripOffTopicBillingTail` | L11345-L11370 | 26 | `function stripOffTopicBillingTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `harmonizeBillingCurrencyAnswer` | L11372-L11424 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `ensureBillingContextualFollowup` | L11426-L11438 | 13 | `function ensureBillingContextualFollowup(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildDeterministicBillingReply` | L11440-L11502 | 63 | `async function buildDeterministicBillingReply(` |
| `textNorm` | L11455-L11459 | 5 | `const textNorm = (userText \|\| "").toLowerCase();` |
| `applyCommittedHotelTone` | L11504-L11539 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripGlobalTailNoise` | L11541-L11552 | 12 | `function stripGlobalTailNoise(text: string): string {` |
| `buildModifyGuidance` | L11554-L11569 | 16 | `function buildModifyGuidance(` |
| `es` | L11559-L11561 | 3 | `const es = () =>` |
| `en` | L11562-L11564 | 3 | `const en = () =>` |
| `pt` | L11565-L11567 | 3 | `const pt = () =>` |
| `isContactHotelText` | L11571-L11580 | 10 | `function isContactHotelText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L11572-L11588 | 17 | `const t = (text \|\| "").toLowerCase();` |
| `isQuoteOrConfirmText` | L11588-L11596 | 9 | `function isQuoteOrConfirmText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L11589-L11599 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `wantsGenericModify` | L11599-L11616 | 18 | `function wantsGenericModify(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L11600-L11610 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `isExecutableModifyIntent` | L11618-L11625 | 8 | `function isExecutableModifyIntent(` |
| `buildModifyInquiryReply` | L11627-L11651 | 25 | `function buildModifyInquiryReply(lang: "es" \| "en" \| "pt", text: string): string \| null {` |
| `buildModifyOptionsMenu` | L11653-L11708 | 56 | `function buildModifyOptionsMenu(` |
| `buildModifyReservationSelectionIntro` | L11710-L11743 | 34 | `function buildModifyReservationSelectionIntro(` |
| `isGenericFallbackText` | L11747-L11756 | 10 | `function isGenericFallbackText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L11748-L11759 | 12 | `const t = (text \|\| "").toLowerCase();` |
| `parseReservationCode` | L11759-L11768 | 10 | `function parseReservationCode(text: string): string \| undefined {` |
| `extractReservationCodeLikeToken` | L11769-L11772 | 4 | `function extractReservationCodeLikeToken(text: string): string \| undefined {` |
| `buildAskReservationCode` | L11773-L11777 | 5 | `function buildAskReservationCode(lang: "es" \| "en" \| "pt"): string {` |
| `buildReservationCopySummary` | L11781-L11791 | 11 | `function buildReservationCopySummary(pre: PreLLMResult, nextSlots: ReservationSlotsStrict) {` |
| `detectWhatsAppCopyRequest` | L11793-L11811 | 19 | `function detectWhatsAppCopyRequest(pre: PreLLMResult, text: string): { matched: boolean; mode?: 'explicit' \| 'light'; inlinePhone?: string } {` |
| `posLLM` | L11814-L11858 | 45 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L11859-L12183 | 325 | `export async function handleIncomingMessage(` |
| `respCategory` | L12064-L12089 | 26 | `const respCategory = (body?.graphResult?.category \|\| body?.nextCategory \|\| pre.prevCategory) as string \| undefined;` |
| `respPromptKey` | L12065-L12089 | 25 | `const respPromptKey = (` |
| `respContentVersion` | L12071-L12089 | 19 | `const respContentVersion = (` |
| `respSource` | L12076-L12089 | 14 | `const respSource = (` |
| `respSalesStage` | L12080-L12089 | 10 | `const respSalesStage = (body?.graphResult?.salesStage \|\| pre.st?.salesStage) as string \| undefined;` |
