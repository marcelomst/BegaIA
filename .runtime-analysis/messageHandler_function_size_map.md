# messageHandler function size map

Archivo: `lib/handlers/messageHandler.ts`
Líneas totales: 13845
Declaraciones detectadas: 357

> Scan estático readonly. Los rangos son aproximados y dependen de llaves `{}`.

---

## 1. Funciones clave

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `buildReservationCanonicalState` | L2605-L2657 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `resolveReservationReference` | L3303-L3411 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `detectDominantTurnDomain` | L3644-L3703 | 60 | `function detectDominantTurnDomain(` |
| `getReservationDomainLockSignal` | L3976-L4011 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `shouldUseReservationLocalFallback` | L4148-L4199 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L4201-L4336 | 136 | `function buildReservationLocalFallbackReply(` |
| `assessReservationDateCoherence` | L4338-L4351 | 14 | `function assessReservationDateCoherence(` |
| `tryStructuredAnalyze` | L4830-L4957 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `preLLM` | L5021-L5233 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `bodyLLM` | L6248-L12975 | 6728 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `posLLM` | L13470-L13511 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L13515-L13523 | 9 | `export async function handleIncomingMessage(` |

---

## 2. Declaraciones más grandes

| Nombre | Rango | Líneas | Firma |
| --- | ---: | ---: | --- |
| `bodyLLM` | L6248-L12975 | 6728 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `preLLM` | L5021-L5233 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `tryBodyLLMKnowledgeShortcuts` | L5503-L5713 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationLocalFallbackReply` | L4201-L4336 | 136 | `function buildReservationLocalFallbackReply(` |
| `tryStructuredAnalyze` | L4830-L4957 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `finalizeDeterministicCreateProposal` | L6064-L6184 | 121 | `async function finalizeDeterministicCreateProposal(params: {` |
| `resolveReservationReference` | L3303-L3411 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `applyExplicitConversationalActorToGuest` | L316-L422 | 107 | `async function applyExplicitConversationalActorToGuest(` |
| `runBodyLLMGraphPath` | L5715-L5819 | 105 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `tryConversationalGuestNameCapture` | L5409-L5501 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `buildReservationListAnswer` | L2841-L2928 | 88 | `function buildReservationListAnswer(` |
| `getObjectiveContext` | L989-L1074 | 86 | `async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {` |
| `tryUpdateAttributedCreateProposalText` | L5966-L6047 | 82 | `async function tryUpdateAttributedCreateProposalText(params: {` |
| `buildModifyPreviewReply` | L1347-L1420 | 74 | `function buildModifyPreviewReply(` |
| `jidFromGuest` | L10296-L10364 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `executeModifyReservationWithSnapshot` | L2383-L2450 | 68 | `async function executeModifyReservationWithSnapshot(` |
| `jidFromGuest` | L10175-L10242 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L10297-L10364 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `jidFromConv` | L10176-L10242 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `buildReservationSnapshotAnswer` | L519-L581 | 63 | `function buildReservationSnapshotAnswer(` |
| `buildDeterministicBillingReply` | L13096-L13158 | 63 | `async function buildDeterministicBillingReply(` |
| `detectDominantTurnDomain` | L3644-L3703 | 60 | `function detectDominantTurnDomain(` |
| `isCreateProposalConfirmationEligible` | L6186-L6245 | 60 | `function isCreateProposalConfirmationEligible(` |
| `validateCreateDraftConsistency` | L1792-L1849 | 58 | `function validateCreateDraftConsistency(` |
| `resolveReservationListSource` | L2965-L3022 | 58 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildModifyOptionsMenu` | L13309-L13364 | 56 | `function buildModifyOptionsMenu(` |
| `buildFocusContinuationPrompt` | L2071-L2124 | 54 | `function buildFocusContinuationPrompt(` |
| `buildReservationCanonicalState` | L2605-L2657 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `buildReservationReferenceCandidates` | L3069-L3121 | 53 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `harmonizeBillingCurrencyAnswer` | L13028-L13080 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `shouldUseReservationLocalFallback` | L4148-L4199 | 52 | `function shouldUseReservationLocalFallback(` |
| `resolveFarewellResponseLanguage` | L635-L685 | 51 | `function resolveFarewellResponseLanguage(pre: {` |
| `buildPureCreateLateralFailsafeReply` | L2189-L2239 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistModifyPreviewContext` | L1533-L1581 | 49 | `async function persistModifyPreviewContext(` |
| `buildModifySuccessReply` | L2334-L2381 | 48 | `function buildModifySuccessReply(lang: "es" \| "en" \| "pt", updated: Reservation): string {` |
| `extractRawOrderedDateRange` | L4353-L4395 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `posLLM` | L13470-L13511 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `extractModifyAvailabilitySupplementalLines` | L1583-L1623 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `extractExplicitConversationalActorName` | L254-L293 | 40 | `export function extractExplicitConversationalActorName(text: string): string \| undefined {` |
| `tryBodyLLMStructuredEnrichment` | L5821-L5858 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |

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
| `persistModifyPreviewContext` | L1533-L1581 | 49 | `async function persistModifyPreviewContext(` |
| `extractModifyAvailabilitySupplementalLines` | L1583-L1623 | 41 | `function extractModifyAvailabilitySupplementalLines(` |
| `buildModifyDatesPreviewWithAvailability` | L1625-L1639 | 15 | `async function buildModifyDatesPreviewWithAvailability(` |
| `resolveCurrentModifyPreviewTarget` | L1641-L1651 | 11 | `function resolveCurrentModifyPreviewTarget(pre: PreLLMResult): ReservationReferenceTarget \| null {` |
| `buildConversationFocus` | L1653-L1660 | 8 | `function buildConversationFocus(subFlow: ConversationFocus["subFlow"]): ConversationFocus {` |
| `getConversationFocus` | L1662-L1681 | 20 | `function getConversationFocus(state?: Partial<{` |
| `shouldSwitchFlow` | L1683-L1688 | 6 | `function shouldSwitchFlow(` |
| `buildModifyFieldPrompt` | L1690-L1704 | 15 | `function buildModifyFieldPrompt(lang: "es" \| "en" \| "pt", activeField: ModifyState["activeField"]): string {` |
| `getNextCreateFlowMissingField` | L1716-L1723 | 8 | `function getNextCreateFlowMissingField(slots: ReservationSlotsStrict): CreateFlowMissingField {` |
| `getCreateFlowMissingFields` | L1725-L1733 | 9 | `function getCreateFlowMissingFields(slots: ReservationSlotsStrict): CreateFlowMissingField[] {` |
| `buildCreateFlowPrompt` | L1735-L1755 | 21 | `function buildCreateFlowPrompt(` |
| `buildCreateDraftCapacityReply` | L1757-L1790 | 34 | `function buildCreateDraftCapacityReply(` |
| `validateCreateDraftConsistency` | L1792-L1849 | 58 | `function validateCreateDraftConsistency(` |
| `getNextAvailabilityInquiryMissingField` | L1853-L1858 | 6 | `function getNextAvailabilityInquiryMissingField(slots: ReservationSlotsStrict): AvailabilityInquiryMissingField {` |
| `buildAvailabilityInquiryPrompt` | L1860-L1872 | 13 | `function buildAvailabilityInquiryPrompt(` |
| `isExplicitCreateReservationIntent` | L1874-L1882 | 9 | `function isExplicitCreateReservationIntent(text: string): boolean {` |
| `normalizeAvailabilityInquiryText` | L1884-L1889 | 6 | `function normalizeAvailabilityInquiryText(text: string): string {` |
| `isAvailabilityInquiryIntent` | L1891-L1904 | 14 | `function isAvailabilityInquiryIntent(text: string): boolean {` |
| `isExplicitPureAvailabilityInquiryIntent` | L1906-L1911 | 6 | `function isExplicitPureAvailabilityInquiryIntent(text: string): boolean {` |
| `isAvailabilityInquiryActive` | L1913-L1916 | 4 | `function isAvailabilityInquiryActive(pre: Pick<PreLLMResult, "st" \| "prevCategory">): boolean {` |
| `buildAvailabilityInquiryFollowup` | L1918-L1924 | 7 | `function buildAvailabilityInquiryFollowup(lang: "es" \| "en" \| "pt"): string {` |
| `buildAvailabilityInquiryCreateClarification` | L1926-L1932 | 7 | `function buildAvailabilityInquiryCreateClarification(lang: "es" \| "en" \| "pt"): string {` |
| `offeredAvailabilityInquiryCreateFollowup` | L1934-L1953 | 20 | `function offeredAvailabilityInquiryCreateFollowup(` |
| `isAvailabilityInquiryCreateAdvanceIntent` | L1955-L1969 | 15 | `function isAvailabilityInquiryCreateAdvanceIntent(` |
| `shouldStartCreateFromAvailabilityInquiry` | L1971-L1978 | 8 | `function shouldStartCreateFromAvailabilityInquiry(` |
| `isAvailabilityInquiryAmbiguousAdvanceReply` | L1980-L1997 | 18 | `function isAvailabilityInquiryAmbiguousAdvanceReply(` |
| `persistAvailabilityInquiry` | L1999-L2019 | 21 | `async function persistAvailabilityInquiry(` |
| `isCreateStateReadyForQuote` | L2021-L2029 | 9 | `function isCreateStateReadyForQuote(slots: ReservationSlotsStrict): boolean {` |
| `resolveReservationFastPathSubFlow` | L2031-L2053 | 23 | `function resolveReservationFastPathSubFlow(pre: PreLLMResult, userText?: string): "create" \| "modify" {` |
| `shouldAppendFocusContinuation` | L2055-L2061 | 7 | `function shouldAppendFocusContinuation(` |
| `buildFocusContinuationPrompt` | L2071-L2124 | 54 | `function buildFocusContinuationPrompt(` |
| `menuSlots` | L2102-L2110 | 9 | `const menuSlots = (canonicalRecord` |
| `persistCreateLateralCategoryIfNeeded` | L2126-L2155 | 30 | `async function persistCreateLateralCategoryIfNeeded(` |
| `isCreateContextActive` | L2157-L2166 | 10 | `function isCreateContextActive(pre: PreLLMResult): boolean {` |
| `isPureLateralTurnWhileCreateActive` | L2168-L2187 | 20 | `function isPureLateralTurnWhileCreateActive(` |
| `buildPureCreateLateralFailsafeReply` | L2189-L2239 | 51 | `function buildPureCreateLateralFailsafeReply(` |
| `persistCreateDraft` | L2241-L2260 | 20 | `async function persistCreateDraft(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `persistCreateDraftSnapshot` | L2262-L2280 | 19 | `async function persistCreateDraftSnapshot(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {` |
| `isModifyExecutionActive` | L2282-L2291 | 10 | `function isModifyExecutionActive(pre: PreLLMResult): boolean {` |
| `getModifyExecutionReservationId` | L2293-L2308 | 16 | `function getModifyExecutionReservationId(` |
| `persistModifyExecutionContext` | L2310-L2313 | 4 | `async function persistModifyExecutionContext(` |
| `buildInvalidUpdatedReservationReply` | L2328-L2332 | 5 | `function buildInvalidUpdatedReservationReply(lang: "es" \| "en" \| "pt"): string {` |
| `buildModifySuccessReply` | L2334-L2381 | 48 | `function buildModifySuccessReply(lang: "es" \| "en" \| "pt", updated: Reservation): string {` |
| `executeModifyReservationWithSnapshot` | L2383-L2450 | 68 | `async function executeModifyReservationWithSnapshot(` |
| `getRecentModifyRoomTypeCandidate` | L2452-L2462 | 11 | `function getRecentModifyRoomTypeCandidate(` |
| `shouldPersistCreateAvailabilityVerification` | L2464-L2479 | 16 | `function shouldPersistCreateAvailabilityVerification(` |
| `resolveAuthoritativeNumGuests` | L2493-L2500 | 8 | `function resolveAuthoritativeNumGuests(` |
| `normalizeReferenceText` | L2515-L2520 | 6 | `function normalizeReferenceText(text: string): string {` |
| `toISODateOffset` | L2522-L2527 | 6 | `function toISODateOffset(days: number): string {` |
| `getEffectiveActiveReservationContext` | L2529-L2550 | 22 | `function getEffectiveActiveReservationContext(state: any): ActiveReservationContext \| undefined {` |
| `hasCanonicalConfirmedReservationContext` | L2552-L2558 | 7 | `function hasCanonicalConfirmedReservationContext(state: any): boolean {` |
| `hasDominantDraftProposalContext` | L2560-L2562 | 3 | `function hasDominantDraftProposalContext(state: any): boolean {` |
| `normalizeCanonicalReservationStatus` | L2564-L2569 | 6 | `function normalizeCanonicalReservationStatus(status: string \| null \| undefined): CanonicalReservationRecord["canonicalStatus"] {` |
| `hasMaterializedReservationPayload` | L2571-L2580 | 10 | `function hasMaterializedReservationPayload(item: any): boolean {` |
| `isCanonicalReservationRecordEligible` | L2582-L2587 | 6 | `function isCanonicalReservationRecordEligible(item: any): boolean {` |
| `historyContainsReservationId` | L2589-L2595 | 7 | `function historyContainsReservationId(` |
| `shouldPreserveLastReservationRecord` | L2597-L2603 | 7 | `function shouldPreserveLastReservationRecord(` |
| `buildReservationCanonicalState` | L2605-L2657 | 53 | `function buildReservationCanonicalState(state: any): {` |
| `mergeSameReservation` | L2613-L2623 | 11 | `const mergeSameReservation = (base: CanonicalReservationRecord, preferred: CanonicalReservationRecord) => ({` |
| `buildCanonicalReservationRecords` | L2659-L2661 | 3 | `function buildCanonicalReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `buildPresentedReservationRecords` | L2663-L2675 | 13 | `function buildPresentedReservationRecords(state: any): CanonicalReservationRecord[] {` |
| `collectPersistedReservationRecords` | L2677-L2682 | 6 | `function collectPersistedReservationRecords(state: any): LastReservation[] {` |
| `getMergedIntoGuestId` | L2684-L2689 | 6 | `function getMergedIntoGuestId(guest: { tags?: unknown } \| null \| undefined): string \| undefined {` |
| `getCanonicalReservationRecordById` | L2691-L2697 | 7 | `function getCanonicalReservationRecordById(` |
| `buildCanonicalReservationSlots` | L2699-L2714 | 16 | `function buildCanonicalReservationSlots(` |
| `buildCanonicalReservationTarget` | L2716-L2741 | 26 | `function buildCanonicalReservationTarget(` |
| `resolveConfirmedReservationFollowupSnapshot` | L2743-L2745 | 3 | `function resolveConfirmedReservationFollowupSnapshot(` |
| `getHotelToday` | L2775-L2791 | 17 | `function getHotelToday(timezone?: string, now = new Date()): string {` |
| `normalizeReservationCalendarDate` | L2793-L2801 | 9 | `function normalizeReservationCalendarDate(value?: string): string \| undefined {` |
| `getReservationTemporalRelation` | L2803-L2813 | 11 | `function getReservationTemporalRelation(` |
| `orderReservationsForTemporalPresentation` | L2815-L2839 | 25 | `function orderReservationsForTemporalPresentation(` |
| `buildReservationListAnswer` | L2841-L2928 | 88 | `function buildReservationListAnswer(` |
| `safeFindGuestByAnyId` | L2930-L2938 | 9 | `async function safeFindGuestByAnyId(hotelId: string, rawId: string) {` |
| `presentedReservationScopeMatchesCanonicalGuest` | L2940-L2950 | 11 | `async function presentedReservationScopeMatchesCanonicalGuest(` |
| `safeGetConversationsByGuestId` | L2952-L2963 | 12 | `async function safeGetConversationsByGuestId(input: {` |
| `resolveReservationListSource` | L2965-L3022 | 58 | `async function resolveReservationListSource(pre: PreLLMResult): Promise<{` |
| `buildLastPresentedReservations` | L3024-L3045 | 22 | `function buildLastPresentedReservations(source: {` |
| `getConfirmedGuestReservationCandidates` | L3047-L3051 | 5 | `function getConfirmedGuestReservationCandidates(reservations: CanonicalReservationRecord[]) {` |
| `buildGuestReservationAmbiguityReply` | L3053-L3067 | 15 | `function buildGuestReservationAmbiguityReply(` |
| `buildReservationReferenceCandidates` | L3069-L3121 | 53 | `function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildOrderedReservationHistoryCandidates` | L3123-L3138 | 16 | `function buildOrderedReservationHistoryCandidates(state: any): ReservationReferenceTarget[] {` |
| `buildActionableReservationCandidates` | L3140-L3152 | 13 | `function buildActionableReservationCandidates(state: any): ReservationReferenceTarget[] {` |
| `resolveSingleActionableReservationTarget` | L3154-L3157 | 4 | `function resolveSingleActionableReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `extractReservationOrdinalReferenceSpec` | L3159-L3166 | 8 | `function extractReservationOrdinalReferenceSpec(text: string): ReservationOrdinalReference \| null {` |
| `extractReservationOrdinalReference` | L3168-L3171 | 4 | `function extractReservationOrdinalReference(text: string): "first" \| "second" \| "third" \| "fourth" \| "last" \| null {` |
| `validateOrdinalReservationReference` | L3173-L3194 | 22 | `function validateOrdinalReservationReference(` |
| `resolveValidatedOrdinalReservationTarget` | L3196-L3202 | 7 | `function resolveValidatedOrdinalReservationTarget(` |
| `buildOutOfRangeReservationReferenceReply` | L3204-L3225 | 22 | `function buildOutOfRangeReservationReferenceReply(` |
| `buildReservationReferenceGuardReply` | L3227-L3235 | 9 | `function buildReservationReferenceGuardReply(` |
| `buildAmbiguousReservationSelectionReply` | L3237-L3255 | 19 | `function buildAmbiguousReservationSelectionReply(` |
| `getAmbiguousReservationAction` | L3257-L3269 | 13 | `function getAmbiguousReservationAction(` |
| `resolveExplicitOrdinalReservationTarget` | L3286-L3288 | 3 | `function resolveExplicitOrdinalReservationTarget(state: any, userText: string): ReservationReferenceTarget \| null {` |
| `getReservationReferenceTargetById` | L3290-L3295 | 6 | `function getReservationReferenceTargetById(state: any, reservationId?: string \| null): ReservationReferenceTarget \| null {` |
| `resolveSelectedReservationTarget` | L3297-L3301 | 5 | `function resolveSelectedReservationTarget(state: any): ReservationReferenceTarget \| null {` |
| `resolveReservationReference` | L3303-L3411 | 109 | `function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {` |
| `buildReservationReferenceClarification` | L3413-L3419 | 7 | `function buildReservationReferenceClarification(lang: "es" \| "en" \| "pt"): string {` |
| `getRecentHistorySafe` | L3421-L3429 | 9 | `async function getRecentHistorySafe(` |
| `toStrictSlots` | L3431-L3440 | 10 | `function toStrictSlots(slots?: DbReservationSlots \| null): ReservationSlotsStrict {` |
| `mergeReservationSlots` | L3442-L3456 | 15 | `function mergeReservationSlots(` |
| `toLC` | L3458-L3463 | 6 | `function toLC(msg: ChannelMessage) {` |
| `getRecentHistory` | L3471-L3501 | 31 | `async function getRecentHistory(` |
| `extractTextFromLCContent` | L3504-L3519 | 16 | `function extractTextFromLCContent(content: any): string {` |
| `extractLastAIText` | L3521-L3532 | 12 | `function extractLastAIText(messages: any[] \| undefined): string {` |
| `emitReply` | L3547-L3554 | 8 | `async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: RichPayload) {` |
| `ruleBasedFallback` | L3557-L3576 | 20 | `function ruleBasedFallback(lang: string, userText: string): string {` |
| `t` | L3558-L3567 | 10 | `const t = (userText \|\| "").toLowerCase();` |
| `detectIntent` | L3579-L3596 | 18 | `export function detectIntent(` |
| `t` | L3583-L3610 | 28 | `const t = (userText \|\| "").toLowerCase();` |
| `mapStructuredIntentToCategory` | L3599-L3623 | 25 | `export function mapStructuredIntentToCategory(` |
| `looksTransactionalPricingIntent` | L3625-L3635 | 11 | `function looksTransactionalPricingIntent(text: string): boolean {` |
| `detectDominantTurnDomain` | L3644-L3703 | 60 | `function detectDominantTurnDomain(` |
| `isExplicitModifyExitTurn` | L3706-L3711 | 6 | `function isExplicitModifyExitTurn(text: string): boolean {` |
| `buildPricingClarificationReply` | L3713-L3732 | 20 | `function buildPricingClarificationReply(` |
| `isRoomTypeFollowupInReservation` | L3734-L3746 | 13 | `function isRoomTypeFollowupInReservation(` |
| `isGuestsFollowupInReservation` | L3748-L3769 | 22 | `function isGuestsFollowupInReservation(` |
| `isGuestNameFollowupInReservation` | L3771-L3781 | 11 | `function isGuestNameFollowupInReservation(` |
| `hasHolderCorrectionIntent` | L3783-L3793 | 11 | `function hasHolderCorrectionIntent(text: string): boolean {` |
| `hasDraftHolderCorrectionIntent` | L3795-L3797 | 3 | `function hasDraftHolderCorrectionIntent(text: string): boolean {` |
| `buildAskDraftHolderName` | L3799-L3805 | 7 | `function buildAskDraftHolderName(lang: "es" \| "en" \| "pt"): string {` |
| `buildConfirmedHolderChangeNotSupportedReply` | L3807-L3813 | 7 | `function buildConfirmedHolderChangeNotSupportedReply(lang: "es" \| "en" \| "pt"): string {` |
| `resolveDraftHolderCandidate` | L3815-L3818 | 4 | `function resolveDraftHolderCandidate(` |
| `hasActiveReservationDomain` | L3831-L3864 | 34 | `function hasActiveReservationDomain(pre: PreLLMResult): boolean {` |
| `isReservationConfirmSignal` | L3866-L3870 | 5 | `function isReservationConfirmSignal(text: string): boolean {` |
| `isStrictCreateProposalConfirmation` | L3872-L3880 | 9 | `function isStrictCreateProposalConfirmation(text: string): boolean {` |
| `isQuotedCreateNegativeReply` | L3882-L3885 | 4 | `function isQuotedCreateNegativeReply(text: string): boolean {` |
| `buildQuotedCreateConfirmClarification` | L3887-L3893 | 7 | `function buildQuotedCreateConfirmClarification(lang: "es" \| "en" \| "pt"): string {` |
| `buildQuotedCreateProposalPausedReply` | L3895-L3901 | 7 | `function buildQuotedCreateProposalPausedReply(lang: "es" \| "en" \| "pt"): string {` |
| `isPendingCreateProposalContext` | L3903-L3920 | 18 | `function isPendingCreateProposalContext(` |
| `hasStrongReservationDomainExitIntent` | L3922-L3929 | 8 | `function hasStrongReservationDomainExitIntent(text: string): boolean {` |
| `isReservationSnapshotFollowupSignal` | L3931-L3946 | 16 | `function isReservationSnapshotFollowupSignal(pre: PreLLMResult, text: string): boolean {` |
| `isReservationModifySubstateSignal` | L3948-L3974 | 27 | `function isReservationModifySubstateSignal(pre: PreLLMResult, text: string): boolean {` |
| `getReservationDomainLockSignal` | L3976-L4011 | 36 | `function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {` |
| `buildReservationDomainLockReply` | L4013-L4023 | 11 | `function buildReservationDomainLockReply(` |
| `knownSlots` | L4039-L4047 | 9 | `const knownSlots = (canonicalRecord` |
| `isReservationFlowStillActive` | L4136-L4146 | 11 | `function isReservationFlowStillActive(pre: PreLLMResult): boolean {` |
| `shouldUseReservationLocalFallback` | L4148-L4199 | 52 | `function shouldUseReservationLocalFallback(` |
| `buildReservationLocalFallbackReply` | L4201-L4336 | 136 | `function buildReservationLocalFallbackReply(` |
| `knownSlots` | L4219-L4227 | 9 | `const knownSlots = (canonicalRecord` |
| `assessReservationDateCoherence` | L4338-L4351 | 14 | `function assessReservationDateCoherence(` |
| `extractRawOrderedDateRange` | L4353-L4395 | 43 | `function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } \| null {` |
| `toIso` | L4358-L4364 | 7 | `const toIso = (token: string) => {` |
| `anchorCreateDayRangeToDraft` | L4397-L4433 | 37 | `function anchorCreateDayRangeToDraft(` |
| `hasNumericDateRangeWithoutYear` | L4435-L4439 | 5 | `function hasNumericDateRangeWithoutYear(text: string): boolean {` |
| `extractRelativeWeekendDateRange` | L4441-L4464 | 24 | `function extractRelativeWeekendDateRange(` |
| `extractRelativeWeekdayRange` | L4466-L4502 | 37 | `function extractRelativeWeekdayRange(` |
| `extractRelativeWeekdayDate` | L4504-L4518 | 15 | `function extractRelativeWeekdayDate(` |
| `extractSupportedTemporalDateRange` | L4520-L4533 | 14 | `async function extractSupportedTemporalDateRange(` |
| `detectModifyTemporalSideIntent` | L4535-L4537 | 3 | `function detectModifyTemporalSideIntent(` |
| `buildModifyPartialDateSlots` | L4550-L4552 | 3 | `function buildModifyPartialDateSlots(` |
| `resolveModifyDatesContextualMissingSide` | L4572-L4585 | 14 | `function resolveModifyDatesContextualMissingSide(` |
| `detectShortRelativeWeekday` | L4587-L4604 | 18 | `function detectShortRelativeWeekday(text: string): number \| undefined {` |
| `firstWeekdayStrictlyAfter` | L4606-L4614 | 9 | `function firstWeekdayStrictlyAfter(baseIso: string, weekday: number): string \| undefined {` |
| `firstWeekdayOnOrAfter` | L4616-L4623 | 8 | `function firstWeekdayOnOrAfter(baseIso: string, weekday: number): string \| undefined {` |
| `delta` | L4620-L4627 | 8 | `const delta = (weekday - candidate.getUTCDay() + 7) % 7;` |
| `anchorRelativeWeekdayToCheckOutAfterCheckIn` | L4625-L4627 | 3 | `function anchorRelativeWeekdayToCheckOutAfterCheckIn(` |
| `anchorModifyRelativeDateToContext` | L4642-L4645 | 4 | `function anchorModifyRelativeDateToContext(` |
| `resolveCreateDatesContextualMissingSide` | L4658-L4675 | 18 | `function resolveCreateDatesContextualMissingSide(` |
| `anchorCreateRelativeDateToContext` | L4677-L4680 | 4 | `function anchorCreateRelativeDateToContext(` |
| `anchorAvailabilityInquiryDateToContext` | L4714-L4717 | 4 | `function anchorAvailabilityInquiryDateToContext(` |
| `hasModifyDateCorrectionCue` | L4745-L4749 | 5 | `function hasModifyDateCorrectionCue(text: string): boolean {` |
| `hasModifyDatesEntrySignal` | L4751-L4753 | 3 | `function hasModifyDatesEntrySignal(` |
| `buildInvalidReservationDatesReply` | L4762-L4782 | 21 | `function buildInvalidReservationDatesReply(lang: "es" \| "en" \| "pt", reason: "check_order" \| "range_too_long" \| "invalid_format"): string {` |
| `buildInvalidCreateCalendarDateReply` | L4784-L4794 | 11 | `function buildInvalidCreateCalendarDateReply(` |
| `buildInvalidCreateCheckOutReply` | L4796-L4802 | 7 | `function buildInvalidCreateCheckOutReply(lang: "es" \| "en" \| "pt"): string {` |
| `detectRawReservationDateIssue` | L4804-L4827 | 24 | `function detectRawReservationDateIssue(text: string): { reason: "check_order" \| "range_too_long" \| "invalid_format" } \| null {` |
| `tryStructuredAnalyze` | L4830-L4957 | 128 | `export async function tryStructuredAnalyze(params: {` |
| `preLLM` | L5021-L5233 | 213 | `async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {` |
| `lang` | L5068-L5086 | 19 | `const lang = (` |
| `pref` | L5145-L5153 | 9 | `const pref = (hotelConfig as any)?.nearbyPointsMode;` |
| `hasRecentReservationMention` | L5236-L5243 | 8 | `function hasRecentReservationMention(pre: PreLLMResult): boolean {` |
| `shouldClearSelectedReservationTargetForCategory` | L5245-L5267 | 23 | `function shouldClearSelectedReservationTargetForCategory(` |
| `looksLikeEventsQuery` | L5268-L5271 | 4 | `function looksLikeEventsQuery(text: string): boolean {` |
| `buildStateSummary` | L5272-L5281 | 10 | `function buildStateSummary(slots: ReservationSlotsStrict, st: any) {` |
| `initBodyLLMState` | L5294-L5303 | 10 | `function initBodyLLMState(pre: PreLLMResult): BodyLLMState {` |
| `toBodyLLMResult` | L5305-L5314 | 10 | `function toBodyLLMResult(state: BodyLLMState) {` |
| `isRenderableRoomImageUrl` | L5316-L5319 | 4 | `function isRenderableRoomImageUrl(value: unknown): boolean {` |
| `roomInfoImgBodyHasRenderableImages` | L5321-L5324 | 4 | `function roomInfoImgBodyHasRenderableImages(body: unknown): boolean {` |
| `hotelConfigHasRenderableRoomImages` | L5326-L5336 | 11 | `function hotelConfigHasRenderableRoomImages(hotelConfig: unknown): boolean {` |
| `rooms` | L5327-L5327 | 1 | `const rooms = (hotelConfig as { rooms?: unknown })?.rooms;` |
| `hotelHasRenderableRoomInventoryVisuals` | L5338-L5355 | 18 | `async function hotelHasRenderableRoomInventoryVisuals(pre: PreLLMResult): Promise<boolean> {` |
| `runKbPrecedenceRichPath` | L5357-L5388 | 32 | `async function runKbPrecedenceRichPath(pre: PreLLMResult, promptKey: string): Promise<{` |
| `rbLast` | L5373-L5387 | 15 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5375-L5387 | 13 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMTestGreetingFastpath` | L5390-L5407 | 18 | `function tryBodyLLMTestGreetingFastpath(pre: PreLLMResult, state: BodyLLMState): boolean {` |
| `tryConversationalGuestNameCapture` | L5409-L5501 | 93 | `async function tryConversationalGuestNameCapture(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `tryBodyLLMKnowledgeShortcuts` | L5503-L5713 | 211 | `async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {` |
| `looksEventIntent` | L5531-L5542 | 12 | `const looksEventIntent = (() => {` |
| `runBodyLLMGraphPath` | L5715-L5819 | 105 | `async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {` |
| `last` | L5743-L5753 | 11 | `const last = (state.graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L5778-L5788 | 11 | `const resolved = (state.graphResult as any)?.resolved;` |
| `classified` | L5779-L5788 | 10 | `const classified = (state.graphResult as any)?.classified;` |
| `rbLast` | L5802-L5812 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L5804-L5812 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `tryBodyLLMStructuredEnrichment` | L5821-L5858 | 38 | `async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `tryBodyLLMStructuredFallback` | L5860-L5889 | 30 | `async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {` |
| `isCanonicalIsoDateValue` | L5905-L5909 | 5 | `function isCanonicalIsoDateValue(value: string): boolean {` |
| `normalizeCanonicalCreateProposalSnapshot` | L5911-L5935 | 25 | `function normalizeCanonicalCreateProposalSnapshot(` |
| `proposalInputMatchesSnapshot` | L5937-L5949 | 13 | `function proposalInputMatchesSnapshot(` |
| `canonicalStateMatchesCreateSnapshot` | L5951-L5964 | 14 | `function canonicalStateMatchesCreateSnapshot(` |
| `tryUpdateAttributedCreateProposalText` | L5966-L6047 | 82 | `async function tryUpdateAttributedCreateProposalText(params: {` |
| `buildConservativeCreatePersistenceReply` | L6054-L6062 | 9 | `function buildConservativeCreatePersistenceReply(lang: "es" \| "en" \| "pt"): string {` |
| `finalizeDeterministicCreateProposal` | L6064-L6184 | 121 | `async function finalizeDeterministicCreateProposal(params: {` |
| `isCreateProposalConfirmationEligible` | L6186-L6245 | 60 | `function isCreateProposalConfirmationEligible(` |
| `bodyLLM` | L6248-L12975 | 6728 | `async function bodyLLM(pre: PreLLMResult): Promise<any> {` |
| `code` | L7769-L7770 | 2 | `const code = (e as any)?.code;` |
| `prevAttempt` | L7792-L7803 | 12 | `const prevAttempt = (pre.st as any)?.lastEmailCopyAttempt;` |
| `toDDMMYYYY` | L7814-L7814 | 1 | `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };` |
| `prevFailures` | L7864-L7875 | 12 | `const prevFailures = (prevAttempt?.failures \|\| 0) + 1;` |
| `quotedTurnDirectWeekdayRange` | L9808-L9817 | 10 | `const quotedTurnDirectWeekdayRange = (() => {` |
| `toDDMMYYYY` | L10046-L10049 | 4 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L10079-L10081 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `toDDMMYYYY` | L10117-L10119 | 3 | `const toDDMMYYYY = (iso?: string) => {` |
| `rawMsg` | L10147-L10149 | 3 | `const rawMsg = (lastErr as any)?.message \|\| String(lastErr \|\| '');` |
| `jidFromGuest` | L10175-L10242 | 68 | `const jidFromGuest = (pre.msg.guestId \|\| '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L10176-L10242 | 67 | `const jidFromConv = (pre.conversationId \|\| '').split('whatsapp-')[1];` |
| `code` | L10222-L10223 | 2 | `const code = (e as any)?.code;` |
| `code` | L10278-L10279 | 2 | `const code = (e as any)?.code;` |
| `jidFromGuest` | L10296-L10364 | 69 | `const jidFromGuest = (pre.msg.guestId \|\| "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;` |
| `jidFromConv` | L10297-L10364 | 68 | `const jidFromConv = (pre.conversationId \|\| "").split("whatsapp-")[1];` |
| `code` | L10343-L10344 | 2 | `const code = (e as any)?.code;` |
| `code` | L10400-L10401 | 2 | `const code = (e as any)?.code;` |
| `code` | L10457-L10458 | 2 | `const code = (e as any)?.code;` |
| `pendingAvailabilityVerification` | L10485-L10485 | 1 | `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;` |
| `pendingCancellation` | L10514-L10514 | 1 | `const pendingCancellation = (pre.st as any)?.pendingCancellation as { reservationId?: string; awaitingConfirmation?: boolean } \| undefined;` |
| `snapshotSlots` | L11413-L11422 | 10 | `const snapshotSlots = (canonicalSlots` |
| `looksEventIntent` | L11485-L11499 | 15 | `const looksEventIntent = (() => {` |
| `last` | L11796-L11807 | 12 | `const last = (graphResult as any)?.messages?.at?.(-1);` |
| `resolved` | L11842-L11852 | 11 | `const resolved = (graphResult as any)?.resolved;` |
| `classified` | L11843-L11852 | 10 | `const classified = (graphResult as any)?.classified;` |
| `rbLast` | L11866-L11876 | 11 | `const rbLast = (rbState as any)?.messages?.at?.(-1);` |
| `rbRich` | L11868-L11876 | 9 | `const rbRich = (rbState as any)?.meta?.rich as RichPayload \| undefined;` |
| `cons` | L12459-L12470 | 12 | `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({` |
| `txt` | L12504-L12506 | 3 | `const txt = (finalText \|\| '').trim();` |
| `toDDMMYYYY` | L12509-L12513 | 5 | `const toDDMMYYYY = (iso?: string) => {` |
| `currentDates` | L12537-L12537 | 1 | `const currentDates = (String(pre.msg.content \|\| '').match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) \|\| []).map(d => d);` |
| `toISO` | L12550-L12552 | 3 | `const toISO = (d: string) => {` |
| `toDDMMYYYY` | L12557-L12557 | 1 | `const toDDMMYYYY = (iso?: string) => iso ? iso.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') : '';` |
| `stripOffTopicAmenitiesTail` | L12977-L12999 | 23 | `function stripOffTopicAmenitiesTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripOffTopicBillingTail` | L13001-L13026 | 26 | `function stripOffTopicBillingTail(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `harmonizeBillingCurrencyAnswer` | L13028-L13080 | 53 | `async function harmonizeBillingCurrencyAnswer(` |
| `ensureBillingContextualFollowup` | L13082-L13094 | 13 | `function ensureBillingContextualFollowup(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `buildDeterministicBillingReply` | L13096-L13158 | 63 | `async function buildDeterministicBillingReply(` |
| `textNorm` | L13111-L13115 | 5 | `const textNorm = (userText \|\| "").toLowerCase();` |
| `applyCommittedHotelTone` | L13160-L13195 | 36 | `function applyCommittedHotelTone(text: string, lang: "es" \| "en" \| "pt"): string {` |
| `stripGlobalTailNoise` | L13197-L13208 | 12 | `function stripGlobalTailNoise(text: string): string {` |
| `buildModifyGuidance` | L13210-L13225 | 16 | `function buildModifyGuidance(` |
| `es` | L13215-L13217 | 3 | `const es = () =>` |
| `en` | L13218-L13220 | 3 | `const en = () =>` |
| `pt` | L13221-L13223 | 3 | `const pt = () =>` |
| `isContactHotelText` | L13227-L13236 | 10 | `function isContactHotelText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L13228-L13244 | 17 | `const t = (text \|\| "").toLowerCase();` |
| `isQuoteOrConfirmText` | L13244-L13252 | 9 | `function isQuoteOrConfirmText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L13245-L13255 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `wantsGenericModify` | L13255-L13272 | 18 | `function wantsGenericModify(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L13256-L13266 | 11 | `const t = (text \|\| "").toLowerCase();` |
| `isExecutableModifyIntent` | L13274-L13281 | 8 | `function isExecutableModifyIntent(` |
| `buildModifyInquiryReply` | L13283-L13307 | 25 | `function buildModifyInquiryReply(lang: "es" \| "en" \| "pt", text: string): string \| null {` |
| `buildModifyOptionsMenu` | L13309-L13364 | 56 | `function buildModifyOptionsMenu(` |
| `buildModifyReservationSelectionIntro` | L13366-L13399 | 34 | `function buildModifyReservationSelectionIntro(` |
| `isGenericFallbackText` | L13403-L13412 | 10 | `function isGenericFallbackText(text: string, lang: "es" \| "en" \| "pt"): boolean {` |
| `t` | L13404-L13415 | 12 | `const t = (text \|\| "").toLowerCase();` |
| `parseReservationCode` | L13415-L13424 | 10 | `function parseReservationCode(text: string): string \| undefined {` |
| `extractReservationCodeLikeToken` | L13425-L13428 | 4 | `function extractReservationCodeLikeToken(text: string): string \| undefined {` |
| `buildAskReservationCode` | L13429-L13433 | 5 | `function buildAskReservationCode(lang: "es" \| "en" \| "pt"): string {` |
| `buildReservationCopySummary` | L13437-L13447 | 11 | `function buildReservationCopySummary(pre: PreLLMResult, nextSlots: ReservationSlotsStrict) {` |
| `detectWhatsAppCopyRequest` | L13449-L13467 | 19 | `function detectWhatsAppCopyRequest(pre: PreLLMResult, text: string): { matched: boolean; mode?: 'explicit' \| 'light'; inlinePhone?: string } {` |
| `posLLM` | L13470-L13511 | 42 | `async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {` |
| `handleIncomingMessage` | L13515-L13523 | 9 | `export async function handleIncomingMessage(` |
| `respCategory` | L13725-L13750 | 26 | `const respCategory = (body?.graphResult?.category \|\| body?.nextCategory \|\| pre.prevCategory) as string \| undefined;` |
| `respPromptKey` | L13726-L13750 | 25 | `const respPromptKey = (` |
| `respContentVersion` | L13732-L13750 | 19 | `const respContentVersion = (` |
| `respSource` | L13737-L13750 | 14 | `const respSource = (` |
| `respSalesStage` | L13741-L13750 | 10 | `const respSalesStage = (body?.graphResult?.salesStage \|\| pre.st?.salesStage) as string \| undefined;` |
