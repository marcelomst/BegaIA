# messageHandler function size map

Archivo: `lib/handlers/messageHandler.ts`  
Líneas totales: 10134  
Declaraciones detectadas: 266

> Scan estático readonly. Los rangos son aproximados y dependen de llaves `{}`.

---

## 1. Funciones clave

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `buildReservationCanonicalState` | L1465-L1502 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `resolveReservationReference` | L1929-L2036 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `detectDominantTurnDomain` | L2262-L2321 | 60 | `function detectDominantTurnDomain(` |
| `getReservationDomainLockSignal` | L2546-L2581 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `shouldUseReservationLocalFallback` | L2718-L2769 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L2771-L2906 | 136 | `function buildReservationLocalFallbackReply(` |
| `assessReservationDateCoherence` | L2908-L2921 | 14 | `function assessReservationDateCoherence(` |
| `tryStructuredAnalyze` | L3384-L3511 | 128 | `async function tryStructuredAnalyze(params: {` |
| `preLLM` | L3572-L3763 | 192 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `bodyLLM` | L4314-L9367 | 5054 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `posLLM` | L9764-L9805 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L9809-L9817 | 9 | `export async function handleIncomingMessage(` |

---

## 2. Declaraciones más grandes

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `bodyLLM` | L4314-L9367 | 5054 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `preLLM` | L3572-L3763 | 192 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `tryBodyLLMKnowledgeShortcuts` | L3959-L4136 | 178 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationLocalFallbackReply` | L2771-L2906 | 136 | `function buildReservationLocalFallbackReply(` |
| `tryStructuredAnalyze` | L3384-L3511 | 128 | `async function tryStructuredAnalyze(params: {` |
| `resolveReservationReference` | L1929-L2036 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `runBodyLLMGraphPath` | L4138-L4241 | 104 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `tryConversationalGuestNameCapture` | L3865-L3957 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `jidFromGuest` | L7052-L7120 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromGuest` | L6931-L6998 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L7053-L7120 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `jidFromConv` | L6932-L6998 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `getObjectiveContext` | L485-L549 | 65 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `buildDeterministicBillingReply` | L9488-L9550 | 63 | `async function buildDeterministicBillingReply(` |
| `detectDominantTurnDomain` | L2262-L2321 | 60 | `function detectDominantTurnDomain(` |
| `buildReservationSnapshotAnswer` | L192-L249 | 58 | `function buildReservationSnapshotAnswer(` |
| `buildFocusContinuationPrompt` | L1088-L1141 | 54 | `function buildFocusContinuationPrompt(` |
| `buildReservationListAnswer` | L1586-L1639 | 54 | `function buildReservationListAnswer(` |
| `harmonizeBillingCurrencyAnswer` | L9420-L9472 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `shouldUseReservationLocalFallback` | L2718-L2769 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildPureCreateLateralFailsafeReply` | L1206-L1256 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `resolveReservationListSource` | L1665-L1713 | 49 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `validateCreateDraftConsistency` | L822-L866 | 45 | `function validateCreateDraftConsistency(` |
| `extractRawOrderedDateRange` | L2923-L2965 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `posLLM` | L9764-L9805 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `buildReservationCanonicalState` | L1465-L1502 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `buildReservationReferenceCandidates` | L1715-L1752 | 38 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `tryBodyLLMStructuredEnrichment` | L4243-L4280 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `detectReservationSnapshotQuery` | L154-L190 | 37 | `function detectReservationSnapshotQuery(` |
| `anchorCreateDayRangeToDraft` | L2967-L3003 | 37 | `function anchorCreateDayRangeToDraft(` |
| `extractRelativeWeekdayRange` | L3036-L3072 | 37 | `function extractRelativeWeekdayRange(` |
| `buildModifyOptionsMenu` | L9661-L9697 | 37 | `function buildModifyOptionsMenu(lang: "es" \| "en" \| "pt", slots: ReservationSlotsStrict): string {` |
| `getReservationDomainLockSignal` | L2546-L2581 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `applyCommittedHotelTone` | L9552-L9587 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildCreateDraftCapacityReply` | L787-L820 | 34 | `function buildCreateDraftCapacityReply(` |
| `hasActiveReservationDomain` | L2401-L2434 | 34 | `function hasActiveReservationDomain(pre: PreLLMResult): boolean {` |
| `getRecentHistory` | L2094-L2124 | 31 | `async function getRecentHistory(` |
| `persistCreateLateralCategoryIfNeeded` | L1143-L1172 | 30 | `async function persistCreateLateralCategoryIfNeeded(` |
| `tryBodyLLMStructuredFallback` | L4282-L4311 | 30 | `async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `t` | L2201-L2228 | 28 | `const t = (userText \|\| "").toLowerCase();` |

---

## 3. Todas las declaraciones detectadas

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `getWaPhoneMetrics` | L93-L93 | 1 | `export function getWaPhoneMetrics() { return { ...waPhoneMetrics }; }` |
| `resetWaPhoneMetrics` | L94-L94 | 1 | `export function resetWaPhoneMetrics() { waPhoneMetrics.invalidAttempts = 0; waPhoneMetrics.accepted = 0; }` |
| `normalizeWA` | L96-L107 | 12 | `function normalizeWA(raw: string): { normalized?: string; reason?: string } {` |
| `isPastReservationCheckInISO` | L109-L116 | 8 | `function isPastReservationCheckInISO(iso?: string) {` |
| `askedToConfirmReservation` | L118-L122 | 5 | `function askedToConfirmReservation(lcHistory: (HumanMessage \| AIMessage)[]): boolean {` |
| `isVerifyAvailabilityPrompt` | L124-L128 | 5 | `function isVerifyAvailabilityPrompt(text: string): boolean {` |
| `buildPastReservationCheckInPrompt` | L130-L135 | 6 | `function buildPastReservationCheckInPrompt(lang: string, iso?: string) {` |
| `getConfiguredCheckTimes` | L137-L150 | 14 | `function getConfiguredCheckTimes(hotel: any): { checkIn?: string; checkOut?: string } {` |
| `detectReservationSnapshotQuery` | L154-L190 | 37 | `function detectReservationSnapshotQuery(` |
| `buildReservationSnapshotAnswer` | L192-L249 | 58 | `function buildReservationSnapshotAnswer(` |
| `combineModes` | L306-L308 | 3 | `function combineModes(a?: ChannelMode, b?: ChannelMode): ChannelMode {` |
| `isSafeAutosendCategory` | L310-L313 | 4 | `function isSafeAutosendCategory(cat?: string \| null): boolean {` |
| `applyConversationalProposalVocative` | L315-L318 | 4 | `function applyConversationalProposalVocative(` |
| `buildConversationalGreetingNamePrompt` | L337-L346 | 10 | `function buildConversationalGreetingNamePrompt(` |
| `buildConversationalGreetingKnownGuest` | L355-L359 | 5 | `function buildConversationalGreetingKnownGuest(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameCapturedReply` | L361-L368 | 8 | `function buildConversationalNameCapturedReply(` |
| `buildConversationalNameDeclinedReply` | L377-L381 | 5 | `function buildConversationalNameDeclinedReply(lang: "es" \| "en" \| "pt"): string {` |
| `wasConversationalNameRequested` | L383-L389 | 7 | `function wasConversationalNameRequested(` |
| `hasRecentConversationalNameHandshake` | L391-L403 | 13 | `function hasRecentConversationalNameHandshake(` |
| `isConversationalNameDecline` | L405-L407 | 3 | `function isConversationalNameDecline(text: string): boolean {` |
| `isPureConversationalGreeting` | L409-L413 | 5 | `function isPureConversationalGreeting(text: string): boolean {` |
| `hasPriorConversationTurns` | L415-L422 | 8 | `function hasPriorConversationTurns(lcHistory: (HumanMessage \| AIMessage)[], currentUserText: string): boolean {` |
| `deriveClassifierSource` | L446-L452 | 7 | `function deriveClassifierSource(graphResult: any): RoutingDecisionLog["classifier_source"] {` |
| `emitRoutingDecision` | L454-L464 | 11 | `function emitRoutingDecision(` |
| `emitStableIntentRouting` | L466-L476 | 11 | `function emitStableIntentRouting(` |
| `setUsePrePosLLM` | L483-L483 | 1 | `export function setUsePrePosLLM(val: boolean) { USE_PRELLM_POSLLM = val; }` |
| `getObjectiveContext` | L485-L549 | 65 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `rawLang` | L526-L533 | 8 | `const rawLang = (msg.detectedLanguage \|\| "es").toLowerCase();` |
| `lang` | L527-L533 | 7 | `const lang = (["es", "en", "pt"].includes(rawLang) ? rawLang : "es") as "es" \| "en" \| "pt";` |
| `safeNowISO` | L550-L550 | 1 | `function safeNowISO() { return new Date().toISOString(); }` |
| `getHotelConfigSafe` | L552-L558 | 7 | `async function getHotelConfigSafe(hotelId: string) {` |
| `computeInModifyMode` | L560-L572 | 13 | `function computeInModifyMode(` |
| `wantsAdditionalReservation` | L574-L579 | 6 | `function wantsAdditionalReservation(` |
| `mergeReservationHistory` | L599-L606 | 8 | `function mergeReservationHistory(` |
| `buildPersistedReservationRecord` | L608-L626 | 19 | `function buildPersistedReservationRecord(` |
| `buildDraftReservationContext` | L628-L636 | 9 | `function buildDraftReservationContext(` |
| `buildFocusedReservationContext` | L638-L648 | 11 | `function buildFocusedReservationContext(` |
| `buildSelectedReservationTarget` | L650-L664 | 15 | `function buildSelectedReservationTarget(` |
| `buildSelectedReservationTargetFromReference` | L666-L673 | 8 | `function buildSelectedReservationTargetFromReference(` |
| `buildModifyState` | L675-L681 | 7 | `function buildModifyState(activeField: ModifyState["activeField"]): ModifyState \| null {` |
| `buildConversationFocus` | L683-L690 | 8 | `function buildConversationFocus(subFlow: ConversationFocus["subFlow"]): ConversationFocus {` |
| `getConversationFocus` | L692-L711 | 20 | `function getConversationFocus(state?: Partial<{` |
| `shouldSwitchFlow` | L713-L718 | 6 | `function shouldSwitchFlow(` |
| `buildModifyFieldPrompt` | L720-L734 | 15 | `function buildModifyFieldPrompt(lang: "es" \| "en" \| "pt", activeField: ModifyState["activeField"]): string {` |
| `getNextCreateFlowMissingField` | L746-L753 | 8 | `function getNextCreateFlowMissingField(slots: ReservationSlotsStrict): CreateFlowMissingField {` |
| `getCreateFlowMissingFields` | L755-L763 | 9 | `function getCreateFlowMissingFields(slots: ReservationSlotsStrict): CreateFlowMissingField[] {` |
| `buildCreateFlowPrompt` | L765-L785 | 21 | `function buildCreateFlowPrompt(` |
| `buildCreateDraftCapacityReply` | L787-L820 | 34 | `function buildCreateDraftCapacityReply(` |
| `validateCreateDraftConsistency` | L822-L866 | 45 | `function validateCreateDraftConsistency(` |
| `getNextAvailabilityInquiryMissingField` | L870-L875 | 6 | `function getNextAvailabilityInquiryMissingField(slots: ReservationSlotsStrict): AvailabilityInquiryMissingField {` |
| `buildAvailabilityInquiryPrompt` | L877-L889 | 13 | `function buildAvailabilityInquiryPrompt(` |
| `isExplicitCreateReservationIntent` | L891-L899 | 9 | `function isExplicitCreateReservationIntent(text: string): boolean {` |
| `normalizeAvailabilityInquiryText` | L901-L906 | 6 | `function normalizeAvailabilityInquiryText(text: string): string {` |
| `isAvailabilityInquiryIntent` | L908-L921 | 14 | `function isAvailabilityInquiryIntent(text: string): boolean {` |
| `isExplicitPureAvailabilityInquiryIntent` | L923-L928 | 6 | `function isExplicitPureAvailabilityInquiryIntent(text: string): boolean {` |
| `isAvailabilityInquiryActive` | L930-L933 | 4 | `function isAvailabilityInquiryActive(pre: Pick<PreLLMResult, "st" \| "prevCategory">): boolean {` |
| `buildAvailabilityInquiryFollowup` | L935-L941 | 7 | `function buildAvailabilityInquiryFollowup(lang: "es" \| "en" \| "pt"): string {` |
| `buildAvailabilityInquiryCreateClarification` | L943-L949 | 7 | `function buildAvailabilityInquiryCreateClarification(lang: "es" \| "en" \| "pt"): string {` |
| `offeredAvailabilityInquiryCreateFollowup` | L951-L970 | 20 | `function offeredAvailabilityInquiryCreateFollowup(` |
| `isAvailabilityInquiryCreateAdvanceIntent` | L972-L986 | 15 | `function isAvailabilityInquiryCreateAdvanceIntent(` |
| `shouldStartCreateFromAvailabilityInquiry` | L988-L995 | 8 | `function shouldStartCreateFromAvailabilityInquiry(` |
| `isAvailabilityInquiryAmbiguousAdvanceReply` | L997-L1014 | 18 | `function isAvailabilityInquiryAmbiguousAdvanceReply(` |
| `persistAvailabilityInquiry` | L1016-L1036 | 21 | `async function persistAvailabilityInquiry(` |
| `isCreateStateReadyForQuote` | L1038-L1046 | 9 | `function isCreateStateReadyForQuote(slots: ReservationSlotsStrict): boolean {` |
| `resolveReservationFastPathSubFlow` | L1048-L1070 | 23 | `function resolveReservationFastPathSubFlow(pre: PreLLMResult, userText?: string): "create" \| "modify" {` |
| `shouldAppendFocusContinuation` | L1072-L1078 | 7 | `function shouldAppendFocusContinuation(` |
| `buildFocusContinuationPrompt` | L1088-L1141 | 54 | `function buildFocusContinuationPrompt(` |
| `menuSlots` | L1119-L1127 | 9 | `const menuSlots = (canonicalRecord` |
| `persistCreateLateralCategoryIfNeeded` | L1143-L1172 | 30 | `async function persistCreateLateralCategoryIfNeeded(` |
| `isCreateContextActive` | L1174-L1183 | 10 | `function isCreateContextActive(pre: PreLLMResult): boolean {` |
| `isPureLateralTurnWhileCreateActive` | L1185-L1204 | 20 | `function isPureLateralTurnWhileCreateActive(` |
| `buildPureCreateLateralFailsafeReply` | L1206-L1256 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistCreateDraft` | L1258-L1277 | 20 | `async function persistCreateDraft(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `persistCreateDraftSnapshot` | L1279-L1297 | 19 | `async function persistCreateDraftSnapshot(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `isModifyExecutionActive` | L1299-L1308 | 10 | `function isModifyExecutionActive(pre: PreLLMResult): boolean {` |
| `getModifyExecutionReservationId` | L1310-L1325 | 16 | `function getModifyExecutionReservationId(` |
| `persistModifyExecutionContext` | L1327-L1330 | 4 | `async function persistModifyExecutionContext(` |
| `shouldPersistCreateAvailabilityVerification` | L1345-L1360 | 16 | `function shouldPersistCreateAvailabilityVerification(` |
| `normalizeReferenceText` | L1387-L1392 | 6 | `function normalizeReferenceText(text: string): string {` |
| `toISODateOffset` | L1394-L1399 | 6 | `function toISODateOffset(days: number): string {` |
| `getEffectiveActiveReservationContext` | L1401-L1422 | 22 | `function getEffectiveActiveReservationContext(state: any): ActiveReservationContext \| undefined {` |
| `normalizeCanonicalReservationStatus` | L1424-L1429 | 6 | `function normalizeCanonicalReservationStatus(status: string \| null \| undefined): CanonicalReservationRecord["canonicalStatus"] {` |
| `hasMaterializedReservationPayload` | L1431-L1440 | 10 | `function hasMaterializedReservationPayload(item: any): boolean {` |
| `isCanonicalReservationRecordEligible` | L1442-L1447 | 6 | `function isCanonicalReservationRecordEligible(item: any): boolean {` |
| `historyContainsReservationId` | L1449-L1455 | 7 | `function historyContainsReservationId(` |
| `shouldPreserveLastReservationRecord` | L1457-L1463 | 7 | `function shouldPreserveLastReservationRecord(` |
| `buildReservationCanonicalState` | L1465-L1502 | 38 | `function buildReservationCanonicalState(state: any): {` |
| `buildCanonicalReservationRecords` | L1504-L1506 | 3 | `function buildCanonicalReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `collectPersistedReservationRecords` | L1508-L1513 | 6 | `function collectPersistedReservationRecords(state: any): LastReservation[] {` |
| `getMergedIntoGuestId` | L1515-L1520 | 6 | `function getMergedIntoGuestId(guest: { tags?: unknown } \| null \| undefined): string \| undefined {` |
| `getCanonicalReservationRecordById` | L1522-L1528 | 7 | `function getCanonicalReservationRecordById(` |
| `buildCanonicalReservationTarget` | L1530-L1555 | 26 | `function buildCanonicalReservationTarget(` |
| `resolveConfirmedReservationFollowupSnapshot` | L1557-L1559 | 3 | `function resolveConfirmedReservationFollowupSnapshot(` |
| `buildReservationListAnswer` | L1586-L1639 | 54 | `function buildReservationListAnswer(` |
| `safeFindGuestByAnyId` | L1641-L1649 | 9 | `async function safeFindGuestByAnyId(hotelId: string, rawId: string) {` |
| `safeGetConversationsForGuestPerspective` | L1651-L1663 | 13 | `async function safeGetConversationsForGuestPerspective(input: {` |
| `resolveReservationListSource` | L1665-L1713 | 49 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildReservationReferenceCandidates` | L1715-L1752 | 38 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildOrderedReservationHistoryCandidates` | L1754-L1767 | 14 | `function buildOrderedReservationHistoryCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildActionableReservationCandidates` | L1769-L1781 | 13 | `function buildActionableReservationCandidates(state: any): ReservationReferenceTarget[] {` |
| `resolveSingleActionableReservationTarget` | L1783-L1786 | 4 | `function resolveSingleActionableReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `extractReservationOrdinalReferenceSpec` | L1788-L1795 | 8 | `function extractReservationOrdinalReferenceSpec(text: string): ReservationOrdinalReference \| null {` |
| `extractReservationOrdinalReference` | L1797-L1800 | 4 | `function extractReservationOrdinalReference(text: string): "first" \| "second" \| "third" \| "fourth" \| "last" \| null {` |
| `validateOrdinalReservationReference` | L1802-L1823 | 22 | `function validateOrdinalReservationReference(` |
| `resolveValidatedOrdinalReservationTarget` | L1825-L1831 | 7 | `function resolveValidatedOrdinalReservationTarget(` |
| `buildOutOfRangeReservationReferenceReply` | L1833-L1854 | 22 | `function buildOutOfRangeReservationReferenceReply(` |
| `buildReservationReferenceGuardReply` | L1856-L1864 | 9 | `function buildReservationReferenceGuardReply(` |
| `buildAmbiguousReservationSelectionReply` | L1866-L1884 | 19 | `function buildAmbiguousReservationSelectionReply(` |
| `getAmbiguousReservationAction` | L1886-L1898 | 13 | `function getAmbiguousReservationAction(` |
| `resolveExplicitOrdinalReservationTarget` | L1912-L1914 | 3 | `function resolveExplicitOrdinalReservationTarget(state: any, userText: string): ReservationReferenceTarget \| null {` |
| `getReservationReferenceTargetById` | L1916-L1921 | 6 | `function getReservationReferenceTargetById(state: any, reservationId?: string \| null): ReservationReferenceTarget \| null {` |
| `resolveSelectedReservationTarget` | L1923-L1927 | 5 | `function resolveSelectedReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `resolveReservationReference` | L1929-L2036 | 108 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `buildReservationReferenceClarification` | L2038-L2044 | 7 | `function buildReservationReferenceClarification(lang: "es" \| "en" \| "pt"): string {` |
| `getRecentHistorySafe` | L2046-L2054 | 9 | `async function getRecentHistorySafe(` |
| `toStrictSlots` | L2056-L2064 | 9 | `function toStrictSlots(slots?: DbReservationSlots \| null): ReservationSlotsStrict {` |
| `mergeReservationSlots` | L2066-L2079 | 14 | `function mergeReservationSlots(` |
| `toLC` | L2081-L2086 | 6 | `function toLC(msg: ChannelMessage) {` |
| `getRecentHistory` | L2094-L2124 | 31 | `async function getRecentHistory(` |
| `extractTextFromLCContent` | L2127-L2142 | 16 | `function extractTextFromLCContent(content: any): string {` |
| `extractLastAIText` | L2144-L2155 | 12 | `function extractLastAIText(messages: any[] \| undefined): string {` |
| `emitReply` | L2170-L2177 | 8 | `async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: RichPayload) {` |
| `ruleBasedFallback` | L2180-L2194 | 15 | `function ruleBasedFallback(lang: string, userText: string): string {` |
| `t` | L2181-L2190 | 10 | `const t = (userText \|\| "").toLowerCase();` |
| `detectIntent` | L2197-L2214 | 18 | `export function detectIntent(` |
| `t` | L2201-L2228 | 28 | `const t = (userText \|\| "").toLowerCase();` |
| `mapStructuredIntentToCategory` | L2217-L2241 | 25 | `export function mapStructuredIntentToCategory(` |
| `looksTransactionalPricingIntent` | L2243-L2253 | 11 | `function looksTransactionalPricingIntent(text: string): boolean {` |
| `detectDominantTurnDomain` | L2262-L2321 | 60 | `function detectDominantTurnDomain(` |
| `isExplicitModifyExitTurn` | L2324-L2329 | 6 | `function isExplicitModifyExitTurn(text: string): boolean {` |
| `buildPricingClarificationReply` | L2331-L2350 | 20 | `function buildPricingClarificationReply(` |
| `isRoomTypeFollowupInReservation` | L2352-L2364 | 13 | `function isRoomTypeFollowupInReservation(` |
| `isGuestsFollowupInReservation` | L2366-L2387 | 22 | `function isGuestsFollowupInReservation(` |
| `isGuestNameFollowupInReservation` | L2389-L2399 | 11 | `function isGuestNameFollowupInReservation(` |
| `hasActiveReservationDomain` | L2401-L2434 | 34 | `function hasActiveReservationDomain(pre: PreLLMResult): boolean {` |
| `isReservationConfirmSignal` | L2436-L2440 | 5 | `function isReservationConfirmSignal(text: string): boolean {` |
| `isStrictCreateProposalConfirmation` | L2442-L2450 | 9 | `function isStrictCreateProposalConfirmation(text: string): boolean {` |
| `isQuotedCreateNegativeReply` | L2452-L2455 | 4 | `function isQuotedCreateNegativeReply(text: string): boolean {` |
| `buildQuotedCreateConfirmClarification` | L2457-L2463 | 7 | `function buildQuotedCreateConfirmClarification(lang: "es" \| "en" \| "pt"): string {` |
| `buildQuotedCreateProposalPausedReply` | L2465-L2471 | 7 | `function buildQuotedCreateProposalPausedReply(lang: "es" \| "en" \| "pt"): string {` |
| `isPendingCreateProposalContext` | L2473-L2490 | 18 | `function isPendingCreateProposalContext(` |
| `hasStrongReservationDomainExitIntent` | L2492-L2499 | 8 | `function hasStrongReservationDomainExitIntent(text: string): boolean {` |
| `isReservationSnapshotFollowupSignal` | L2501-L2516 | 16 | `function isReservationSnapshotFollowupSignal(pre: PreLLMResult, text: string): boolean {` |
| `isReservationModifySubstateSignal` | L2518-L2544 | 27 | `function isReservationModifySubstateSignal(pre: PreLLMResult, text: string): boolean {` |
| `getReservationDomainLockSignal` | L2546-L2581 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `buildReservationDomainLockReply` | L2583-L2593 | 11 | `function buildReservationDomainLockReply(` |
| `knownSlots` | L2609-L2617 | 9 | `const knownSlots = (canonicalRecord` |
| `isReservationFlowStillActive` | L2706-L2716 | 11 | `function isReservationFlowStillActive(pre: PreLLMResult): boolean {` |
| `shouldUseReservationLocalFallback` | L2718-L2769 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L2771-L2906 | 136 | `function buildReservationLocalFallbackReply(` |
| `knownSlots` | L2789-L2797 | 9 | `const knownSlots = (canonicalRecord` |
| `assessReservationDateCoherence` | L2908-L2921 | 14 | `function assessReservationDateCoherence(` |
| `extractRawOrderedDateRange` | L2923-L2965 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `toIso` | L2928-L2934 | 7 | `const toIso = (token: string) => {` |
| `anchorCreateDayRangeToDraft` | L2967-L3003 | 37 | `function anchorCreateDayRangeToDraft(` |
| `hasNumericDateRangeWithoutYear` | L3005-L3009 | 5 | `function hasNumericDateRangeWithoutYear(text: string): boolean {` |
| `extractRelativeWeekendDateRange` | L3011-L3034 | 24 | `function extractRelativeWeekendDateRange(` |
| `extractRelativeWeekdayRange` | L3036-L3072 | 37 | `function extractRelativeWeekdayRange(` |
| `extractRelativeWeekdayDate` | L3074-L3088 | 15 | `function extractRelativeWeekdayDate(` |
| `extractSupportedTemporalDateRange` | L3090-L3103 | 14 | `async function extractSupportedTemporalDateRange(` |
| `detectModifyTemporalSideIntent` | L3105-L3107 | 3 | `function detectModifyTemporalSideIntent(` |
| `buildModifyPartialDateSlots` | L3120-L3122 | 3 | `function buildModifyPartialDateSlots(` |
| `resolveModifyDatesContextualMissingSide` | L3142-L3155 | 14 | `function resolveModifyDatesContextualMissingSide(` |
| `detectShortRelativeWeekday` | L3157-L3174 | 18 | `function detectShortRelativeWeekday(text: string): number \| undefined {` |
| `firstWeekdayStrictlyAfter` | L3176-L3184 | 9 | `function firstWeekdayStrictlyAfter(baseIso: string, weekday: number): string \| undefined {` |
| `firstWeekdayOnOrAfter` | L3186-L3193 | 8 | `function firstWeekdayOnOrAfter(baseIso: string, weekday: number): string \| undefined {` |
| `delta` | L3190-L3197 | 8 | `const delta = (weekday - candidate.getUTCDay() + 7) % 7;` |
| `anchorRelativeWeekdayToCheckOutAfterCheckIn` | L3195-L3197 | 3 | `function anchorRelativeWeekdayToCheckOutAfterCheckIn(` |
| `anchorModifyRelativeDateToContext` | L3212-L3215 | 4 | `function anchorModifyRelativeDateToContext(` |
| `resolveCreateDatesContextualMissingSide` | L3228-L3245 | 18 | `function resolveCreateDatesContextualMissingSide(` |
| `anchorCreateRelativeDateToContext` | L3247-L3250 | 4 | `function anchorCreateRelativeDateToContext(` |
| `anchorAvailabilityInquiryDateToContext` | L3280-L3283 | 4 | `function anchorAvailabilityInquiryDateToContext(` |
| `hasModifyDateCorrectionCue` | L3311-L3315 | 5 | `function hasModifyDateCorrectionCue(text: string): boolean {` |
| `hasModifyDatesEntrySignal` | L3317-L3319 | 3 | `function hasModifyDatesEntrySignal(` |
| `buildInvalidReservationDatesReply` | L3328-L3348 | 21 | `function buildInvalidReservationDatesReply(lang: "es" \| "en" \| "pt", reason: "check_order" \| "range_too_long" \| "invalid_format"): string {` |
| `buildInvalidCreateCheckOutReply` | L3350-L3356 | 7 | `function buildInvalidCreateCheckOutReply(lang: "es" \| "en" \| "pt"): string {` |
| `detectRawReservationDateIssue` | L3358-L3381 | 24 | `function detectRawReservationDateIssue(text: string): { reason: "check_order" \| "range_too_long" \| "invalid_format" } \| null {` |
| `tryStructuredAnalyze` | L3384-L3511 | 128 | `async function tryStructuredAnalyze(params: {` |
| `preLLM` | L3572-L3763 | 192 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `rawLang` | L3617-L3625 | 9 | `const rawLang = (msg.detectedLanguage \|\| "es").toLowerCase();` |
| `lang` | L3618-L3625 | 8 | `const lang = (["es", "en", "pt"].includes(rawLang) ? rawLang : "es") as "es" \| "en" \| "pt";` |
| `pref` | L3676-L3684 | 9 | `const pref = (hotelConfig as any)?.nearbyPointsMode;` |
| `hasRecentReservationMention` | L3766-L3773 | 8 | `function hasRecentReservationMention(pre: PreLLMResult): boolean {` |
| `shouldClearSelectedReservationTargetForCategory` | L3775-L3797 | 23 | `function shouldClearSelectedReservationTargetForCategory(` |
| `looksLikeEventsQuery` | L3798-L3801 | 4 | `function looksLikeEventsQuery(text: string): boolean {` |
| `buildStateSummary` | L3802-L3811 | 10 | `function buildStateSummary(slots: ReservationSlotsStrict, st: any) {` |
| `initBodyLLMState` | L3824-L3833 | 10 | `function initBodyLLMState(pre: PreLLMResult): BodyLLMState {` |
| `toBodyLLMResult` | L3835-L3844 | 10 | `function toBodyLLMResult(state: BodyLLMState) {` |
| `tryBodyLLMTestGreetingFastpath` | L3846-L3863 | 18 | `function tryBodyLLMTestGreetingFastpath(pre: PreLLMResult, state: BodyLLMState): boolean {` |
| `tryConversationalGuestNameCapture` | L3865-L3957 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `tryBodyLLMKnowledgeShortcuts` | L3959-L4136 | 178 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `looksEventIntent` | L3987-L3998 | 12 | `const looksEventIntent = (() => {` |
| `runBodyLLMGraphPath` | L4138-L4241 | 104 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `last` | L4165-L4175 | 11 | `const last = (state.graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L4200-L4210 | 11 | `const resolved = (state.graphResult as any)?.resolved;` |
| `classified` | L4201-L4210 | 10 | `const classified = (state.graphResult as any)?.classified;` |
| `rbLast` | L4224-L4234 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L4226-L4234 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMStructuredEnrichment` | L4243-L4280 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `tryBodyLLMStructuredFallback` | L4282-L4311 | 30 | `async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `bodyLLM` | L4314-L9367 | 5054 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `code` | L5257-L5258 | 2 | `const code = (e as any)?.code;` |
| `prevAttempt` | L5280-L5291 | 12 | `const prevAttempt = (pre.st as any)?.lastEmailCopyAttempt;` |
| `toDDMMYYYY` | L5302-L5302 | 1 | `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };` |
| `prevFailures` | L5352-L5363 | 12 | `const prevFailures = (prevAttempt?.failures \|\| 0) + 1;` |
| `quotedTurnDirectWeekdayRange` | L6551-L6560 | 10 | `const quotedTurnDirectWeekdayRange = (() => {` |
| `toDDMMYYYY` | L6802-L6805 | 4 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L6835-L6837 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `toDDMMYYYY` | L6873-L6875 | 3 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L6903-L6905 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `jidFromGuest` | L6931-L6998 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L6932-L6998 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `code` | L6978-L6979 | 2 | `const code = (e as any)?.code;` |
| `code` | L7034-L7035 | 2 | `const code = (e as any)?.code;` |
| `jidFromGuest` | L7052-L7120 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L7053-L7120 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `code` | L7099-L7100 | 2 | `const code = (e as any)?.code;` |
| `code` | L7156-L7157 | 2 | `const code = (e as any)?.code;` |
| `code` | L7213-L7214 | 2 | `const code = (e as any)?.code;` |
| `pendingAvailabilityVerification` | L7241-L7241 | 1 | `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;` |
| `pendingCancellation` | L7256-L7256 | 1 | `const pendingCancellation = (pre.st as any)?.pendingCancellation as { reservationId?: string; awaitingConfirmation?: boolean } \| undefined;` |
| `snapshotSlots` | L8016-L8024 | 9 | `const snapshotSlots = (canonicalSlots` |
| `looksEventIntent` | L8087-L8101 | 15 | `const looksEventIntent = (() => {` |
| `last` | L8362-L8372 | 11 | `const last = (graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L8401-L8411 | 11 | `const resolved = (graphResult as any)?.resolved;` |
| `classified` | L8402-L8411 | 10 | `const classified = (graphResult as any)?.classified;` |
| `rbLast` | L8425-L8435 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L8427-L8435 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `cons` | L8906-L8917 | 12 | `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({` |
| `txt` | L8950-L8952 | 3 | `const txt = (finalText \|\| '').trim();` |
| `toDDMMYYYY` | L8955-L8959 | 5 | `const toDDMMYYYY = (iso?: string) => {` |
| `currentDates` | L8983-L8983 | 1 | `const currentDates = (String(pre.msg.content \|\| '').match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) \|\| []).map(d => d);` |
| `toISO` | L8996-L8998 | 3 | `const toISO = (d: string) => {` |
| `toDDMMYYYY` | L9003-L9003 | 1 | `const toDDMMYYYY = (iso?: string) => iso ? iso.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') : '';` |
| `stripOffTopicAmenitiesTail` | L9369-L9391 | 23 | `function stripOffTopicAmenitiesTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripOffTopicBillingTail` | L9393-L9418 | 26 | `function stripOffTopicBillingTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `harmonizeBillingCurrencyAnswer` | L9420-L9472 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `ensureBillingContextualFollowup` | L9474-L9486 | 13 | `function ensureBillingContextualFollowup(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildDeterministicBillingReply` | L9488-L9550 | 63 | `async function buildDeterministicBillingReply(` |
| `textNorm` | L9503-L9507 | 5 | `const textNorm = (userText \|\| "").toLowerCase();` |
| `applyCommittedHotelTone` | L9552-L9587 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripGlobalTailNoise` | L9589-L9600 | 12 | `function stripGlobalTailNoise(text: string): string {` |
| `buildModifyGuidance` | L9602-L9617 | 16 | `function buildModifyGuidance(` |
| `es` | L9607-L9609 | 3 | `const es = () =>` |
| `en` | L9610-L9612 | 3 | `const en = () =>` |
| `pt` | L9613-L9615 | 3 | `const pt = () =>` |
| `isContactHotelText` | L9619-L9628 | 10 | `function isContactHotelText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L9620-L9636 | 17 | `const t = (text \|\| "").toLowerCase();` |
| `isQuoteOrConfirmText` | L9636-L9644 | 9 | `function isQuoteOrConfirmText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L9637-L9647 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `wantsGenericModify` | L9647-L9659 | 13 | `function wantsGenericModify(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L9648-L9655 | 8 | `const t = (text \|\| "").toLowerCase();` |
| `buildModifyOptionsMenu` | L9661-L9697 | 37 | `function buildModifyOptionsMenu(lang: "es" \| "en" \| "pt", slots: ReservationSlotsStrict): string {` |
| `isGenericFallbackText` | L9701-L9710 | 10 | `function isGenericFallbackText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L9702-L9713 | 12 | `const t = (text \|\| "").toLowerCase();` |
| `parseReservationCode` | L9713-L9722 | 10 | `function parseReservationCode(text: string): string \| undefined {` |
| `buildAskReservationCode` | L9723-L9727 | 5 | `function buildAskReservationCode(lang: "es" \| "en" \| "pt"): string {` |
| `buildReservationCopySummary` | L9731-L9741 | 11 | `function buildReservationCopySummary(pre: PreLLMResult, nextSlots: ReservationSlotsStrict) {` |
| `detectWhatsAppCopyRequest` | L9743-L9761 | 19 | `function detectWhatsAppCopyRequest(pre: PreLLMResult, text: string): { matched: boolean; mode?: 'explicit' \| 'light'; inlinePhone?: string } {` |
| `posLLM` | L9764-L9805 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L9809-L9817 | 9 | `export async function handleIncomingMessage(` |
| `respCategory` | L10014-L10039 | 26 | `const respCategory = (body?.graphResult?.category \|\| body?.nextCategory \|\| pre.prevCategory) as string \| undefined;` |
| `respPromptKey` | L10015-L10039 | 25 | `const respPromptKey = (` |
| `respContentVersion` | L10021-L10039 | 19 | `const respContentVersion = (` |
| `respSource` | L10026-L10039 | 14 | `const respSource = (` |
| `respSalesStage` | L10030-L10039 | 10 | `const respSalesStage = (body?.graphResult?.salesStage \|\| pre.st?.salesStage) as string \| undefined;` |

