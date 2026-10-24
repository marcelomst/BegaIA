# messageHandler function size map

Archivo: `lib/handlers/messageHandler.ts`
Líneas totales: 13915
Declaraciones detectadas: 359

> Scan estático readonly. Los rangos son aproximados y dependen de llaves `{}`.

---

## 1. Funciones clave

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `buildReservationCanonicalState` | L2640-L2692 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `resolveReservationReference` | L3338-L3446 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `detectDominantTurnDomain` | L3679-L3738 | 60 | `function detectDominantTurnDomain(` |
| `getReservationDomainLockSignal` | L4011-L4046 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `shouldUseReservationLocalFallback` | L4183-L4234 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L4236-L4371 | 136 | `function buildReservationLocalFallbackReply(` |
| `assessReservationDateCoherence` | L4373-L4386 | 14 | `function assessReservationDateCoherence(` |
| `tryStructuredAnalyze` | L4865-L4992 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `preLLM` | L5056-L5268 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `bodyLLM` | L6283-L13045 | 6763 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `posLLM` | L13540-L13581 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L13585-L13593 | 9 | `export async function handleIncomingMessage(` |

---

## 2. Declaraciones más grandes

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `bodyLLM` | L6283-L13045 | 6763 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `preLLM` | L5056-L5268 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `tryBodyLLMKnowledgeShortcuts` | L5538-L5748 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationLocalFallbackReply` | L4236-L4371 | 136 | `function buildReservationLocalFallbackReply(` |
| `tryStructuredAnalyze` | L4865-L4992 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `finalizeDeterministicCreateProposal` | L6099-L6219 | 121 | `async function finalizeDeterministicCreateProposal(params: {` |
| `resolveReservationReference` | L3338-L3446 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `applyExplicitConversationalActorToGuest` | L316-L422 | 107 | `async function applyExplicitConversationalActorToGuest(` |
| `runBodyLLMGraphPath` | L5750-L5854 | 105 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `tryConversationalGuestNameCapture` | L5444-L5536 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationListAnswer` | L2876-L2963 | 88 | `function buildReservationListAnswer(` |
| `getObjectiveContext` | L989-L1074 | 86 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `tryUpdateAttributedCreateProposalText` | L6001-L6082 | 82 | `async function tryUpdateAttributedCreateProposalText(params: {` |
| `queuedFieldHasTurnValue` | L7417-L7492 | 76 | `const queuedFieldHasTurnValue = (field: ModifyField) =>` |
| `buildModifyPreviewReply` | L1347-L1420 | 74 | `function buildModifyPreviewReply(` |
| `jidFromGuest` | L10366-L10434 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `executeModifyReservationWithSnapshot` | L2418-L2485 | 68 | `async function executeModifyReservationWithSnapshot(` |
| `jidFromGuest` | L10245-L10312 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L10367-L10434 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `jidFromConv` | L10246-L10312 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `buildReservationSnapshotAnswer` | L519-L581 | 63 | `function buildReservationSnapshotAnswer(` |
| `buildDeterministicBillingReply` | L13166-L13228 | 63 | `async function buildDeterministicBillingReply(` |
| `detectDominantTurnDomain` | L3679-L3738 | 60 | `function detectDominantTurnDomain(` |
| `isCreateProposalConfirmationEligible` | L6221-L6280 | 60 | `function isCreateProposalConfirmationEligible(` |
| `validateCreateDraftConsistency` | L1827-L1884 | 58 | `function validateCreateDraftConsistency(` |
| `resolveReservationListSource` | L3000-L3057 | 58 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildModifyOptionsMenu` | L13379-L13434 | 56 | `function buildModifyOptionsMenu(` |
| `buildFocusContinuationPrompt` | L2106-L2159 | 54 | `function buildFocusContinuationPrompt(` |
| `buildReservationCanonicalState` | L2640-L2692 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `buildReservationReferenceCandidates` | L3104-L3156 | 53 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `harmonizeBillingCurrencyAnswer` | L13098-L13150 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `shouldUseReservationLocalFallback` | L4183-L4234 | 52 | `function shouldUseReservationLocalFallback(` |
| `resolveFarewellResponseLanguage` | L635-L685 | 51 | `function resolveFarewellResponseLanguage(pre: {` |
| `buildPureCreateLateralFailsafeReply` | L2224-L2274 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistModifyPreviewContext` | L1568-L1616 | 49 | `async function persistModifyPreviewContext(` |
| `buildModifySuccessReply` | L2369-L2416 | 48 | `function buildModifySuccessReply(lang: "es" \| "en" \| "pt", updated: Reservation): string {` |
| `extractRawOrderedDateRange` | L4388-L4430 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `posLLM` | L13540-L13581 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `extractModifyAvailabilitySupplementalLines` | L1618-L1658 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `extractExplicitConversationalActorName` | L254-L293 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |

---

## 3. Todas las declaraciones detectadas

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `getWaPhoneMetrics` | L107-L107 | 1 | `export function getWaPhoneMetrics() { return { ...waPhoneMetrics }; }` |
| `resetWaPhoneMetrics` | L108-L108 | 1 | `export function resetWaPhoneMetrics() { waPhoneMetrics.invalidAttempts = 0; waPhoneMetrics.accepted = 0; }` |
| `normalizeWA` | L110-L121 | 12 | `function normalizeWA(raw: string): { normalized?: string; reason?: string } {` |
| `isPastReservationCheckInISO` | L123-L130 | 8 | `function isPastReservationCheckInISO(iso?: string) {` |
| `isPastReservationDateISO` | L132-L139 | 8 | `function isPastReservationDateISO(iso?: string) {` |
| `askedToConfirmReservation` | L141-L145 | 5 | `function askedToConfirmReservation(lcHistory: (HumanMessage \| AIMessage)[]): boolean {` |
| `isVerifyAvailabilityPrompt` | L147-L151 | 5 | `function isVerifyAvailabilityPrompt(text: string): boolean {` |
| `buildPastReservationCheckInPrompt` | L153-L158 | 6 | `function buildPastReservationCheckInPrompt(lang: string, iso?: string) {` |
| `isSafeCreateTemporalLeadGuestNameCandidate` | L178-L201 | 24 | `function isSafeCreateTemporalLeadGuestNameCandidate(candidate: string): boolean {` |
| `extractSafeCreateTemporalLeadGuestName` | L203-L212 | 10 | `function extractSafeCreateTemporalLeadGuestName(text: string): string \| undefined {` |
| `isSafeConversationalActorName` | L217-L226 | 10 | `function isSafeConversationalActorName(candidate: string): boolean {` |
| `sanitizeInlineConversationalActorCandidate` | L228-L236 | 9 | `function sanitizeInlineConversationalActorCandidate(candidate: string): string \| undefined {` |
| `extractInlineConversationalActorFromTail` | L238-L252 | 15 | `function extractInlineConversationalActorFromTail(tail: string): string \| undefined {` |
| `extractExplicitConversationalActorName` | L254-L293 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `tryExtractFromStart` | L265-L272 | 8 | `const tryExtractFromStart = (candidateText: string): string \| undefined => {` |
| `extractExplicitGuestIdentityCorrection` | L295-L314 | 20 | `export function extractExplicitGuestIdentityCorrection(text: string): string \| undefined {` |
| `applyExplicitConversationalActorToGuest` | L316-L422 | 107 | `async function applyExplicitConversationalActorToGuest(` |
| `buildAvailabilityGuestContext` | L424-L441 | 18 | `function buildAvailabilityGuestContext(pre: PreLLMResult, rawTurnText: string) {` |
| `isCreateWordDatesTraceCandidate` | L443-L453 | 11 | `function isCreateWordDatesTraceCandidate(text: string): boolean {` |
| `traceCreateWordDates` | L455-L462 | 8 | `function traceCreateWordDates(step: string, payload: Record<string, unknown>) {` |
| `getConfiguredCheckTimes` | L464-L477 | 14 | `function getConfiguredCheckTimes(hotel: any): { checkIn?: string; checkOut?: string } {` |
| `detectReservationSnapshotQuery` | L481-L517 | 37 | `function detectReservationSnapshotQuery(` |
| `buildReservationSnapshotAnswer` | L519-L581 | 63 | `function buildReservationSnapshotAnswer(` |
| `normalizeRuntimeLanguage` | L583-L590 | 8 | `function normalizeRuntimeLanguage(value: unknown): "es" \| "en" \| "pt" \| null {` |
| `inferRuntimeLanguageFromText` | L592-L622 | 31 | `function inferRuntimeLanguageFromText(text: string): "es" \| "en" \| "pt" \| null {` |
| `bump` | L603-L607 | 5 | `const bump = (lang: "es" \| "en" \| "pt", patterns: RegExp[]) => {` |
| `ranked` | L619-L624 | 6 | `const ranked = (Object.keys(scores) as Array<"es" \| "en" \| "pt">)` |
| `isLowSignalLanguageMessage` | L624-L633 | 10 | `function isLowSignalLanguageMessage(text: string): boolean {` |
| `resolveFarewellResponseLanguage` | L635-L685 | 51 | `function resolveFarewellResponseLanguage(pre: {` |
| `ranked` | L678-L682 | 5 | `const ranked = (Object.keys(historyScores) as Array<"es" \| "en" \| "pt">)` |
| `resolveReservationSnapshotLanguage` | L687-L697 | 11 | `function resolveReservationSnapshotLanguage(pre: {` |
| `resolveReservationConversationLanguage` | L699-L705 | 7 | `function resolveReservationConversationLanguage(pre: {` |
| `combineModes` | L766-L768 | 3 | `function combineModes(a?: ChannelMode, b?: ChannelMode): ChannelMode {` |
| `isSafeAutosendCategory` | L770-L773 | 4 | `function isSafeAutosendCategory(cat?: string \| null): boolean {` |
| `applyConversationalProposalVocative` | L775-L778 | 4 | `function applyConversationalProposalVocative(` |
| `buildConversationalGreetingNamePrompt` | L797-L806 | 10 | `function buildConversationalGreetingNamePrompt(` |
| `buildConversationalGreetingKnownGuest` | L815-L819 | 5 | `function buildConversationalGreetingKnownGuest(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameCapturedReply` | L821-L828 | 8 | `function buildConversationalNameCapturedReply(` |
| `buildConversationalNameCorrectedReply` | L837-L841 | 5 | `function buildConversationalNameCorrectedReply(lang: "es" \| "en" \| "pt", displayName: string): string {` |
| `buildConversationalNameDeclinedReply` | L843-L847 | 5 | `function buildConversationalNameDeclinedReply(lang: "es" \| "en" \| "pt"): string {` |
| `wasConversationalNameRequested` | L849-L855 | 7 | `function wasConversationalNameRequested(` |
| `hasRecentConversationalNameHandshake` | L857-L869 | 13 | `function hasRecentConversationalNameHandshake(` |
| `isConversationalNameDecline` | L871-L873 | 3 | `function isConversationalNameDecline(text: string): boolean {` |
| `isPureConversationalGreeting` | L875-L879 | 5 | `function isPureConversationalGreeting(text: string): boolean {` |
| `hasPriorConversationTurns` | L881-L888 | 8 | `function hasPriorConversationTurns(lcHistory: (HumanMessage \| AIMessage)[], currentUserText: string): boolean {` |
| `deriveClassifierSource` | L912-L918 | 7 | `function deriveClassifierSource(graphResult: any): RoutingDecisionLog["classifier_source"] {` |
| `emitRoutingDecision` | L920-L930 | 11 | `function emitRoutingDecision(` |
| `emitStableIntentRouting` | L932-L942 | 11 | `function emitStableIntentRouting(` |
| `attributeSingleWordDateToPendingCreateCheckout` | L947-L983 | 37 | `function attributeSingleWordDateToPendingCreateCheckout(` |
| `setUsePrePosLLM` | L987-L987 | 1 | `export function setUsePrePosLLM(val: boolean) { USE_PRELLM_POSLLM = val; }` |
| `getObjectiveContext` | L989-L1074 | 86 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `lang` | L1042-L1059 | 18 | `const lang = (` |
| `safeNowISO` | L1075-L1075 | 1 | `function safeNowISO() { return new Date().toISOString(); }` |
| `getHotelConfigSafe` | L1077-L1083 | 7 | `async function getHotelConfigSafe(hotelId: string) {` |
| `computeInModifyMode` | L1085-L1097 | 13 | `function computeInModifyMode(` |
| `wantsAdditionalReservation` | L1099-L1104 | 6 | `function wantsAdditionalReservation(` |
| `mergeReservationHistory` | L1124-L1131 | 8 | `function mergeReservationHistory(` |
| `buildPersistedReservationRecord` | L1133-L1151 | 19 | `function buildPersistedReservationRecord(` |
| `buildDraftReservationContext` | L1153-L1161 | 9 | `function buildDraftReservationContext(` |
| `buildFocusedReservationContext` | L1163-L1173 | 11 | `function buildFocusedReservationContext(` |
| `buildSelectedReservationTarget` | L1175-L1189 | 15 | `function buildSelectedReservationTarget(` |
| `buildSelectedReservationTargetFromReference` | L1191-L1198 | 8 | `function buildSelectedReservationTargetFromReference(` |
| `normalizeModifyFieldQueue` | L1202-L1209 | 8 | `function normalizeModifyFieldQueue(fields: Array<ModifyField \| null \| undefined \| false>): ModifyField[] {` |
| `getNextQueuedModifyState` | L1211-L1215 | 5 | `function getNextQueuedModifyState(modifyState?: ModifyState \| null): ModifyState \| null {` |
| `resolveRequestedModifyFieldsInOrder` | L1217-L1219 | 3 | `function resolveRequestedModifyFieldsInOrder(` |
| `pushEarliestPhrase` | L1223-L1230 | 8 | `const pushEarliestPhrase = (field: ModifyField, phrases: string[]) => {` |
| `buildModifyState` | L1275-L1282 | 8 | `function buildModifyState(activeField: ModifyState["activeField"], pendingFields: ModifyField[] = []): ModifyState \| null {` |
| `buildModifyPreviewState` | L1284-L1292 | 9 | `function buildModifyPreviewState(` |
| `buildModifyPreviewPatch` | L1294-L1308 | 15 | `function buildModifyPreviewPatch(` |
| `applyModifyPreviewPatch` | L1310-L1323 | 14 | `function applyModifyPreviewPatch(` |
| `hydrateModifyPreviewTarget` | L1325-L1345 | 21 | `function hydrateModifyPreviewTarget(` |
| `buildModifyPreviewReply` | L1347-L1420 | 74 | `function buildModifyPreviewReply(` |
| `buildModifyPreviewReminder` | L1422-L1428 | 7 | `function buildModifyPreviewReminder(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyPreviewRejectedReply` | L1430-L1436 | 7 | `function buildModifyPreviewRejectedReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyPreviewCancellationHandoffReply` | L1438-L1447 | 10 | `function buildModifyPreviewCancellationHandoffReply(` |
| `buildModifyPreviewCancellationClarificationReply` | L1449-L1455 | 7 | `function buildModifyPreviewCancellationClarificationReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildCompetingReservationConfirmationsReply` | L1457-L1463 | 7 | `function buildCompetingReservationConfirmationsReply(lang: "es" \| "en" \| "pt"): string {` |
| `isExplicitModifyPreviewRejection` | L1465-L1470 | 6 | `function isExplicitModifyPreviewRejection(text: string): boolean {` |
| `isBareModifyPreviewCancellation` | L1472-L1474 | 3 | `function isBareModifyPreviewCancellation(text: string): boolean {` |
| `buildModifyInactiveTargetReply` | L1476-L1482 | 7 | `function buildModifyInactiveTargetReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildCancelInactiveTargetReply` | L1484-L1490 | 7 | `function buildCancelInactiveTargetReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyReservationCodeNotFoundReply` | L1492-L1498 | 7 | `function buildModifyReservationCodeNotFoundReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifyMissingPatchReply` | L1500-L1506 | 7 | `function buildModifyMissingPatchReply(lang: "es" \| "en" \| "pt"): string {` |
| `validateModifySnapshot` | L1508-L1531 | 24 | `function validateModifySnapshot(` |
| `buildModifyCandidateSnapshot` | L1533-L1536 | 4 | `function buildModifyCandidateSnapshot(` |
| `persistModifyPreviewContext` | L1568-L1616 | 49 | `async function persistModifyPreviewContext(` |
| `extractModifyAvailabilitySupplementalLines` | L1618-L1658 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `buildModifyDatesPreviewWithAvailability` | L1660-L1674 | 15 | `async function buildModifyDatesPreviewWithAvailability(` |
| `resolveCurrentModifyPreviewTarget` | L1676-L1686 | 11 | `function resolveCurrentModifyPreviewTarget(pre: PreLLMResult): ReservationReferenceTarget \| null {` |
| `buildConversationFocus` | L1688-L1695 | 8 | `function buildConversationFocus(subFlow: ConversationFocus["subFlow"]): ConversationFocus {` |
| `getConversationFocus` | L1697-L1716 | 20 | `function getConversationFocus(state?: Partial<{` |
| `shouldSwitchFlow` | L1718-L1723 | 6 | `function shouldSwitchFlow(` |
| `buildModifyFieldPrompt` | L1725-L1739 | 15 | `function buildModifyFieldPrompt(lang: "es" \| "en" \| "pt", activeField: ModifyState["activeField"]): string {` |
| `getNextCreateFlowMissingField` | L1751-L1758 | 8 | `function getNextCreateFlowMissingField(slots: ReservationSlotsStrict): CreateFlowMissingField {` |
| `getCreateFlowMissingFields` | L1760-L1768 | 9 | `function getCreateFlowMissingFields(slots: ReservationSlotsStrict): CreateFlowMissingField[] {` |
| `buildCreateFlowPrompt` | L1770-L1790 | 21 | `function buildCreateFlowPrompt(` |
| `buildCreateDraftCapacityReply` | L1792-L1825 | 34 | `function buildCreateDraftCapacityReply(` |
| `validateCreateDraftConsistency` | L1827-L1884 | 58 | `function validateCreateDraftConsistency(` |
| `getNextAvailabilityInquiryMissingField` | L1888-L1893 | 6 | `function getNextAvailabilityInquiryMissingField(slots: ReservationSlotsStrict): AvailabilityInquiryMissingField {` |
| `buildAvailabilityInquiryPrompt` | L1895-L1907 | 13 | `function buildAvailabilityInquiryPrompt(` |
| `isExplicitCreateReservationIntent` | L1909-L1917 | 9 | `function isExplicitCreateReservationIntent(text: string): boolean {` |
| `normalizeAvailabilityInquiryText` | L1919-L1924 | 6 | `function normalizeAvailabilityInquiryText(text: string): string {` |
| `isAvailabilityInquiryIntent` | L1926-L1939 | 14 | `function isAvailabilityInquiryIntent(text: string): boolean {` |
| `isExplicitPureAvailabilityInquiryIntent` | L1941-L1946 | 6 | `function isExplicitPureAvailabilityInquiryIntent(text: string): boolean {` |
| `isAvailabilityInquiryActive` | L1948-L1951 | 4 | `function isAvailabilityInquiryActive(pre: Pick<PreLLMResult, "st" \| "prevCategory">): boolean {` |
| `buildAvailabilityInquiryFollowup` | L1953-L1959 | 7 | `function buildAvailabilityInquiryFollowup(lang: "es" \| "en" \| "pt"): string {` |
| `buildAvailabilityInquiryCreateClarification` | L1961-L1967 | 7 | `function buildAvailabilityInquiryCreateClarification(lang: "es" \| "en" \| "pt"): string {` |
| `offeredAvailabilityInquiryCreateFollowup` | L1969-L1988 | 20 | `function offeredAvailabilityInquiryCreateFollowup(` |
| `isAvailabilityInquiryCreateAdvanceIntent` | L1990-L2004 | 15 | `function isAvailabilityInquiryCreateAdvanceIntent(` |
| `shouldStartCreateFromAvailabilityInquiry` | L2006-L2013 | 8 | `function shouldStartCreateFromAvailabilityInquiry(` |
| `isAvailabilityInquiryAmbiguousAdvanceReply` | L2015-L2032 | 18 | `function isAvailabilityInquiryAmbiguousAdvanceReply(` |
| `persistAvailabilityInquiry` | L2034-L2054 | 21 | `async function persistAvailabilityInquiry(` |
| `isCreateStateReadyForQuote` | L2056-L2064 | 9 | `function isCreateStateReadyForQuote(slots: ReservationSlotsStrict): boolean {` |
| `resolveReservationFastPathSubFlow` | L2066-L2088 | 23 | `function resolveReservationFastPathSubFlow(pre: PreLLMResult, userText?: string): "create" \| "modify" {` |
| `shouldAppendFocusContinuation` | L2090-L2096 | 7 | `function shouldAppendFocusContinuation(` |
| `buildFocusContinuationPrompt` | L2106-L2159 | 54 | `function buildFocusContinuationPrompt(` |
| `menuSlots` | L2137-L2145 | 9 | `const menuSlots = (canonicalRecord` |
| `persistCreateLateralCategoryIfNeeded` | L2161-L2190 | 30 | `async function persistCreateLateralCategoryIfNeeded(` |
| `isCreateContextActive` | L2192-L2201 | 10 | `function isCreateContextActive(pre: PreLLMResult): boolean {` |
| `isPureLateralTurnWhileCreateActive` | L2203-L2222 | 20 | `function isPureLateralTurnWhileCreateActive(` |
| `buildPureCreateLateralFailsafeReply` | L2224-L2274 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistCreateDraft` | L2276-L2295 | 20 | `async function persistCreateDraft(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `persistCreateDraftSnapshot` | L2297-L2315 | 19 | `async function persistCreateDraftSnapshot(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `isModifyExecutionActive` | L2317-L2326 | 10 | `function isModifyExecutionActive(pre: PreLLMResult): boolean {` |
| `getModifyExecutionReservationId` | L2328-L2343 | 16 | `function getModifyExecutionReservationId(` |
| `persistModifyExecutionContext` | L2345-L2348 | 4 | `async function persistModifyExecutionContext(` |
| `buildInvalidUpdatedReservationReply` | L2363-L2367 | 5 | `function buildInvalidUpdatedReservationReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifySuccessReply` | L2369-L2416 | 48 | `function buildModifySuccessReply(lang: "es" \| "en" \| "pt", updated: Reservation): string {` |
| `executeModifyReservationWithSnapshot` | L2418-L2485 | 68 | `async function executeModifyReservationWithSnapshot(` |
| `getRecentModifyRoomTypeCandidate` | L2487-L2497 | 11 | `function getRecentModifyRoomTypeCandidate(` |
| `shouldPersistCreateAvailabilityVerification` | L2499-L2514 | 16 | `function shouldPersistCreateAvailabilityVerification(` |
| `resolveAuthoritativeNumGuests` | L2528-L2535 | 8 | `function resolveAuthoritativeNumGuests(` |
| `normalizeReferenceText` | L2550-L2555 | 6 | `function normalizeReferenceText(text: string): string {` |
| `toISODateOffset` | L2557-L2562 | 6 | `function toISODateOffset(days: number): string {` |
| `getEffectiveActiveReservationContext` | L2564-L2585 | 22 | `function getEffectiveActiveReservationContext(state: any): ActiveReservationContext \| undefined {` |
| `hasCanonicalConfirmedReservationContext` | L2587-L2593 | 7 | `function hasCanonicalConfirmedReservationContext(state: any): boolean {` |
| `hasDominantDraftProposalContext` | L2595-L2597 | 3 | `function hasDominantDraftProposalContext(state: any): boolean {` |
| `normalizeCanonicalReservationStatus` | L2599-L2604 | 6 | `function normalizeCanonicalReservationStatus(status: string \| null \| undefined): CanonicalReservationRecord["canonicalStatus"] {` |
| `hasMaterializedReservationPayload` | L2606-L2615 | 10 | `function hasMaterializedReservationPayload(item: any): boolean {` |
| `isCanonicalReservationRecordEligible` | L2617-L2622 | 6 | `function isCanonicalReservationRecordEligible(item: any): boolean {` |
| `historyContainsReservationId` | L2624-L2630 | 7 | `function historyContainsReservationId(` |
| `shouldPreserveLastReservationRecord` | L2632-L2638 | 7 | `function shouldPreserveLastReservationRecord(` |
| `buildReservationCanonicalState` | L2640-L2692 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `mergeSameReservation` | L2648-L2658 | 11 | `const mergeSameReservation = (base: CanonicalReservationRecord, preferred: CanonicalReservationRecord) => ({` |
| `buildCanonicalReservationRecords` | L2694-L2696 | 3 | `function buildCanonicalReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `buildPresentedReservationRecords` | L2698-L2710 | 13 | `function buildPresentedReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `collectPersistedReservationRecords` | L2712-L2717 | 6 | `function collectPersistedReservationRecords(state: any): LastReservation[] {` |
| `getMergedIntoGuestId` | L2719-L2724 | 6 | `function getMergedIntoGuestId(guest: { tags?: unknown } \| null \| undefined): string \| undefined {` |
| `getCanonicalReservationRecordById` | L2726-L2732 | 7 | `function getCanonicalReservationRecordById(` |
| `buildCanonicalReservationSlots` | L2734-L2749 | 16 | `function buildCanonicalReservationSlots(` |
| `buildCanonicalReservationTarget` | L2751-L2776 | 26 | `function buildCanonicalReservationTarget(` |
| `resolveConfirmedReservationFollowupSnapshot` | L2778-L2780 | 3 | `function resolveConfirmedReservationFollowupSnapshot(` |
| `getHotelToday` | L2810-L2826 | 17 | `function getHotelToday(timezone?: string, now = new Date()): string {` |
| `normalizeReservationCalendarDate` | L2828-L2836 | 9 | `function normalizeReservationCalendarDate(value?: string): string \| undefined {` |
| `getReservationTemporalRelation` | L2838-L2848 | 11 | `function getReservationTemporalRelation(` |
| `orderReservationsForTemporalPresentation` | L2850-L2874 | 25 | `function orderReservationsForTemporalPresentation(` |
| `buildReservationListAnswer` | L2876-L2963 | 88 | `function buildReservationListAnswer(` |
| `safeFindGuestByAnyId` | L2965-L2973 | 9 | `async function safeFindGuestByAnyId(hotelId: string, rawId: string) {` |
| `presentedReservationScopeMatchesCanonicalGuest` | L2975-L2985 | 11 | `async function presentedReservationScopeMatchesCanonicalGuest(` |
| `safeGetConversationsByGuestId` | L2987-L2998 | 12 | `async function safeGetConversationsByGuestId(input: {` |
| `resolveReservationListSource` | L3000-L3057 | 58 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildLastPresentedReservations` | L3059-L3080 | 22 | `function buildLastPresentedReservations(source: {` |
| `getConfirmedGuestReservationCandidates` | L3082-L3086 | 5 | `function getConfirmedGuestReservationCandidates(reservations: CanonicalReservationRecord[]) {` |
| `buildGuestReservationAmbiguityReply` | L3088-L3102 | 15 | `function buildGuestReservationAmbiguityReply(` |
| `buildReservationReferenceCandidates` | L3104-L3156 | 53 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildOrderedReservationHistoryCandidates` | L3158-L3173 | 16 | `function buildOrderedReservationHistoryCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildActionableReservationCandidates` | L3175-L3187 | 13 | `function buildActionableReservationCandidates(state: any): ReservationReferenceTarget[] {` |
| `resolveSingleActionableReservationTarget` | L3189-L3192 | 4 | `function resolveSingleActionableReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `extractReservationOrdinalReferenceSpec` | L3194-L3201 | 8 | `function extractReservationOrdinalReferenceSpec(text: string): ReservationOrdinalReference \| null {` |
| `extractReservationOrdinalReference` | L3203-L3206 | 4 | `function extractReservationOrdinalReference(text: string): "first" \| "second" \| "third" \| "fourth" \| "last" \| null {` |
| `validateOrdinalReservationReference` | L3208-L3229 | 22 | `function validateOrdinalReservationReference(` |
| `resolveValidatedOrdinalReservationTarget` | L3231-L3237 | 7 | `function resolveValidatedOrdinalReservationTarget(` |
| `buildOutOfRangeReservationReferenceReply` | L3239-L3260 | 22 | `function buildOutOfRangeReservationReferenceReply(` |
| `buildReservationReferenceGuardReply` | L3262-L3270 | 9 | `function buildReservationReferenceGuardReply(` |
| `buildAmbiguousReservationSelectionReply` | L3272-L3290 | 19 | `function buildAmbiguousReservationSelectionReply(` |
| `getAmbiguousReservationAction` | L3292-L3304 | 13 | `function getAmbiguousReservationAction(` |
| `resolveExplicitOrdinalReservationTarget` | L3321-L3323 | 3 | `function resolveExplicitOrdinalReservationTarget(state: any, userText: string): ReservationReferenceTarget \| null {` |
| `getReservationReferenceTargetById` | L3325-L3330 | 6 | `function getReservationReferenceTargetById(state: any, reservationId?: string \| null): ReservationReferenceTarget \| null {` |
| `resolveSelectedReservationTarget` | L3332-L3336 | 5 | `function resolveSelectedReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `resolveReservationReference` | L3338-L3446 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `buildReservationReferenceClarification` | L3448-L3454 | 7 | `function buildReservationReferenceClarification(lang: "es" \| "en" \| "pt"): string {` |
| `getRecentHistorySafe` | L3456-L3464 | 9 | `async function getRecentHistorySafe(` |
| `toStrictSlots` | L3466-L3475 | 10 | `function toStrictSlots(slots?: DbReservationSlots \| null): ReservationSlotsStrict {` |
| `mergeReservationSlots` | L3477-L3491 | 15 | `function mergeReservationSlots(` |
| `toLC` | L3493-L3498 | 6 | `function toLC(msg: ChannelMessage) {` |
| `getRecentHistory` | L3506-L3536 | 31 | `async function getRecentHistory(` |
| `extractTextFromLCContent` | L3539-L3554 | 16 | `function extractTextFromLCContent(content: any): string {` |
| `extractLastAIText` | L3556-L3567 | 12 | `function extractLastAIText(messages: any[] \| undefined): string {` |
| `emitReply` | L3582-L3589 | 8 | `async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: RichPayload) {` |
| `ruleBasedFallback` | L3592-L3611 | 20 | `function ruleBasedFallback(lang: string, userText: string): string {` |
| `t` | L3593-L3602 | 10 | `const t = (userText \|\| "").toLowerCase();` |
| `detectIntent` | L3614-L3631 | 18 | `export function detectIntent(` |
| `t` | L3618-L3645 | 28 | `const t = (userText \|\| "").toLowerCase();` |
| `mapStructuredIntentToCategory` | L3634-L3658 | 25 | `export function mapStructuredIntentToCategory(` |
| `looksTransactionalPricingIntent` | L3660-L3670 | 11 | `function looksTransactionalPricingIntent(text: string): boolean {` |
| `detectDominantTurnDomain` | L3679-L3738 | 60 | `function detectDominantTurnDomain(` |
| `isExplicitModifyExitTurn` | L3741-L3746 | 6 | `function isExplicitModifyExitTurn(text: string): boolean {` |
| `buildPricingClarificationReply` | L3748-L3767 | 20 | `function buildPricingClarificationReply(` |
| `isRoomTypeFollowupInReservation` | L3769-L3781 | 13 | `function isRoomTypeFollowupInReservation(` |
| `isGuestsFollowupInReservation` | L3783-L3804 | 22 | `function isGuestsFollowupInReservation(` |
| `isGuestNameFollowupInReservation` | L3806-L3816 | 11 | `function isGuestNameFollowupInReservation(` |
| `hasHolderCorrectionIntent` | L3818-L3828 | 11 | `function hasHolderCorrectionIntent(text: string): boolean {` |
| `hasDraftHolderCorrectionIntent` | L3830-L3832 | 3 | `function hasDraftHolderCorrectionIntent(text: string): boolean {` |
| `buildAskDraftHolderName` | L3834-L3840 | 7 | `function buildAskDraftHolderName(lang: "es" \| "en" \| "pt"): string {` |
| `buildConfirmedHolderChangeNotSupportedReply` | L3842-L3848 | 7 | `function buildConfirmedHolderChangeNotSupportedReply(lang: "es" \| "en" \| "pt"): string {` |
| `resolveDraftHolderCandidate` | L3850-L3853 | 4 | `function resolveDraftHolderCandidate(` |
| `hasActiveReservationDomain` | L3866-L3899 | 34 | `function hasActiveReservationDomain(pre: PreLLMResult): boolean {` |
| `isReservationConfirmSignal` | L3901-L3905 | 5 | `function isReservationConfirmSignal(text: string): boolean {` |
| `isStrictCreateProposalConfirmation` | L3907-L3915 | 9 | `function isStrictCreateProposalConfirmation(text: string): boolean {` |
| `isQuotedCreateNegativeReply` | L3917-L3920 | 4 | `function isQuotedCreateNegativeReply(text: string): boolean {` |
| `buildQuotedCreateConfirmClarification` | L3922-L3928 | 7 | `function buildQuotedCreateConfirmClarification(lang: "es" \| "en" \| "pt"): string {` |
| `buildQuotedCreateProposalPausedReply` | L3930-L3936 | 7 | `function buildQuotedCreateProposalPausedReply(lang: "es" \| "en" \| "pt"): string {` |
| `isPendingCreateProposalContext` | L3938-L3955 | 18 | `function isPendingCreateProposalContext(` |
| `hasStrongReservationDomainExitIntent` | L3957-L3964 | 8 | `function hasStrongReservationDomainExitIntent(text: string): boolean {` |
| `isReservationSnapshotFollowupSignal` | L3966-L3981 | 16 | `function isReservationSnapshotFollowupSignal(pre: PreLLMResult, text: string): boolean {` |
| `isReservationModifySubstateSignal` | L3983-L4009 | 27 | `function isReservationModifySubstateSignal(pre: PreLLMResult, text: string): boolean {` |
| `getReservationDomainLockSignal` | L4011-L4046 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `buildReservationDomainLockReply` | L4048-L4058 | 11 | `function buildReservationDomainLockReply(` |
| `knownSlots` | L4074-L4082 | 9 | `const knownSlots = (canonicalRecord` |
| `isReservationFlowStillActive` | L4171-L4181 | 11 | `function isReservationFlowStillActive(pre: PreLLMResult): boolean {` |
| `shouldUseReservationLocalFallback` | L4183-L4234 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L4236-L4371 | 136 | `function buildReservationLocalFallbackReply(` |
| `knownSlots` | L4254-L4262 | 9 | `const knownSlots = (canonicalRecord` |
| `assessReservationDateCoherence` | L4373-L4386 | 14 | `function assessReservationDateCoherence(` |
| `extractRawOrderedDateRange` | L4388-L4430 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `toIso` | L4393-L4399 | 7 | `const toIso = (token: string) => {` |
| `anchorCreateDayRangeToDraft` | L4432-L4468 | 37 | `function anchorCreateDayRangeToDraft(` |
| `hasNumericDateRangeWithoutYear` | L4470-L4474 | 5 | `function hasNumericDateRangeWithoutYear(text: string): boolean {` |
| `extractRelativeWeekendDateRange` | L4476-L4499 | 24 | `function extractRelativeWeekendDateRange(` |
| `extractRelativeWeekdayRange` | L4501-L4537 | 37 | `function extractRelativeWeekdayRange(` |
| `extractRelativeWeekdayDate` | L4539-L4553 | 15 | `function extractRelativeWeekdayDate(` |
| `extractSupportedTemporalDateRange` | L4555-L4568 | 14 | `async function extractSupportedTemporalDateRange(` |
| `detectModifyTemporalSideIntent` | L4570-L4572 | 3 | `function detectModifyTemporalSideIntent(` |
| `buildModifyPartialDateSlots` | L4585-L4587 | 3 | `function buildModifyPartialDateSlots(` |
| `resolveModifyDatesContextualMissingSide` | L4607-L4620 | 14 | `function resolveModifyDatesContextualMissingSide(` |
| `detectShortRelativeWeekday` | L4622-L4639 | 18 | `function detectShortRelativeWeekday(text: string): number \| undefined {` |
| `firstWeekdayStrictlyAfter` | L4641-L4649 | 9 | `function firstWeekdayStrictlyAfter(baseIso: string, weekday: number): string \| undefined {` |
| `firstWeekdayOnOrAfter` | L4651-L4658 | 8 | `function firstWeekdayOnOrAfter(baseIso: string, weekday: number): string \| undefined {` |
| `delta` | L4655-L4662 | 8 | `const delta = (weekday - candidate.getUTCDay() + 7) % 7;` |
| `anchorRelativeWeekdayToCheckOutAfterCheckIn` | L4660-L4662 | 3 | `function anchorRelativeWeekdayToCheckOutAfterCheckIn(` |
| `anchorModifyRelativeDateToContext` | L4677-L4680 | 4 | `function anchorModifyRelativeDateToContext(` |
| `resolveCreateDatesContextualMissingSide` | L4693-L4710 | 18 | `function resolveCreateDatesContextualMissingSide(` |
| `anchorCreateRelativeDateToContext` | L4712-L4715 | 4 | `function anchorCreateRelativeDateToContext(` |
| `anchorAvailabilityInquiryDateToContext` | L4749-L4752 | 4 | `function anchorAvailabilityInquiryDateToContext(` |
| `hasModifyDateCorrectionCue` | L4780-L4784 | 5 | `function hasModifyDateCorrectionCue(text: string): boolean {` |
| `hasModifyDatesEntrySignal` | L4786-L4788 | 3 | `function hasModifyDatesEntrySignal(` |
| `buildInvalidReservationDatesReply` | L4797-L4817 | 21 | `function buildInvalidReservationDatesReply(lang: "es" \| "en" \| "pt", reason: "check_order" \| "range_too_long" \| "invalid_format"): string {` |
| `buildInvalidCreateCalendarDateReply` | L4819-L4829 | 11 | `function buildInvalidCreateCalendarDateReply(` |
| `buildInvalidCreateCheckOutReply` | L4831-L4837 | 7 | `function buildInvalidCreateCheckOutReply(lang: "es" \| "en" \| "pt"): string {` |
| `detectRawReservationDateIssue` | L4839-L4862 | 24 | `function detectRawReservationDateIssue(text: string): { reason: "check_order" \| "range_too_long" \| "invalid_format" } \| null {` |
| `tryStructuredAnalyze` | L4865-L4992 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `preLLM` | L5056-L5268 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `lang` | L5103-L5121 | 19 | `const lang = (` |
| `pref` | L5180-L5188 | 9 | `const pref = (hotelConfig as any)?.nearbyPointsMode;` |
| `hasRecentReservationMention` | L5271-L5278 | 8 | `function hasRecentReservationMention(pre: PreLLMResult): boolean {` |
| `shouldClearSelectedReservationTargetForCategory` | L5280-L5302 | 23 | `function shouldClearSelectedReservationTargetForCategory(` |
| `looksLikeEventsQuery` | L5303-L5306 | 4 | `function looksLikeEventsQuery(text: string): boolean {` |
| `buildStateSummary` | L5307-L5316 | 10 | `function buildStateSummary(slots: ReservationSlotsStrict, st: any) {` |
| `initBodyLLMState` | L5329-L5338 | 10 | `function initBodyLLMState(pre: PreLLMResult): BodyLLMState {` |
| `toBodyLLMResult` | L5340-L5349 | 10 | `function toBodyLLMResult(state: BodyLLMState) {` |
| `isRenderableRoomImageUrl` | L5351-L5354 | 4 | `function isRenderableRoomImageUrl(value: unknown): boolean {` |
| `roomInfoImgBodyHasRenderableImages` | L5356-L5359 | 4 | `function roomInfoImgBodyHasRenderableImages(body: unknown): boolean {` |
| `hotelConfigHasRenderableRoomImages` | L5361-L5371 | 11 | `function hotelConfigHasRenderableRoomImages(hotelConfig: unknown): boolean {` |
| `rooms` | L5362-L5362 | 1 | `const rooms = (hotelConfig as { rooms?: unknown })?.rooms;` |
| `hotelHasRenderableRoomInventoryVisuals` | L5373-L5390 | 18 | `async function hotelHasRenderableRoomInventoryVisuals(pre: PreLLMResult): Promise<boolean> {` |
| `runKbPrecedenceRichPath` | L5392-L5423 | 32 | `async function runKbPrecedenceRichPath(pre: PreLLMResult, promptKey: string): Promise<{` |
| `rbLast` | L5408-L5422 | 15 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5410-L5422 | 13 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMTestGreetingFastpath` | L5425-L5442 | 18 | `function tryBodyLLMTestGreetingFastpath(pre: PreLLMResult, state: BodyLLMState): boolean {` |
| `tryConversationalGuestNameCapture` | L5444-L5536 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `tryBodyLLMKnowledgeShortcuts` | L5538-L5748 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `looksEventIntent` | L5566-L5577 | 12 | `const looksEventIntent = (() => {` |
| `runBodyLLMGraphPath` | L5750-L5854 | 105 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `last` | L5778-L5788 | 11 | `const last = (state.graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L5813-L5823 | 11 | `const resolved = (state.graphResult as any)?.resolved;` |
| `classified` | L5814-L5823 | 10 | `const classified = (state.graphResult as any)?.classified;` |
| `rbLast` | L5837-L5847 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5839-L5847 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMStructuredEnrichment` | L5856-L5893 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `tryBodyLLMStructuredFallback` | L5895-L5924 | 30 | `async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `isCanonicalIsoDateValue` | L5940-L5944 | 5 | `function isCanonicalIsoDateValue(value: string): boolean {` |
| `normalizeCanonicalCreateProposalSnapshot` | L5946-L5970 | 25 | `function normalizeCanonicalCreateProposalSnapshot(` |
| `proposalInputMatchesSnapshot` | L5972-L5984 | 13 | `function proposalInputMatchesSnapshot(` |
| `canonicalStateMatchesCreateSnapshot` | L5986-L5999 | 14 | `function canonicalStateMatchesCreateSnapshot(` |
| `tryUpdateAttributedCreateProposalText` | L6001-L6082 | 82 | `async function tryUpdateAttributedCreateProposalText(params: {` |
| `buildConservativeCreatePersistenceReply` | L6089-L6097 | 9 | `function buildConservativeCreatePersistenceReply(lang: "es" \| "en" \| "pt"): string {` |
| `finalizeDeterministicCreateProposal` | L6099-L6219 | 121 | `async function finalizeDeterministicCreateProposal(params: {` |
| `isCreateProposalConfirmationEligible` | L6221-L6280 | 60 | `function isCreateProposalConfirmationEligible(` |
| `bodyLLM` | L6283-L13045 | 6763 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `queuedFieldHasTurnValue` | L7417-L7492 | 76 | `const queuedFieldHasTurnValue = (field: ModifyField) =>` |
| `code` | L7851-L7852 | 2 | `const code = (e as any)?.code;` |
| `prevAttempt` | L7874-L7885 | 12 | `const prevAttempt = (pre.st as any)?.lastEmailCopyAttempt;` |
| `toDDMMYYYY` | L7896-L7896 | 1 | `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };` |
| `prevFailures` | L7946-L7957 | 12 | `const prevFailures = (prevAttempt?.failures \|\| 0) + 1;` |
| `quotedTurnDirectWeekdayRange` | L9878-L9887 | 10 | `const quotedTurnDirectWeekdayRange = (() => {` |
| `toDDMMYYYY` | L10116-L10119 | 4 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L10149-L10151 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `toDDMMYYYY` | L10187-L10189 | 3 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L10217-L10219 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `jidFromGuest` | L10245-L10312 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L10246-L10312 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `code` | L10292-L10293 | 2 | `const code = (e as any)?.code;` |
| `code` | L10348-L10349 | 2 | `const code = (e as any)?.code;` |
| `jidFromGuest` | L10366-L10434 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L10367-L10434 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `code` | L10413-L10414 | 2 | `const code = (e as any)?.code;` |
| `code` | L10470-L10471 | 2 | `const code = (e as any)?.code;` |
| `code` | L10527-L10528 | 2 | `const code = (e as any)?.code;` |
| `pendingAvailabilityVerification` | L10555-L10555 | 1 | `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;` |
| `pendingCancellation` | L10584-L10584 | 1 | `const pendingCancellation = (pre.st as any)?.pendingCancellation as { reservationId?: string; awaitingConfirmation?: boolean } \| undefined;` |
| `snapshotSlots` | L11483-L11492 | 10 | `const snapshotSlots = (canonicalSlots` |
| `looksEventIntent` | L11555-L11569 | 15 | `const looksEventIntent = (() => {` |
| `last` | L11866-L11877 | 12 | `const last = (graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L11912-L11922 | 11 | `const resolved = (graphResult as any)?.resolved;` |
| `classified` | L11913-L11922 | 10 | `const classified = (graphResult as any)?.classified;` |
| `rbLast` | L11936-L11946 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L11938-L11946 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `cons` | L12529-L12540 | 12 | `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({` |
| `txt` | L12574-L12576 | 3 | `const txt = (finalText \|\| '').trim();` |
| `toDDMMYYYY` | L12579-L12583 | 5 | `const toDDMMYYYY = (iso?: string) => {` |
| `currentDates` | L12607-L12607 | 1 | `const currentDates = (String(pre.msg.content \|\| '').match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) \|\| []).map(d => d);` |
| `toISO` | L12620-L12622 | 3 | `const toISO = (d: string) => {` |
| `toDDMMYYYY` | L12627-L12627 | 1 | `const toDDMMYYYY = (iso?: string) => iso ? iso.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') : '';` |
| `stripOffTopicAmenitiesTail` | L13047-L13069 | 23 | `function stripOffTopicAmenitiesTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripOffTopicBillingTail` | L13071-L13096 | 26 | `function stripOffTopicBillingTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `harmonizeBillingCurrencyAnswer` | L13098-L13150 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `ensureBillingContextualFollowup` | L13152-L13164 | 13 | `function ensureBillingContextualFollowup(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildDeterministicBillingReply` | L13166-L13228 | 63 | `async function buildDeterministicBillingReply(` |
| `textNorm` | L13181-L13185 | 5 | `const textNorm = (userText \|\| "").toLowerCase();` |
| `applyCommittedHotelTone` | L13230-L13265 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripGlobalTailNoise` | L13267-L13278 | 12 | `function stripGlobalTailNoise(text: string): string {` |
| `buildModifyGuidance` | L13280-L13295 | 16 | `function buildModifyGuidance(` |
| `es` | L13285-L13287 | 3 | `const es = () =>` |
| `en` | L13288-L13290 | 3 | `const en = () =>` |
| `pt` | L13291-L13293 | 3 | `const pt = () =>` |
| `isContactHotelText` | L13297-L13306 | 10 | `function isContactHotelText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L13298-L13314 | 17 | `const t = (text \|\| "").toLowerCase();` |
| `isQuoteOrConfirmText` | L13314-L13322 | 9 | `function isQuoteOrConfirmText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L13315-L13325 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `wantsGenericModify` | L13325-L13342 | 18 | `function wantsGenericModify(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L13326-L13336 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `isExecutableModifyIntent` | L13344-L13351 | 8 | `function isExecutableModifyIntent(` |
| `buildModifyInquiryReply` | L13353-L13377 | 25 | `function buildModifyInquiryReply(lang: "es" \| "en" \| "pt", text: string): string \| null {` |
| `buildModifyOptionsMenu` | L13379-L13434 | 56 | `function buildModifyOptionsMenu(` |
| `buildModifyReservationSelectionIntro` | L13436-L13469 | 34 | `function buildModifyReservationSelectionIntro(` |
| `isGenericFallbackText` | L13473-L13482 | 10 | `function isGenericFallbackText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L13474-L13485 | 12 | `const t = (text \|\| "").toLowerCase();` |
| `parseReservationCode` | L13485-L13494 | 10 | `function parseReservationCode(text: string): string \| undefined {` |
| `extractReservationCodeLikeToken` | L13495-L13498 | 4 | `function extractReservationCodeLikeToken(text: string): string \| undefined {` |
| `buildAskReservationCode` | L13499-L13503 | 5 | `function buildAskReservationCode(lang: "es" \| "en" \| "pt"): string {` |
| `buildReservationCopySummary` | L13507-L13517 | 11 | `function buildReservationCopySummary(pre: PreLLMResult, nextSlots: ReservationSlotsStrict) {` |
| `detectWhatsAppCopyRequest` | L13519-L13537 | 19 | `function detectWhatsAppCopyRequest(pre: PreLLMResult, text: string): { matched: boolean; mode?: 'explicit' \| 'light'; inlinePhone?: string } {` |
| `posLLM` | L13540-L13581 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L13585-L13593 | 9 | `export async function handleIncomingMessage(` |
| `respCategory` | L13795-L13820 | 26 | `const respCategory = (body?.graphResult?.category \|\| body?.nextCategory \|\| pre.prevCategory) as string \| undefined;` |
| `respPromptKey` | L13796-L13820 | 25 | `const respPromptKey = (` |
| `respContentVersion` | L13802-L13820 | 19 | `const respContentVersion = (` |
| `respSource` | L13807-L13820 | 14 | `const respSource = (` |
| `respSalesStage` | L13811-L13820 | 10 | `const respSalesStage = (body?.graphResult?.salesStage \|\| pre.st?.salesStage) as string \| undefined;` |
