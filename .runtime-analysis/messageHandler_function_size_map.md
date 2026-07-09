# messageHandler function size map

Archivo: `lib/handlers/messageHandler.ts`
Líneas totales: 12322
Declaraciones detectadas: 309

> Scan estático readonly. Los rangos son aproximados y dependen de llaves `{}`.

---

## 1. Funciones clave

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `buildReservationCanonicalState` | L2231-L2268 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `resolveReservationReference` | L2732-L2839 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `detectDominantTurnDomain` | L3072-L3131 | 60 | `function detectDominantTurnDomain(` |
| `getReservationDomainLockSignal` | L3356-L3391 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `shouldUseReservationLocalFallback` | L3528-L3579 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L3581-L3716 | 136 | `function buildReservationLocalFallbackReply(` |
| `assessReservationDateCoherence` | L3718-L3731 | 14 | `function assessReservationDateCoherence(` |
| `tryStructuredAnalyze` | L4198-L4325 | 128 | `async function tryStructuredAnalyze(params: {` |
| `preLLM` | L4387-L4598 | 212 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `bodyLLM` | L5257-L11996 | 6740 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `posLLM` | L11923-L11967 | 45 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L11968-L12322 | 325 | `export async function handleIncomingMessage(` |

---

## 2. Declaraciones más grandes

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `bodyLLM` | L5257-L11996 | 6740 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `preLLM` | L4387-L4598 | 212 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `tryBodyLLMKnowledgeShortcuts` | L4839-L5049 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationLocalFallbackReply` | L3581-L3716 | 136 | `function buildReservationLocalFallbackReply(` |
| `tryStructuredAnalyze` | L4198-L4325 | 128 | `async function tryStructuredAnalyze(params: {` |
| `resolveReservationReference` | L2732-L2839 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `applyExplicitConversationalActorToGuest` | L282-L386 | 105 | `async function applyExplicitConversationalActorToGuest(` |
| `runBodyLLMGraphPath` | L5051-L5154 | 104 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `tryConversationalGuestNameCapture` | L4745-L4837 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `getObjectiveContext` | L851-L926 | 76 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `buildReservationListAnswer` | L2352-L2427 | 76 | `function buildReservationListAnswer(` |
| `buildModifyPreviewReply` | L1177-L1250 | 74 | `function buildModifyPreviewReply(` |
| `jidFromGuest` | L8915-L8983 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromGuest` | L8794-L8861 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L8916-L8983 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `jidFromConv` | L8795-L8861 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `resolveReservationListSource` | L2453-L2516 | 64 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildReservationSnapshotAnswer` | L483-L545 | 63 | `function buildReservationSnapshotAnswer(` |
| `buildDeterministicBillingReply` | L11549-L11611 | 63 | `async function buildDeterministicBillingReply(` |
| `detectDominantTurnDomain` | L3072-L3131 | 60 | `function detectDominantTurnDomain(` |
| `buildModifyOptionsMenu` | L11762-L11817 | 56 | `function buildModifyOptionsMenu(` |
| `buildFocusContinuationPrompt` | L1812-L1865 | 54 | `function buildFocusContinuationPrompt(` |
| `harmonizeBillingCurrencyAnswer` | L11481-L11533 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `shouldUseReservationLocalFallback` | L3528-L3579 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildPureCreateLateralFailsafeReply` | L1930-L1980 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `validateCreateDraftConsistency` | L1546-L1590 | 45 | `function validateCreateDraftConsistency(` |
| `extractRawOrderedDateRange` | L3733-L3775 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `posLLM` | L11923-L11967 | 45 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `extractModifyAvailabilitySupplementalLines` | L1337-L1377 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `extractExplicitConversationalActorName` | L241-L280 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `buildReservationCanonicalState` | L2231-L2268 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `buildReservationReferenceCandidates` | L2518-L2555 | 38 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `tryBodyLLMStructuredEnrichment` | L5156-L5193 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `detectReservationSnapshotQuery` | L445-L481 | 37 | `function detectReservationSnapshotQuery(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L809-L845 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `anchorCreateDayRangeToDraft` | L3777-L3813 | 37 | `function anchorCreateDayRangeToDraft(` |
| `extractRelativeWeekdayRange` | L3846-L3882 | 37 | `function extractRelativeWeekdayRange(` |
| `getReservationDomainLockSignal` | L3356-L3391 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `applyCommittedHotelTone` | L11613-L11648 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildCreateDraftCapacityReply` | L1511-L1544 | 34 | `function buildCreateDraftCapacityReply(` |

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
| `applyExplicitConversationalActorToGuest` | L282-L386 | 105 | `async function applyExplicitConversationalActorToGuest(` |
| `buildAvailabilityGuestContext` | L388-L405 | 18 | `function buildAvailabilityGuestContext(pre: PreLLMResult, rawTurnText: string) {` |
| `isCreateWordDatesTraceCandidate` | L407-L417 | 11 | `function isCreateWordDatesTraceCandidate(text: string): boolean {` |
| `traceCreateWordDates` | L419-L426 | 8 | `function traceCreateWordDates(step: string, payload: Record<string, unknown>) {` |
| `getConfiguredCheckTimes` | L428-L441 | 14 | `function getConfiguredCheckTimes(hotel: any): { checkIn?: string; checkOut?: string } {` |
| `detectReservationSnapshotQuery` | L445-L481 | 37 | `function detectReservationSnapshotQuery(` |
| `buildReservationSnapshotAnswer` | L483-L545 | 63 | `function buildReservationSnapshotAnswer(` |
| `normalizeRuntimeLanguage` | L547-L554 | 8 | `function normalizeRuntimeLanguage(value: unknown): "es" \| "en" \| "pt" \| null {` |
| `resolveReservationSnapshotLanguage` | L556-L566 | 11 | `function resolveReservationSnapshotLanguage(pre: {` |
| `resolveReservationConversationLanguage` | L568-L574 | 7 | `function resolveReservationConversationLanguage(pre: {` |
| `combineModes` | L634-L636 | 3 | `function combineModes(a?: ChannelMode, b?: ChannelMode): ChannelMode {` |
| `isSafeAutosendCategory` | L638-L641 | 4 | `function isSafeAutosendCategory(cat?: string \| null): boolean {` |
| `applyConversationalProposalVocative` | L643-L646 | 4 | `function applyConversationalProposalVocative(` |
| `buildConversationalGreetingNamePrompt` | L665-L674 | 10 | `function buildConversationalGreetingNamePrompt(` |
| `buildConversationalGreetingKnownGuest` | L683-L687 | 5 | `function buildConversationalGreetingKnownGuest(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameCapturedReply` | L689-L696 | 8 | `function buildConversationalNameCapturedReply(` |
| `buildConversationalNameDeclinedReply` | L705-L709 | 5 | `function buildConversationalNameDeclinedReply(lang: "es" \| "en" \| "pt"): string {` |
| `wasConversationalNameRequested` | L711-L717 | 7 | `function wasConversationalNameRequested(` |
| `hasRecentConversationalNameHandshake` | L719-L731 | 13 | `function hasRecentConversationalNameHandshake(` |
| `isConversationalNameDecline` | L733-L735 | 3 | `function isConversationalNameDecline(text: string): boolean {` |
| `isPureConversationalGreeting` | L737-L741 | 5 | `function isPureConversationalGreeting(text: string): boolean {` |
| `hasPriorConversationTurns` | L743-L750 | 8 | `function hasPriorConversationTurns(lcHistory: (HumanMessage \| AIMessage)[], currentUserText: string): boolean {` |
| `deriveClassifierSource` | L774-L780 | 7 | `function deriveClassifierSource(graphResult: any): RoutingDecisionLog["classifier_source"] {` |
| `emitRoutingDecision` | L782-L792 | 11 | `function emitRoutingDecision(` |
| `emitStableIntentRouting` | L794-L804 | 11 | `function emitStableIntentRouting(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L809-L845 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `setUsePrePosLLM` | L849-L849 | 1 | `export function setUsePrePosLLM(val: boolean) { USE_PRELLM_POSLLM = val; }` |
| `getObjectiveContext` | L851-L926 | 76 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `lang` | L894-L911 | 18 | `const lang = (` |
| `safeNowISO` | L927-L927 | 1 | `function safeNowISO() { return new Date().toISOString(); }` |
| `getHotelConfigSafe` | L929-L935 | 7 | `async function getHotelConfigSafe(hotelId: string) {` |
| `computeInModifyMode` | L937-L949 | 13 | `function computeInModifyMode(` |
| `wantsAdditionalReservation` | L951-L956 | 6 | `function wantsAdditionalReservation(` |
| `mergeReservationHistory` | L976-L983 | 8 | `function mergeReservationHistory(` |
| `buildPersistedReservationRecord` | L985-L1003 | 19 | `function buildPersistedReservationRecord(` |
| `buildDraftReservationContext` | L1005-L1013 | 9 | `function buildDraftReservationContext(` |
| `buildFocusedReservationContext` | L1015-L1025 | 11 | `function buildFocusedReservationContext(` |
| `buildSelectedReservationTarget` | L1027-L1041 | 15 | `function buildSelectedReservationTarget(` |
| `buildSelectedReservationTargetFromReference` | L1043-L1050 | 8 | `function buildSelectedReservationTargetFromReference(` |
| `normalizeModifyFieldQueue` | L1054-L1061 | 8 | `function normalizeModifyFieldQueue(fields: Array<ModifyField \| null \| undefined \| false>): ModifyField[] {` |
| `getNextQueuedModifyState` | L1063-L1067 | 5 | `function getNextQueuedModifyState(modifyState?: ModifyState \| null): ModifyState \| null {` |
| `resolveRequestedModifyFieldsInOrder` | L1069-L1071 | 3 | `function resolveRequestedModifyFieldsInOrder(` |
| `pushEarliestPhrase` | L1075-L1082 | 8 | `const pushEarliestPhrase = (field: ModifyField, phrases: string[]) => {` |
| `buildModifyState` | L1127-L1134 | 8 | `function buildModifyState(activeField: ModifyState["activeField"], pendingFields: ModifyField[] = []): ModifyState \| null {` |
| `buildModifyPreviewState` | L1136-L1144 | 9 | `function buildModifyPreviewState(` |
| `buildModifyPreviewPatch` | L1146-L1160 | 15 | `function buildModifyPreviewPatch(` |
| `applyModifyPreviewPatch` | L1162-L1175 | 14 | `function applyModifyPreviewPatch(` |
| `buildModifyPreviewReply` | L1177-L1250 | 74 | `function buildModifyPreviewReply(` |
| `buildModifyPreviewReminder` | L1252-L1258 | 7 | `function buildModifyPreviewReminder(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyPreviewRejectedReply` | L1260-L1266 | 7 | `function buildModifyPreviewRejectedReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyInactiveTargetReply` | L1268-L1274 | 7 | `function buildModifyInactiveTargetReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyReservationCodeNotFoundReply` | L1276-L1282 | 7 | `function buildModifyReservationCodeNotFoundReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyMissingPatchReply` | L1284-L1290 | 7 | `function buildModifyMissingPatchReply(lang: "es" \| "en" \| "pt"): string {` |
| `validateModifySnapshot` | L1292-L1315 | 24 | `function validateModifySnapshot(` |
| `persistModifyPreviewContext` | L1317-L1335 | 19 | `async function persistModifyPreviewContext(` |
| `extractModifyAvailabilitySupplementalLines` | L1337-L1377 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `buildModifyDatesPreviewWithAvailability` | L1379-L1393 | 15 | `async function buildModifyDatesPreviewWithAvailability(` |
| `resolveCurrentModifyPreviewTarget` | L1395-L1405 | 11 | `function resolveCurrentModifyPreviewTarget(pre: PreLLMResult): ReservationReferenceTarget \| null {` |
| `buildConversationFocus` | L1407-L1414 | 8 | `function buildConversationFocus(subFlow: ConversationFocus["subFlow"]): ConversationFocus {` |
| `getConversationFocus` | L1416-L1435 | 20 | `function getConversationFocus(state?: Partial<{` |
| `shouldSwitchFlow` | L1437-L1442 | 6 | `function shouldSwitchFlow(` |
| `buildModifyFieldPrompt` | L1444-L1458 | 15 | `function buildModifyFieldPrompt(lang: "es" \| "en" \| "pt", activeField: ModifyState["activeField"]): string {` |
| `getNextCreateFlowMissingField` | L1470-L1477 | 8 | `function getNextCreateFlowMissingField(slots: ReservationSlotsStrict): CreateFlowMissingField {` |
| `getCreateFlowMissingFields` | L1479-L1487 | 9 | `function getCreateFlowMissingFields(slots: ReservationSlotsStrict): CreateFlowMissingField[] {` |
| `buildCreateFlowPrompt` | L1489-L1509 | 21 | `function buildCreateFlowPrompt(` |
| `buildCreateDraftCapacityReply` | L1511-L1544 | 34 | `function buildCreateDraftCapacityReply(` |
| `validateCreateDraftConsistency` | L1546-L1590 | 45 | `function validateCreateDraftConsistency(` |
| `getNextAvailabilityInquiryMissingField` | L1594-L1599 | 6 | `function getNextAvailabilityInquiryMissingField(slots: ReservationSlotsStrict): AvailabilityInquiryMissingField {` |
| `buildAvailabilityInquiryPrompt` | L1601-L1613 | 13 | `function buildAvailabilityInquiryPrompt(` |
| `isExplicitCreateReservationIntent` | L1615-L1623 | 9 | `function isExplicitCreateReservationIntent(text: string): boolean {` |
| `normalizeAvailabilityInquiryText` | L1625-L1630 | 6 | `function normalizeAvailabilityInquiryText(text: string): string {` |
| `isAvailabilityInquiryIntent` | L1632-L1645 | 14 | `function isAvailabilityInquiryIntent(text: string): boolean {` |
| `isExplicitPureAvailabilityInquiryIntent` | L1647-L1652 | 6 | `function isExplicitPureAvailabilityInquiryIntent(text: string): boolean {` |
| `isAvailabilityInquiryActive` | L1654-L1657 | 4 | `function isAvailabilityInquiryActive(pre: Pick<PreLLMResult, "st" \| "prevCategory">): boolean {` |
| `buildAvailabilityInquiryFollowup` | L1659-L1665 | 7 | `function buildAvailabilityInquiryFollowup(lang: "es" \| "en" \| "pt"): string {` |
| `buildAvailabilityInquiryCreateClarification` | L1667-L1673 | 7 | `function buildAvailabilityInquiryCreateClarification(lang: "es" \| "en" \| "pt"): string {` |
| `offeredAvailabilityInquiryCreateFollowup` | L1675-L1694 | 20 | `function offeredAvailabilityInquiryCreateFollowup(` |
| `isAvailabilityInquiryCreateAdvanceIntent` | L1696-L1710 | 15 | `function isAvailabilityInquiryCreateAdvanceIntent(` |
| `shouldStartCreateFromAvailabilityInquiry` | L1712-L1719 | 8 | `function shouldStartCreateFromAvailabilityInquiry(` |
| `isAvailabilityInquiryAmbiguousAdvanceReply` | L1721-L1738 | 18 | `function isAvailabilityInquiryAmbiguousAdvanceReply(` |
| `persistAvailabilityInquiry` | L1740-L1760 | 21 | `async function persistAvailabilityInquiry(` |
| `isCreateStateReadyForQuote` | L1762-L1770 | 9 | `function isCreateStateReadyForQuote(slots: ReservationSlotsStrict): boolean {` |
| `resolveReservationFastPathSubFlow` | L1772-L1794 | 23 | `function resolveReservationFastPathSubFlow(pre: PreLLMResult, userText?: string): "create" \| "modify" {` |
| `shouldAppendFocusContinuation` | L1796-L1802 | 7 | `function shouldAppendFocusContinuation(` |
| `buildFocusContinuationPrompt` | L1812-L1865 | 54 | `function buildFocusContinuationPrompt(` |
| `menuSlots` | L1843-L1851 | 9 | `const menuSlots = (canonicalRecord` |
| `persistCreateLateralCategoryIfNeeded` | L1867-L1896 | 30 | `async function persistCreateLateralCategoryIfNeeded(` |
| `isCreateContextActive` | L1898-L1907 | 10 | `function isCreateContextActive(pre: PreLLMResult): boolean {` |
| `isPureLateralTurnWhileCreateActive` | L1909-L1928 | 20 | `function isPureLateralTurnWhileCreateActive(` |
| `buildPureCreateLateralFailsafeReply` | L1930-L1980 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistCreateDraft` | L1982-L2001 | 20 | `async function persistCreateDraft(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `persistCreateDraftSnapshot` | L2003-L2021 | 19 | `async function persistCreateDraftSnapshot(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `isModifyExecutionActive` | L2023-L2032 | 10 | `function isModifyExecutionActive(pre: PreLLMResult): boolean {` |
| `getModifyExecutionReservationId` | L2034-L2049 | 16 | `function getModifyExecutionReservationId(` |
| `persistModifyExecutionContext` | L2051-L2054 | 4 | `async function persistModifyExecutionContext(` |
| `executeModifyReservationWithSnapshot` | L2069-L2097 | 29 | `async function executeModifyReservationWithSnapshot(` |
| `getRecentModifyRoomTypeCandidate` | L2099-L2109 | 11 | `function getRecentModifyRoomTypeCandidate(` |
| `shouldPersistCreateAvailabilityVerification` | L2111-L2126 | 16 | `function shouldPersistCreateAvailabilityVerification(` |
| `normalizeReferenceText` | L2153-L2158 | 6 | `function normalizeReferenceText(text: string): string {` |
| `toISODateOffset` | L2160-L2165 | 6 | `function toISODateOffset(days: number): string {` |
| `getEffectiveActiveReservationContext` | L2167-L2188 | 22 | `function getEffectiveActiveReservationContext(state: any): ActiveReservationContext \| undefined {` |
| `normalizeCanonicalReservationStatus` | L2190-L2195 | 6 | `function normalizeCanonicalReservationStatus(status: string \| null \| undefined): CanonicalReservationRecord["canonicalStatus"] {` |
| `hasMaterializedReservationPayload` | L2197-L2206 | 10 | `function hasMaterializedReservationPayload(item: any): boolean {` |
| `isCanonicalReservationRecordEligible` | L2208-L2213 | 6 | `function isCanonicalReservationRecordEligible(item: any): boolean {` |
| `historyContainsReservationId` | L2215-L2221 | 7 | `function historyContainsReservationId(` |
| `shouldPreserveLastReservationRecord` | L2223-L2229 | 7 | `function shouldPreserveLastReservationRecord(` |
| `buildReservationCanonicalState` | L2231-L2268 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `buildCanonicalReservationRecords` | L2270-L2272 | 3 | `function buildCanonicalReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `collectPersistedReservationRecords` | L2274-L2279 | 6 | `function collectPersistedReservationRecords(state: any): LastReservation[] {` |
| `getMergedIntoGuestId` | L2281-L2286 | 6 | `function getMergedIntoGuestId(guest: { tags?: unknown } \| null \| undefined): string \| undefined {` |
| `getCanonicalReservationRecordById` | L2288-L2294 | 7 | `function getCanonicalReservationRecordById(` |
| `buildCanonicalReservationTarget` | L2296-L2321 | 26 | `function buildCanonicalReservationTarget(` |
| `resolveConfirmedReservationFollowupSnapshot` | L2323-L2325 | 3 | `function resolveConfirmedReservationFollowupSnapshot(` |
| `buildReservationListAnswer` | L2352-L2427 | 76 | `function buildReservationListAnswer(` |
| `safeFindGuestByAnyId` | L2429-L2437 | 9 | `async function safeFindGuestByAnyId(hotelId: string, rawId: string) {` |
| `safeGetConversationsForGuestPerspective` | L2439-L2451 | 13 | `async function safeGetConversationsForGuestPerspective(input: {` |
| `resolveReservationListSource` | L2453-L2516 | 64 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildReservationReferenceCandidates` | L2518-L2555 | 38 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildOrderedReservationHistoryCandidates` | L2557-L2570 | 14 | `function buildOrderedReservationHistoryCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildActionableReservationCandidates` | L2572-L2584 | 13 | `function buildActionableReservationCandidates(state: any): ReservationReferenceTarget[] {` |
| `resolveSingleActionableReservationTarget` | L2586-L2589 | 4 | `function resolveSingleActionableReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `extractReservationOrdinalReferenceSpec` | L2591-L2598 | 8 | `function extractReservationOrdinalReferenceSpec(text: string): ReservationOrdinalReference \| null {` |
| `extractReservationOrdinalReference` | L2600-L2603 | 4 | `function extractReservationOrdinalReference(text: string): "first" \| "second" \| "third" \| "fourth" \| "last" \| null {` |
| `validateOrdinalReservationReference` | L2605-L2626 | 22 | `function validateOrdinalReservationReference(` |
| `resolveValidatedOrdinalReservationTarget` | L2628-L2634 | 7 | `function resolveValidatedOrdinalReservationTarget(` |
| `buildOutOfRangeReservationReferenceReply` | L2636-L2657 | 22 | `function buildOutOfRangeReservationReferenceReply(` |
| `buildReservationReferenceGuardReply` | L2659-L2667 | 9 | `function buildReservationReferenceGuardReply(` |
| `buildAmbiguousReservationSelectionReply` | L2669-L2687 | 19 | `function buildAmbiguousReservationSelectionReply(` |
| `getAmbiguousReservationAction` | L2689-L2701 | 13 | `function getAmbiguousReservationAction(` |
| `resolveExplicitOrdinalReservationTarget` | L2715-L2717 | 3 | `function resolveExplicitOrdinalReservationTarget(state: any, userText: string): ReservationReferenceTarget \| null {` |
| `getReservationReferenceTargetById` | L2719-L2724 | 6 | `function getReservationReferenceTargetById(state: any, reservationId?: string \| null): ReservationReferenceTarget \| null {` |
| `resolveSelectedReservationTarget` | L2726-L2730 | 5 | `function resolveSelectedReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `resolveReservationReference` | L2732-L2839 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `buildReservationReferenceClarification` | L2841-L2847 | 7 | `function buildReservationReferenceClarification(lang: "es" \| "en" \| "pt"): string {` |
| `getRecentHistorySafe` | L2849-L2857 | 9 | `async function getRecentHistorySafe(` |
| `toStrictSlots` | L2859-L2868 | 10 | `function toStrictSlots(slots?: DbReservationSlots \| null): ReservationSlotsStrict {` |
| `mergeReservationSlots` | L2870-L2884 | 15 | `function mergeReservationSlots(` |
| `toLC` | L2886-L2891 | 6 | `function toLC(msg: ChannelMessage) {` |
| `getRecentHistory` | L2899-L2929 | 31 | `async function getRecentHistory(` |
| `extractTextFromLCContent` | L2932-L2947 | 16 | `function extractTextFromLCContent(content: any): string {` |
| `extractLastAIText` | L2949-L2960 | 12 | `function extractLastAIText(messages: any[] \| undefined): string {` |
| `emitReply` | L2975-L2982 | 8 | `async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: RichPayload) {` |
| `ruleBasedFallback` | L2985-L3004 | 20 | `function ruleBasedFallback(lang: string, userText: string): string {` |
| `t` | L2986-L2995 | 10 | `const t = (userText \|\| "").toLowerCase();` |
| `detectIntent` | L3007-L3024 | 18 | `export function detectIntent(` |
| `t` | L3011-L3038 | 28 | `const t = (userText \|\| "").toLowerCase();` |
| `mapStructuredIntentToCategory` | L3027-L3051 | 25 | `export function mapStructuredIntentToCategory(` |
| `looksTransactionalPricingIntent` | L3053-L3063 | 11 | `function looksTransactionalPricingIntent(text: string): boolean {` |
| `detectDominantTurnDomain` | L3072-L3131 | 60 | `function detectDominantTurnDomain(` |
| `isExplicitModifyExitTurn` | L3134-L3139 | 6 | `function isExplicitModifyExitTurn(text: string): boolean {` |
| `buildPricingClarificationReply` | L3141-L3160 | 20 | `function buildPricingClarificationReply(` |
| `isRoomTypeFollowupInReservation` | L3162-L3174 | 13 | `function isRoomTypeFollowupInReservation(` |
| `isGuestsFollowupInReservation` | L3176-L3197 | 22 | `function isGuestsFollowupInReservation(` |
| `isGuestNameFollowupInReservation` | L3199-L3209 | 11 | `function isGuestNameFollowupInReservation(` |
| `hasActiveReservationDomain` | L3211-L3244 | 34 | `function hasActiveReservationDomain(pre: PreLLMResult): boolean {` |
| `isReservationConfirmSignal` | L3246-L3250 | 5 | `function isReservationConfirmSignal(text: string): boolean {` |
| `isStrictCreateProposalConfirmation` | L3252-L3260 | 9 | `function isStrictCreateProposalConfirmation(text: string): boolean {` |
| `isQuotedCreateNegativeReply` | L3262-L3265 | 4 | `function isQuotedCreateNegativeReply(text: string): boolean {` |
| `buildQuotedCreateConfirmClarification` | L3267-L3273 | 7 | `function buildQuotedCreateConfirmClarification(lang: "es" \| "en" \| "pt"): string {` |
| `buildQuotedCreateProposalPausedReply` | L3275-L3281 | 7 | `function buildQuotedCreateProposalPausedReply(lang: "es" \| "en" \| "pt"): string {` |
| `isPendingCreateProposalContext` | L3283-L3300 | 18 | `function isPendingCreateProposalContext(` |
| `hasStrongReservationDomainExitIntent` | L3302-L3309 | 8 | `function hasStrongReservationDomainExitIntent(text: string): boolean {` |
| `isReservationSnapshotFollowupSignal` | L3311-L3326 | 16 | `function isReservationSnapshotFollowupSignal(pre: PreLLMResult, text: string): boolean {` |
| `isReservationModifySubstateSignal` | L3328-L3354 | 27 | `function isReservationModifySubstateSignal(pre: PreLLMResult, text: string): boolean {` |
| `getReservationDomainLockSignal` | L3356-L3391 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `buildReservationDomainLockReply` | L3393-L3403 | 11 | `function buildReservationDomainLockReply(` |
| `knownSlots` | L3419-L3427 | 9 | `const knownSlots = (canonicalRecord` |
| `isReservationFlowStillActive` | L3516-L3526 | 11 | `function isReservationFlowStillActive(pre: PreLLMResult): boolean {` |
| `shouldUseReservationLocalFallback` | L3528-L3579 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L3581-L3716 | 136 | `function buildReservationLocalFallbackReply(` |
| `knownSlots` | L3599-L3607 | 9 | `const knownSlots = (canonicalRecord` |
| `assessReservationDateCoherence` | L3718-L3731 | 14 | `function assessReservationDateCoherence(` |
| `extractRawOrderedDateRange` | L3733-L3775 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `toIso` | L3738-L3744 | 7 | `const toIso = (token: string) => {` |
| `anchorCreateDayRangeToDraft` | L3777-L3813 | 37 | `function anchorCreateDayRangeToDraft(` |
| `hasNumericDateRangeWithoutYear` | L3815-L3819 | 5 | `function hasNumericDateRangeWithoutYear(text: string): boolean {` |
| `extractRelativeWeekendDateRange` | L3821-L3844 | 24 | `function extractRelativeWeekendDateRange(` |
| `extractRelativeWeekdayRange` | L3846-L3882 | 37 | `function extractRelativeWeekdayRange(` |
| `extractRelativeWeekdayDate` | L3884-L3898 | 15 | `function extractRelativeWeekdayDate(` |
| `extractSupportedTemporalDateRange` | L3900-L3913 | 14 | `async function extractSupportedTemporalDateRange(` |
| `detectModifyTemporalSideIntent` | L3915-L3917 | 3 | `function detectModifyTemporalSideIntent(` |
| `buildModifyPartialDateSlots` | L3930-L3932 | 3 | `function buildModifyPartialDateSlots(` |
| `resolveModifyDatesContextualMissingSide` | L3952-L3965 | 14 | `function resolveModifyDatesContextualMissingSide(` |
| `detectShortRelativeWeekday` | L3967-L3984 | 18 | `function detectShortRelativeWeekday(text: string): number \| undefined {` |
| `firstWeekdayStrictlyAfter` | L3986-L3994 | 9 | `function firstWeekdayStrictlyAfter(baseIso: string, weekday: number): string \| undefined {` |
| `firstWeekdayOnOrAfter` | L3996-L4003 | 8 | `function firstWeekdayOnOrAfter(baseIso: string, weekday: number): string \| undefined {` |
| `delta` | L4000-L4007 | 8 | `const delta = (weekday - candidate.getUTCDay() + 7) % 7;` |
| `anchorRelativeWeekdayToCheckOutAfterCheckIn` | L4005-L4007 | 3 | `function anchorRelativeWeekdayToCheckOutAfterCheckIn(` |
| `anchorModifyRelativeDateToContext` | L4022-L4025 | 4 | `function anchorModifyRelativeDateToContext(` |
| `resolveCreateDatesContextualMissingSide` | L4038-L4055 | 18 | `function resolveCreateDatesContextualMissingSide(` |
| `anchorCreateRelativeDateToContext` | L4057-L4060 | 4 | `function anchorCreateRelativeDateToContext(` |
| `anchorAvailabilityInquiryDateToContext` | L4094-L4097 | 4 | `function anchorAvailabilityInquiryDateToContext(` |
| `hasModifyDateCorrectionCue` | L4125-L4129 | 5 | `function hasModifyDateCorrectionCue(text: string): boolean {` |
| `hasModifyDatesEntrySignal` | L4131-L4133 | 3 | `function hasModifyDatesEntrySignal(` |
| `buildInvalidReservationDatesReply` | L4142-L4162 | 21 | `function buildInvalidReservationDatesReply(lang: "es" \| "en" \| "pt", reason: "check_order" \| "range_too_long" \| "invalid_format"): string {` |
| `buildInvalidCreateCheckOutReply` | L4164-L4170 | 7 | `function buildInvalidCreateCheckOutReply(lang: "es" \| "en" \| "pt"): string {` |
| `detectRawReservationDateIssue` | L4172-L4195 | 24 | `function detectRawReservationDateIssue(text: string): { reason: "check_order" \| "range_too_long" \| "invalid_format" } \| null {` |
| `tryStructuredAnalyze` | L4198-L4325 | 128 | `async function tryStructuredAnalyze(params: {` |
| `preLLM` | L4387-L4598 | 212 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `lang` | L4434-L4452 | 19 | `const lang = (` |
| `pref` | L4511-L4519 | 9 | `const pref = (hotelConfig as any)?.nearbyPointsMode;` |
| `hasRecentReservationMention` | L4601-L4608 | 8 | `function hasRecentReservationMention(pre: PreLLMResult): boolean {` |
| `shouldClearSelectedReservationTargetForCategory` | L4610-L4632 | 23 | `function shouldClearSelectedReservationTargetForCategory(` |
| `looksLikeEventsQuery` | L4633-L4636 | 4 | `function looksLikeEventsQuery(text: string): boolean {` |
| `buildStateSummary` | L4637-L4646 | 10 | `function buildStateSummary(slots: ReservationSlotsStrict, st: any) {` |
| `initBodyLLMState` | L4659-L4668 | 10 | `function initBodyLLMState(pre: PreLLMResult): BodyLLMState {` |
| `toBodyLLMResult` | L4670-L4679 | 10 | `function toBodyLLMResult(state: BodyLLMState) {` |
| `hotelConfigHasRenderableRoomImages` | L4681-L4691 | 11 | `function hotelConfigHasRenderableRoomImages(hotelConfig: unknown): boolean {` |
| `rooms` | L4682-L4682 | 1 | `const rooms = (hotelConfig as { rooms?: unknown })?.rooms;` |
| `runKbPrecedenceRichPath` | L4693-L4724 | 32 | `async function runKbPrecedenceRichPath(pre: PreLLMResult, promptKey: string): Promise<{` |
| `rbLast` | L4709-L4723 | 15 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L4711-L4723 | 13 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMTestGreetingFastpath` | L4726-L4743 | 18 | `function tryBodyLLMTestGreetingFastpath(pre: PreLLMResult, state: BodyLLMState): boolean {` |
| `tryConversationalGuestNameCapture` | L4745-L4837 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `tryBodyLLMKnowledgeShortcuts` | L4839-L5049 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `looksEventIntent` | L4867-L4878 | 12 | `const looksEventIntent = (() => {` |
| `runBodyLLMGraphPath` | L5051-L5154 | 104 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `last` | L5078-L5088 | 11 | `const last = (state.graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L5113-L5123 | 11 | `const resolved = (state.graphResult as any)?.resolved;` |
| `classified` | L5114-L5123 | 10 | `const classified = (state.graphResult as any)?.classified;` |
| `rbLast` | L5137-L5147 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5139-L5147 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMStructuredEnrichment` | L5156-L5193 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `tryBodyLLMStructuredFallback` | L5195-L5224 | 30 | `async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `bodyLLM` | L5257-L11996 | 6740 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `code` | L6642-L6643 | 2 | `const code = (e as any)?.code;` |
| `prevAttempt` | L6665-L6676 | 12 | `const prevAttempt = (pre.st as any)?.lastEmailCopyAttempt;` |
| `toDDMMYYYY` | L6687-L6687 | 1 | `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };` |
| `prevFailures` | L6737-L6748 | 12 | `const prevFailures = (prevAttempt?.failures \|\| 0) + 1;` |
| `quotedTurnDirectWeekdayRange` | L8414-L8423 | 10 | `const quotedTurnDirectWeekdayRange = (() => {` |
| `toDDMMYYYY` | L8665-L8668 | 4 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L8698-L8700 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `toDDMMYYYY` | L8736-L8738 | 3 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L8766-L8768 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `jidFromGuest` | L8794-L8861 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L8795-L8861 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `code` | L8841-L8842 | 2 | `const code = (e as any)?.code;` |
| `code` | L8897-L8898 | 2 | `const code = (e as any)?.code;` |
| `jidFromGuest` | L8915-L8983 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L8916-L8983 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `code` | L8962-L8963 | 2 | `const code = (e as any)?.code;` |
| `code` | L9019-L9020 | 2 | `const code = (e as any)?.code;` |
| `code` | L9076-L9077 | 2 | `const code = (e as any)?.code;` |
| `pendingAvailabilityVerification` | L9104-L9104 | 1 | `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;` |
| `pendingCancellation` | L9119-L9119 | 1 | `const pendingCancellation = (pre.st as any)?.pendingCancellation as { reservationId?: string; awaitingConfirmation?: boolean } \| undefined;` |
| `snapshotSlots` | L9893-L9901 | 9 | `const snapshotSlots = (canonicalSlots` |
| `looksEventIntent` | L9964-L9978 | 15 | `const looksEventIntent = (() => {` |
| `last` | L10272-L10282 | 11 | `const last = (graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L10311-L10321 | 11 | `const resolved = (graphResult as any)?.resolved;` |
| `classified` | L10312-L10321 | 10 | `const classified = (graphResult as any)?.classified;` |
| `rbLast` | L10335-L10345 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L10337-L10345 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `cons` | L10928-L10939 | 12 | `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({` |
| `txt` | L10973-L10975 | 3 | `const txt = (finalText \|\| '').trim();` |
| `toDDMMYYYY` | L10978-L10982 | 5 | `const toDDMMYYYY = (iso?: string) => {` |
| `currentDates` | L11006-L11006 | 1 | `const currentDates = (String(pre.msg.content \|\| '').match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) \|\| []).map(d => d);` |
| `toISO` | L11019-L11021 | 3 | `const toISO = (d: string) => {` |
| `toDDMMYYYY` | L11026-L11026 | 1 | `const toDDMMYYYY = (iso?: string) => iso ? iso.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') : '';` |
| `stripOffTopicAmenitiesTail` | L11430-L11452 | 23 | `function stripOffTopicAmenitiesTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripOffTopicBillingTail` | L11454-L11479 | 26 | `function stripOffTopicBillingTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `harmonizeBillingCurrencyAnswer` | L11481-L11533 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `ensureBillingContextualFollowup` | L11535-L11547 | 13 | `function ensureBillingContextualFollowup(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildDeterministicBillingReply` | L11549-L11611 | 63 | `async function buildDeterministicBillingReply(` |
| `textNorm` | L11564-L11568 | 5 | `const textNorm = (userText \|\| "").toLowerCase();` |
| `applyCommittedHotelTone` | L11613-L11648 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripGlobalTailNoise` | L11650-L11661 | 12 | `function stripGlobalTailNoise(text: string): string {` |
| `buildModifyGuidance` | L11663-L11678 | 16 | `function buildModifyGuidance(` |
| `es` | L11668-L11670 | 3 | `const es = () =>` |
| `en` | L11671-L11673 | 3 | `const en = () =>` |
| `pt` | L11674-L11676 | 3 | `const pt = () =>` |
| `isContactHotelText` | L11680-L11689 | 10 | `function isContactHotelText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L11681-L11697 | 17 | `const t = (text \|\| "").toLowerCase();` |
| `isQuoteOrConfirmText` | L11697-L11705 | 9 | `function isQuoteOrConfirmText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L11698-L11708 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `wantsGenericModify` | L11708-L11725 | 18 | `function wantsGenericModify(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L11709-L11719 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `isExecutableModifyIntent` | L11727-L11734 | 8 | `function isExecutableModifyIntent(` |
| `buildModifyInquiryReply` | L11736-L11760 | 25 | `function buildModifyInquiryReply(lang: "es" \| "en" \| "pt", text: string): string \| null {` |
| `buildModifyOptionsMenu` | L11762-L11817 | 56 | `function buildModifyOptionsMenu(` |
| `buildModifyReservationSelectionIntro` | L11819-L11852 | 34 | `function buildModifyReservationSelectionIntro(` |
| `isGenericFallbackText` | L11856-L11865 | 10 | `function isGenericFallbackText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L11857-L11868 | 12 | `const t = (text \|\| "").toLowerCase();` |
| `parseReservationCode` | L11868-L11877 | 10 | `function parseReservationCode(text: string): string \| undefined {` |
| `extractReservationCodeLikeToken` | L11878-L11881 | 4 | `function extractReservationCodeLikeToken(text: string): string \| undefined {` |
| `buildAskReservationCode` | L11882-L11886 | 5 | `function buildAskReservationCode(lang: "es" \| "en" \| "pt"): string {` |
| `buildReservationCopySummary` | L11890-L11900 | 11 | `function buildReservationCopySummary(pre: PreLLMResult, nextSlots: ReservationSlotsStrict) {` |
| `detectWhatsAppCopyRequest` | L11902-L11920 | 19 | `function detectWhatsAppCopyRequest(pre: PreLLMResult, text: string): { matched: boolean; mode?: 'explicit' \| 'light'; inlinePhone?: string } {` |
| `posLLM` | L11923-L11967 | 45 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L11968-L12322 | 325 | `export async function handleIncomingMessage(` |
| `respCategory` | L12173-L12198 | 26 | `const respCategory = (body?.graphResult?.category \|\| body?.nextCategory \|\| pre.prevCategory) as string \| undefined;` |
| `respPromptKey` | L12174-L12198 | 25 | `const respPromptKey = (` |
| `respContentVersion` | L12180-L12198 | 19 | `const respContentVersion = (` |
| `respSource` | L12185-L12198 | 14 | `const respSource = (` |
| `respSalesStage` | L12189-L12198 | 10 | `const respSalesStage = (body?.graphResult?.salesStage \|\| pre.st?.salesStage) as string \| undefined;` |
