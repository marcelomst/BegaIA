# bodyLLM internal scan

Archivo: `lib/handlers/messageHandler.ts`
Rango analizado: L5257-L11996
Tamaño estimado: 6740 líneas
Bucket size: 250

> Scan estático readonly. Sirve para mapear densidad interna de `bodyLLM`, no para modificar código.

---

## 1. Buckets internos de bodyLLM

| Rango | Top markers | returns | awaits | decisions | temporal/check markers |
| --- | --- | ---: | ---: | ---: | ---: |
| 5227-5476 | `date/temporal:117`, `structured analyze:45`, `create:43`, `reservationSlots:19`, `graph/classifier/policy:19`, `state/result:18`, `faq/policies/amenities:14`, `reply builders:12` | 5 | 3 | 13 | 37 |
| 5477-5726 | `modify:58`, `date/temporal:58`, `reservationSlots:53`, `create:43`, `availability:28`, `state/result:27`, `graph/classifier/policy:18`, `reply builders:16` | 10 | 10 | 16 | 18 |
| 5727-5976 | `date/temporal:97`, `create:71`, `reservationSlots:51`, `state/result:34`, `availability:29`, `graph/classifier/policy:13`, `reply builders:9`, `modify:7` | 5 | 7 | 17 | 60 |
| 5977-6226 | `create:69`, `date/temporal:56`, `reservationSlots:45`, `state/result:35`, `modify:27`, `reply builders:17`, `email/whatsapp copy:13`, `early return:10` | 10 | 12 | 19 | 18 |
| 6227-6476 | `modify:101`, `date/temporal:81`, `reservationSlots:38`, `state/result:26`, `reply builders:18`, `selected target:15`, `create:11`, `conversationFocus:10` | 8 | 7 | 12 | 13 |
| 6477-6726 | `email/whatsapp copy:106`, `reservationSlots:84`, `date/temporal:52`, `modify:40`, `selected target:34`, `state/result:31`, `reply builders:17`, `graph/classifier/policy:11` | 9 | 17 | 21 | 19 |
| 6727-6976 | `modify:66`, `date/temporal:46`, `snapshot/verify:45`, `email/whatsapp copy:45`, `reservationSlots:31`, `structured analyze:19`, `selected target:17`, `graph/classifier/policy:14` | 11 | 12 | 11 | 7 |
| 6977-7226 | `date/temporal:129`, `reservationSlots:69`, `modify:54`, `create:38`, `state/result:25`, `reply builders:19`, `snapshot/verify:16`, `structured analyze:14` | 7 | 6 | 9 | 39 |
| 7227-7476 | `modify:73`, `date/temporal:57`, `snapshot/verify:51`, `reservationSlots:34`, `selected target:28`, `reply builders:23`, `email/whatsapp copy:14`, `structured analyze:13` | 8 | 8 | 11 | 20 |
| 7477-7726 | `date/temporal:148`, `modify:126`, `reservationSlots:117`, `selected target:32`, `reply builders:26`, `state/result:24`, `email/whatsapp copy:11`, `conversationFocus:10` | 9 | 8 | 10 | 43 |
| 7727-7976 | `modify:129`, `date/temporal:112`, `reservationSlots:91`, `reply builders:34`, `state/result:32`, `early return:15`, `email/whatsapp copy:15`, `graph/classifier/policy:15` | 15 | 9 | 17 | 36 |
| 7977-8226 | `date/temporal:79`, `availability:58`, `reservationSlots:50`, `modify:38`, `reply builders:38`, `create:33`, `state/result:27`, `graph/classifier/policy:20` | 15 | 9 | 17 | 31 |
| 8227-8476 | `create:203`, `date/temporal:202`, `reservationSlots:37`, `reply builders:33`, `confirm:18`, `state/result:16`, `early return:9`, `modify:7` | 9 | 5 | 10 | 47 |
| 8477-8726 | `create:97`, `email/whatsapp copy:60`, `reservationSlots:50`, `date/temporal:40`, `state/result:21`, `reply builders:17`, `early return:13`, `graph/classifier/policy:11` | 13 | 12 | 17 | 22 |
| 8727-8976 | `email/whatsapp copy:194`, `reservationSlots:86`, `state/result:38`, `date/temporal:36`, `snapshot/verify:13`, `early return:12`, `graph/classifier/policy:10`, `confirm:1` | 11 | 27 | 29 | 14 |
| 8977-9226 | `email/whatsapp copy:112`, `reservationSlots:78`, `cancel:55`, `date/temporal:33`, `state/result:30`, `confirm:20`, `snapshot/verify:17`, `create:15` | 8 | 22 | 17 | 14 |
| 9227-9476 | `cancel:50`, `create:46`, `date/temporal:40`, `confirm:35`, `reservationSlots:28`, `reply builders:24`, `modify:19`, `email/whatsapp copy:18` | 16 | 12 | 19 | 11 |
| 9477-9726 | `reservationSlots:83`, `date/temporal:67`, `modify:56`, `snapshot/verify:55`, `state/result:31`, `create:24`, `reply builders:22`, `early return:21` | 21 | 14 | 21 | 18 |
| 9727-9976 | `reservationSlots:71`, `date/temporal:70`, `snapshot/verify:61`, `reply builders:41`, `canonical state:29`, `state/result:24`, `confirm:24`, `create:17` | 10 | 4 | 10 | 37 |
| 9977-10226 | `reply builders:38`, `billing:34`, `reservationSlots:25`, `graph/classifier/policy:23`, `state/result:15`, `create:13`, `email/whatsapp copy:13`, `fallback:9` | 6 | 8 | 14 | 6 |
| 10227-10476 | `graph/classifier/policy:48`, `reservationSlots:36`, `fallback:34`, `state/result:30`, `reply builders:26`, `create:25`, `email/whatsapp copy:15`, `date/temporal:15` | 1 | 7 | 12 | 4 |
| 10477-10726 | `date/temporal:142`, `modify:114`, `reservationSlots:53`, `reply builders:22`, `state/result:19`, `email/whatsapp copy:16`, `selected target:13`, `conversationFocus:9` | 5 | 7 | 11 | 24 |
| 10727-10976 | `date/temporal:193`, `create:80`, `reservationSlots:40`, `modify:32`, `confirm:17`, `state/result:14`, `reply builders:13`, `structured analyze:12` | 4 | 4 | 18 | 68 |
| 10977-11226 | `create:103`, `date/temporal:92`, `reservationSlots:66`, `availability:31`, `modify:24`, `state/result:23`, `reply builders:15`, `email/whatsapp copy:13` | 10 | 7 | 26 | 23 |
| 11227-11476 | `create:51`, `reservationSlots:35`, `date/temporal:24`, `snapshot/verify:20`, `reply builders:20`, `modify:19`, `state/result:14`, `availability:10` | 5 | 7 | 19 | 12 |
| 11477-11726 | `billing:57`, `early return:41`, `confirm:40`, `email/whatsapp copy:20`, `create:18`, `date/temporal:18`, `reply builders:12`, `snapshot/verify:7` | 41 | 2 | 35 | 2 |
| 11727-11922 | `reservationSlots:52`, `date/temporal:48`, `early return:29`, `email/whatsapp copy:21`, `modify:13`, `structured analyze:11`, `reply builders:9`, `state/result:8` | 29 | 0 | 23 | 13 |

---

## 2. Diagrama tentativo por buckets

```mermaid
flowchart TD
  B0["5227-5476<br/>date/temporal<br/>structured analyze<br/>create"]
  B1["5477-5726<br/>modify<br/>date/temporal<br/>reservationSlots"]
  B2["5727-5976<br/>date/temporal<br/>create<br/>reservationSlots"]
  B3["5977-6226<br/>create<br/>date/temporal<br/>reservationSlots"]
  B4["6227-6476<br/>modify<br/>date/temporal<br/>reservationSlots"]
  B5["6477-6726<br/>email/whatsapp copy<br/>reservationSlots<br/>date/temporal"]
  B6["6727-6976<br/>modify<br/>date/temporal<br/>snapshot/verify"]
  B7["6977-7226<br/>date/temporal<br/>reservationSlots<br/>modify"]
  B8["7227-7476<br/>modify<br/>date/temporal<br/>snapshot/verify"]
  B9["7477-7726<br/>date/temporal<br/>modify<br/>reservationSlots"]
  B10["7727-7976<br/>modify<br/>date/temporal<br/>reservationSlots"]
  B11["7977-8226<br/>date/temporal<br/>availability<br/>reservationSlots"]
  B12["8227-8476<br/>create<br/>date/temporal<br/>reservationSlots"]
  B13["8477-8726<br/>create<br/>email/whatsapp copy<br/>reservationSlots"]
  B14["8727-8976<br/>email/whatsapp copy<br/>reservationSlots<br/>state/result"]
  B15["8977-9226<br/>email/whatsapp copy<br/>reservationSlots<br/>cancel"]
  B16["9227-9476<br/>cancel<br/>create<br/>date/temporal"]
  B17["9477-9726<br/>reservationSlots<br/>date/temporal<br/>modify"]
  B18["9727-9976<br/>reservationSlots<br/>date/temporal<br/>snapshot/verify"]
  B19["9977-10226<br/>reply builders<br/>billing<br/>reservationSlots"]
  B20["10227-10476<br/>graph/classifier/policy<br/>reservationSlots<br/>fallback"]
  B21["10477-10726<br/>date/temporal<br/>modify<br/>reservationSlots"]
  B22["10727-10976<br/>date/temporal<br/>create<br/>reservationSlots"]
  B23["10977-11226<br/>create<br/>date/temporal<br/>reservationSlots"]
  B24["11227-11476<br/>create<br/>reservationSlots<br/>date/temporal"]
  B25["11477-11726<br/>billing<br/>early return<br/>confirm"]
  B26["11727-11922<br/>reservationSlots<br/>date/temporal<br/>early return"]

  B0 --> B1
  B1 --> B2
  B2 --> B3
  B3 --> B4
  B4 --> B5
  B5 --> B6
  B6 --> B7
  B7 --> B8
  B8 --> B9
  B9 --> B10
  B10 --> B11
  B11 --> B12
  B12 --> B13
  B13 --> B14
  B14 --> B15
  B15 --> B16
  B16 --> B17
  B17 --> B18
  B18 --> B19
  B19 --> B20
  B20 --> B21
  B21 --> B22
  B22 --> B23
  B23 --> B24
  B24 --> B25
  B25 --> B26

  classDef darkBox fill:#111111,stroke:#d1d5db,stroke-width:1px,color:#ffffff;
  class B0 darkBox;
  class B1 darkBox;
  class B2 darkBox;
  class B3 darkBox;
  class B4 darkBox;
  class B5 darkBox;
  class B6 darkBox;
  class B7 darkBox;
  class B8 darkBox;
  class B9 darkBox;
  class B10 darkBox;
  class B11 darkBox;
  class B12 darkBox;
  class B13 darkBox;
  class B14 darkBox;
  class B15 darkBox;
  class B16 darkBox;
  class B17 darkBox;
  class B18 darkBox;
  class B19 darkBox;
  class B20 darkBox;
  class B21 darkBox;
  class B22 darkBox;
  class B23 darkBox;
  class B24 darkBox;
  class B25 darkBox;
  class B26 darkBox;
```

---

## 3. Returns por bucket

### 5227-5476

- L5328: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5355: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5372: `return {`
- L5383: `return {`
- L5404: `return {`

### 5477-5726

- L5479: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5543: `return {`
- L5551: `return {`
- L5573: `return {`
- L5601: `return {`
- L5613: `return {`
- L5624: `return {`
- L5637: `return {`
- L5663: `return {`
- L5684: `return {`

### 5727-5976

- L5738: `return {`
- L5785: `return {`
- L5916: `return {`
- L5940: `return {`
- L5969: `return {`

### 5977-6226

- L5988: `return {`
- L5999: `return {`
- L6036: `return {`
- L6050: `return {`
- L6081: `return {`
- L6117: `return {`
- L6148: `return {`
- L6160: `return { finalText, nextCategory: modifyContextActiveFast ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };`
- L6193: `return {`
- L6204: `return {`

### 6227-6476

- L6241: `return {`
- L6254: `return {`
- L6280: `return {`
- L6315: `return { finalText, nextCategory: modifyContextActiveFast ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };`
- L6355: `return {`
- L6418: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult: null };`
- L6456: `return {`
- L6464: `return {`

### 6477-6726

- L6508: `return {`
- L6539: `return {`
- L6589: `return { finalText, nextCategory: "modify_reservation", nextSlots: knownSlots, needsSupervision, graphResult: null };`
- L6640: `return { finalText: finalTextWA, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: false, graphResult: null };`
- L6649: `return { finalText: failText, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: code && code !== 'WA_NOT_READY', graphResult: null };`
- L6659: `return { finalText: askNum, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: false, graphResult: null };`
- L6675: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6684: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6687: `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso; };`

### 6727-6976

- L6730: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6747: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6769: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6778: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6894: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L6931: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L6944: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L6947: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L6952: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L6964: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L6968: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`

### 6977-7226

- L6981: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L6999: `return {`
- L7044: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7087: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7106: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7178: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7190: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`

### 7227-7476

- L7230: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7254: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7263: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7337: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7376: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7404: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7420: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7470: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 7477-7726

- L7487: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7535: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7550: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7568: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L7573: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L7586: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7611: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7623: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7665: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 7727-7976

- L7796: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7802: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7822: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7853: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7859: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7865: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7871: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7893: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7914: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7928: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7932: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7938: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7958: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7972: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7976: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 7977-8226

- L7982: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7987: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8008: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8022: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8028: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8036: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8085: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8093: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8103: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8131: `return {`
- L8145: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8180: `return {`
- L8195: `return { finalText, nextCategory: "availability_inquiry", nextSlots, needsSupervision, graphResult };`
- L8219: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L8224: `return {`

### 8227-8476

- L8279: `return {`
- L8329: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8359: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision: needsSupervision \|\| readyCreateResult.needsHandoff, graphResult };`
- L8375: `return { finalText, nextCategory: "reservation", nextSlots: pausedDraft, needsSupervision, graphResult };`
- L8380: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8389: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8415: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L8418: `if (typeof startWeekday !== "number" \|\| typeof endWeekday !== "number") return {};`
- L8422: `return checkIn && checkOut ? { checkIn, checkOut } : {};`

### 8477-8726

- L8484: `return {`
- L8498: `return {`
- L8513: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8543: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8564: `return {`
- L8594: `return {`
- L8612: `return {`
- L8649: `return { finalText: buildAskGuestName(pre.lang), nextCategory, nextSlots, needsSupervision, graphResult };`
- L8663: `return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };`
- L8666: `if (!iso) return iso;`
- L8667: `const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L8696: `return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };`
- L8713: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`

### 8727-8976

- L8734: `return { finalText: ask, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L8737: `if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L8764: `return { finalText: ok, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L8780: `return { finalText: fail, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L8839: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8851: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8860: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8895: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8907: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8960: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L8972: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`

### 8977-9226

- L8982: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9017: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9029: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9074: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9086: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9148: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9194: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9207: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`

### 9227-9476

- L9242: `return { finalText, nextCategory: "cancel_reservation", nextSlots: {}, needsSupervision, graphResult };`
- L9247: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9258: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9278: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9323: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9336: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9363: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9371: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9383: `return {`
- L9401: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9416: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9428: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9434: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9437: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9457: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9473: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 9477-9726

- L9507: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9520: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L9523: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L9528: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L9540: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L9544: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L9557: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L9593: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9616: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9621: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9624: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9630: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9635: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9640: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9664: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L9668: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L9681: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9693: `return {`
- L9706: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9711: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9716: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`

### 9727-9976

- L9797: `return {`
- L9811: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9822: `return toBodyLLMResult(state);`
- L9856: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9865: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9915: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9920: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9930: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9950: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9958: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`

### 9977-10226

- L9977: `return keys.some((k) => hay.includes(k));`
- L10076: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10101: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10137: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult, rich: explicitRich };`
- L10159: `debugLog("[KB] fastpath return", { ok: kb.ok, safeCat, hasText: Boolean(text) });`
- L10211: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`

### 10227-10476

- L10239: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`

### 10477-10726

- L10552: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10592: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10604: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10625: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10651: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 10727-10976

- L10821: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10830: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10856: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10864: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`

### 10977-11226

- L10979: `if (!iso) return iso \|\| '';`
- L10981: `return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L11020: `const [dd, mm, yyyy] = d.split(/[\/\-]/); return '${yyyy}-${mm}-${dd}';`
- L11071: `return {`
- L11085: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L11094: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L11105: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L11172: `return {`
- L11207: `return {`
- L11221: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`

### 11227-11476

- L11228: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L11427: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult, rich };`
- L11432: `if (!raw) return raw;`
- L11451: `return out;`
- L11456: `if (!raw) return raw;`

### 11477-11726

- L11478: `return out;`
- L11492: `if (!asksAcceptance) return answer;`
- L11501: `if (!hit) return answer;`
- L11516: `if (!isNegative) return answer;`
- L11517: `return lang === "es"`
- L11525: `return lang === "es"`
- L11531: `return answer;`
- L11537: `if (!out) return out;`
- L11539: `if (hasQuestion) return out;`
- L11546: `return '${out}\n\n${followup}';`
- L11579: `return accepted`
- L11583: `if (asksCurrency) return 'Moedas habilitadas hoje: ${currencies.join(", ") \|\| "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e comprovantes?';`
- L11584: `if (asksInvoices) return 'Emitimos fatura: ${issuesInvoices ? "sim" : "por enquanto não"}.\nComprovantes: ${docs.join(", ") \|\| "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e moedas?';`
- L11585: `return 'Meios de pagamento habilitados: ${methods.join(", ") \|\| "(a confirmar)"}.\nMoedas habilitadas: ${currencies.join(", ") \|\| "(a confirmar)"}.\nGarantia com cartão: ${requiresCard ? "sim" : "não"`
- L11589: `return accepted`
- L11593: `if (asksCurrency) return 'Enabled currencies today: ${currencies.join(", ") \|\| "(to be confirmed)"}.\n\nDo you want details on payment methods and invoices?';`
- L11594: `if (asksInvoices) return 'Invoices issued: ${issuesInvoices ? "yes" : "currently disabled"}.\nInvoice documents: ${docs.join(", ") \|\| "(to be confirmed)"}.\n\nDo you want details on payment methods an`
- L11595: `return 'Enabled payment methods: ${methods.join(", ") \|\| "(to be confirmed)"}.\nEnabled currencies: ${currencies.join(", ") \|\| "(to be confirmed)"}.\nCard required for guarantee: ${requiresCard ? "yes`
- L11599: `return accepted`
- L11603: `if (asksCurrency) return 'Monedas habilitadas hoy: ${currencies.join(", ") \|\| "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y comprobantes?';`
- L11604: `if (asksInvoices) return 'Emitimos factura: ${issuesInvoices ? "sí" : "por el momento no"}.\nComprobantes: ${docs.join(", ") \|\| "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y monedas?';`
- L11605: `return 'Medios de pago habilitados: ${methods.join(", ") \|\| "(a confirmar)"}.\nMonedas habilitadas: ${currencies.join(", ") \|\| "(a confirmar)"}.\nTarjeta para garantía: ${requiresCard ? "sí" : "no"}.\`
- L11607: `if (lang === "pt") return "Posso te ajudar com pagamentos e faturamento. Quer que eu detalhe meios, moedas ou comprovantes?";`
- L11608: `if (lang === "en") return "I can help with payments and billing. Do you want details on methods, currencies, or invoices?";`
- L11609: `return "Puedo ayudarte con pagos y facturación. ¿Querés que te detalle medios, monedas o comprobantes?";`

### 11727-11922

- L11733: `return normalizedIntent.kind === "modify" \|\| wantsGenericModify(text, lang);`
- L11738: `if (normalizedIntent.kind !== "other") return null;`
- L11745: `if (!(asksBeforePrice \|\| asksConditionalAvailability \|\| asksCanModify)) return null;`
- L11748: `if (asksBeforePrice) return "¿De cuál reserva querés que te recuerde el precio?";`
- L11749: `if (asksConditionalAvailability) return "¿Qué cambio querés consultar? Decime la habitación, fechas o cantidad de huéspedes para revisar disponibilidad.";`
- L11750: `return "Sí, podés modificar una reserva activa. Decime qué cambio querés consultar o cuál reserva querés revisar.";`
- L11753: `if (asksBeforePrice) return "De qual reserva você quer que eu relembre o preço?";`
- L11754: `if (asksConditionalAvailability) return "Qual alteração você quer consultar? Diga o quarto, as datas ou a quantidade de hóspedes para eu verificar a disponibilidade.";`
- L11755: `return "Sim, você pode alterar uma reserva ativa. Diga qual mudança deseja consultar ou qual reserva quer revisar.";`
- L11757: `if (asksBeforePrice) return "Which booking would you like me to remind you of the price for?";`
- L11758: `if (asksConditionalAvailability) return "What change would you like to check? Tell me the room, dates, or number of guests so I can review availability.";`
- L11759: `return "Yes, you can modify an active booking. Tell me what change you want to check or which booking you want to review.";`
- L11784: `return [`
- L11797: `return [`
- L11809: `return [`
- L11823: `if (!target?.reservationId) return "";`
- L11834: `return [`
- L11841: `return [`
- L11847: `return [`
- L11858: `if (!t) return true;`
- L11864: `return re.test(t) \|\| hotelDemo.test(t);`
- L11874: `return normalized;`
- L11876: `return undefined;`
- L11880: `return candidates[0]?.toUpperCase();`
- L11883: `return lang === "es" ? "¿Me compartís el *código de reserva*?"`


---

## 4. Awaits por bucket

### 5227-5476

- L5241: `const stableIntent = await runStableIntentsGuard({`
- L5307: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5338: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`

### 5477-5726

- L5533: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5552: `finalText: await persistModifyPreviewContext(pre, resolvedModifyTarget0, snapshot),`
- L5561: `await persistAvailabilityInquiry(pre, fastPathSlots);`
- L5581: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, dr0.checkIn, dr0.checkOut, {`
- L5590: `await persistAvailabilityInquiry(pre, nextSlots);`
- L5612: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L5623: `await persistCreateDraft(pre, fastPathSlots);`
- L5636: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L5654: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5692: `const supportedDrFastRaw = await extractSupportedTemporalDateRange(userTxtFast, pre.lang);`

### 5727-5976

- L5737: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L5748: `const readyCreateResult = await runAvailabilityCheck(`
- L5760: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5915: `await persistCreateDraftSnapshot(pre, sanitizedCreateSlots);`
- L5928: `await persistAvailabilityInquiry(pre, normalizedFastPathSlots);`
- L5949: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, ciISO, coISO, {`
- L5958: `await persistAvailabilityInquiry(pre, nextSlots);`

### 5977-6226

- L5987: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L5997: `await persistCreateDraft(pre, normalizedFastPathSlots);`
- L6008: `const readyCreateResult = await runAvailabilityCheck(`
- L6018: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6049: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L6067: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6101: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6146: `await persistCreateDraftSnapshot(pre, sanitizedCreateSlots);`
- L6192: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L6203: `await persistCreateDraft(pre, fastPathSlots);`
- L6213: `const readyCreateResult = await runAvailabilityCheck(`
- L6223: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 6227-6476

- L6253: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L6271: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6292: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6342: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6394: `const userDatesFast = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L6446: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6465: `finalText: await persistModifyPreviewContext(pre, resolvedFastReservationTarget, snapshot),`

### 6477-6726

- L6485: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6534: `await persistModifyExecutionContext(pre, resolvedFastReservationTarget.reservationId, {`
- L6587: `await updateConversationState(pre.msg.hotelId, pre.conversationId, modifyMenuPatch as any);`
- L6607: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L6608: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L6609: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L6620: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L6622: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L6625: `const { redis } = await import('@/lib/services/redis');`
- L6628: `const ack = await redis.get('wa:ack:${requestId}');`
- L6630: `await new Promise(r => setTimeout(r, 120));`
- L6669: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { supervised: true, desiredAction: 'notify_reception', updatedBy: 'ai' } as any);`
- L6689: `const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');`
- L6704: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: lastEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L6712: `const { classifyEmailError } = await import('@/lib/email/classifyEmailError');`
- L6720: `if (attempt < 2 && !sent) await new Promise(r => setTimeout(r, 150));`
- L6724: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { lastEmailCopyAttempt: { to: lastEmail, failures: 0, updatedAt: new Date().toISOString(), lastErrorType: undefined }, lastCategory: `

### 6727-6976

- L6733: `const { classifyEmailError } = await import('@/lib/email/classifyEmailError');`
- L6741: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { supervised: true, desiredAction: 'notify_reception', lastEmailCopyAttempt: { to: lastEmail, failures: prevFailures, updatedAt: new `
- L6749: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { lastEmailCopyAttempt: { to: lastEmail, failures: prevFailures, updatedAt: new Date().toISOString(), lastError: rawMsg, lastErrorTyp`
- L6838: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6888: `await persistModifyExecutionContext(pre, pendingModifyPatchEarly.reservationId, {`
- L6907: `const correctionDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L6924: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L6937: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L6946: `finalText = await persistModifyPreviewContext(pre, pendingTarget, updatedPreviewSnapshot);`
- L6957: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L6967: `finalText = await executeModifyReservationWithSnapshot(pre, pendingTarget.reservationId, currentPreviewSnapshot);`
- L6971: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 6977-7226

- L7023: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7052: `const earlyModifyDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7070: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7091: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7120: `const createDraftTemporalDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7205: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 7227-7476

- L7234: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7331: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7341: `const reservationListSource = await resolveReservationListSource(pre);`
- L7364: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7389: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7412: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7445: `const directModifyUserDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7474: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 7477-7726

- L7495: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7526: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7558: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7572: `finalText = await persistModifyPreviewContext(pre, target, snapshot);`
- L7576: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7599: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7633: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7707: `? await extractSupportedTemporalDateRange(userTxtRaw, pre.lang)`

### 7727-7976

- L7780: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7798: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, ingestedSlots);`
- L7837: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7855: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, correctedSlots);`
- L7878: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7903: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7930: `finalText = await persistModifyPreviewContext(pre, previewTarget, snapshot);`
- L7947: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7974: `finalText = await persistModifyPreviewContext(pre, previewTarget, snapshot);`

### 7977-8226

- L7997: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8024: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, snapshot);`
- L8058: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8105: `const availabilityResult = await runAvailabilityCheck(`
- L8114: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8168: `await persistAvailabilityInquiry(pre, availabilityInquirySlots);`
- L8197: `const availabilityResult = await runAvailabilityCheck(availabilityPre, availabilityInquirySlots, inquiryCheckIn, inquiryCheckOut, {`
- L8206: `await persistAvailabilityInquiry(pre, nextSlots);`
- L8223: `await persistAvailabilityInquiry(pre, availabilityInquirySlots);`

### 8227-8476

- L8277: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L8331: `const readyCreateResult = await runAvailabilityCheck(`
- L8341: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8373: `await persistCreateDraft(pre, pausedDraft);`
- L8424: `const quotedTurnSupportedDates = await extractSupportedTemporalDateRange(trimmedQuotedReply, pre.lang);`

### 8477-8726

- L8482: `await persistCreateDraftSnapshot(pre, quotedDraftConsistency.sanitizedSlots);`
- L8494: `await persistCreateDraft(pre, quotedDraftConsistency.sanitizedSlots);`
- L8515: `const requoteResult = await runAvailabilityCheck(`
- L8525: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8546: `await persistCreateDraft(pre, quotedDraftConsistency.sanitizedSlots);`
- L8562: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L8592: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L8610: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L8631: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8669: `const { sendReservationCopy } = await import("@/lib/email/sendReservationCopy");`
- L8684: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: email, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8687: `lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150));`

### 8727-8976

- L8739: `const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');`
- L8754: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: explicitEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8756: `} catch (err) { lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150)); }`
- L8805: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L8806: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8807: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8818: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jidInline, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8820: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jidInline, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L8824: `const { redis } = await import('@/lib/services/redis');`
- L8827: `const ack = await redis.get('wa:ack:${requestId}');`
- L8829: `await new Promise(r => setTimeout(r, 120));`
- L8863: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L8864: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8865: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8876: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8878: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L8881: `const { redis } = await import('@/lib/services/redis');`
- L8884: `const ack = await redis.get('wa:ack:${requestId}');`
- L8886: `await new Promise(r => setTimeout(r, 120));`
- L8927: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L8928: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8929: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8940: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jidInline, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8942: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jidInline, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L8945: `const { redis } = await import('@/lib/services/redis');`

### 8977-9226

- L8985: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L8986: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8987: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8998: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9000: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L9003: `const { redis } = await import('@/lib/services/redis');`
- L9006: `const ack = await redis.get('wa:ack:${requestId}');`
- L9008: `await new Promise(r => setTimeout(r, 120));`
- L9041: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L9042: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L9043: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L9054: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9056: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L9059: `const { redis } = await import('@/lib/services/redis');`
- L9062: `const ack = await redis.get('wa:ack:${requestId}');`
- L9064: `await new Promise(r => setTimeout(r, 120));`
- L9135: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9152: `const { cancelReservation } = await import("@/lib/agents/reservations");`
- L9153: `const r = await cancelReservation(pre.msg.hotelId, pendingCancellation.reservationId);`
- L9160: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9197: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9225: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 9227-9476

- L9249: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9261: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9281: `const { cancelReservation } = await import("@/lib/agents/reservations");`
- L9282: `const r = await cancelReservation(pre.msg.hotelId, resolvedCancelCode);`
- L9289: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9326: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9344: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L9381: `await persistCreateDraft(pre, createDraftSlots);`
- L9419: `await persistCreateDraft(pre, createDraftSlots);`
- L9432: `await persistCreateDraft(pre, createDraftSlots);`
- L9441: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9467: `await persistModifyExecutionContext(pre, pendingModifyPatch.reservationId, {`

### 9477-9726

- L9500: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L9513: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L9522: `finalText = await persistModifyPreviewContext(pre, pendingTarget, updatedPreviewSnapshot);`
- L9533: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L9543: `finalText = await executeModifyReservationWithSnapshot(pre, pendingTarget.reservationId, currentPreviewSnapshot);`
- L9547: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9595: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9653: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9667: `finalText = await persistModifyPreviewContext(pre, genericModifyTarget, snapshot);`
- L9671: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9691: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L9704: `await persistCreateDraft(pre, snapshot as ReservationSlotsStrict);`
- L9719: `const { confirmAndCreate } = await import("@/lib/agents/reservations");`
- L9720: `const result = await confirmAndCreate(pre.msg.hotelId, snapshot as any, pre.msg.channel);`

### 9727-9976

- L9752: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9821: `if (await tryConversationalGuestNameCapture(pre, state)) {`
- L9923: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L9934: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`

### 9977-10226

- L10037: `const kbForced = await answerWithKnowledge({`
- L10046: `finalText = await harmonizeBillingCurrencyAnswer(finalText, kbUserText, pre.msg.hotelId, pre.lang);`
- L10052: `finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);`
- L10082: `finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);`
- L10120: `const richResolved = await runKbPrecedenceRichPath(pre, kbPrecedence.promptKey);`
- L10140: `const kb = await answerWithKnowledge({`
- L10188: `await persistCreateLateralCategoryIfNeeded(pre, kbUserText, dominantTurnDomain, nextCategory);`
- L10223: `await persistCreateLateralCategoryIfNeeded(pre, kbUserText, dominantTurnDomain, nextCategory);`

### 10227-10476

- L10255: `graphResult = await withTimeout(`
- L10325: `const rbState = await retrievalBased({`
- L10356: `await tryBodyLLMStructuredEnrichment(pre, state);`
- L10372: `await tryBodyLLMStructuredFallback(pre, state);`
- L10407: `await persistCreateDraft(pre, createGatingSlots);`
- L10419: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10451: `await persistCreateLateralCategoryIfNeeded(pre, rawTurnText, dominantTurnDomain, nextCategory);`

### 10477-10726

- L10507: `const temporalUserDates = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L10536: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10576: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10600: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, ingestedSlots);`
- L10627: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10689: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10705: `const userDates = await extractSupportedTemporalDateRange(String(pre.msg.content \|\| ""), pre.lang);`

### 10727-10976

- L10823: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L10838: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L10895: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10928: `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({`

### 10977-11226

- L11069: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L11083: `await persistCreateDraft(pre, createQuoteSlots);`
- L11115: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, modifyTarget, modifySnapshot);`
- L11128: `const res = await runAvailabilityCheck(availabilityPre, nextSlots, ciISO!, coISO!);`
- L11138: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11205: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L11219: `await persistCreateDraft(pre, createQuoteSlots);`

### 11227-11476

- L11230: `const res = await runAvailabilityCheck(availabilityPre, { ...nextSlots }, ciISO, coISO);`
- L11235: `await persistModifyExecutionContext(pre, modifyReservationId, {`
- L11283: `finalText = await harmonizeBillingCurrencyAnswer(`
- L11328: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11351: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L11357: `await persistCreateDraft(pre, quotedReservationSnapshot as ReservationSlotsStrict);`
- L11383: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 11477-11726

- L11504: `const cfg = await getHotelConfig(hotelId);`
- L11555: `const cfg = await getHotelConfig(hotelId);`

### 11727-11922

- sin awaits detectados


---

## 5. Decisiones por bucket

### 5227-5476

- L5262: `if (stableIntent.matched && stableIntent.response && !shouldSuppressStableIntent) {`
- L5285: `if (`
- L5293: `if (continuation) finalText = '${String(finalText \|\| "").trim()} ${continuation}'.trim();`
- L5295: `if (shouldClearSelectedReservationTargetForCategory(nextCategory, null)) {`
- L5306: `if (!shouldPreserveModifyTarget) {`
- L5331: `if (`
- L5358: `if (rawCreateDateIssue) {`
- L5371: `if (!isNonReservationFollowup && rawCreateSubFlow === "create" && rawCreateIntent.kind !== "modify" && rawCreateIntent.kind !== "cancel" && hasExplicitCreateContext) {`
- L5381: `if (dominantTurnDomain.dominant === "pricing" && !dominantTurnDomain.hasReservation) {`
- L5402: `if (vagueWeekendReservationIntent) {`
- L5412: `// Fast-path 0: if the user provides an explicit full date range in the same message, confirm immediately`
- L5470: `if (dr0.checkIn && dr0.checkOut && !isEventLikeMessage && !hasCompleteRichCreatePayloadInTurn0) {`
- L5476: `if (dr0Coherence && !dr0Coherence.ok) {`

### 5477-5726

- L5512: `if (shouldBypassRichCreateFastPath \|\| shouldBypassRichModifyFastPath) {`
- L5516: `if (`
- L5531: `if (!fastModifyValidation.ok) {`
- L5532: `if (fastModifyValidation.nextField) {`
- L5559: `if (availabilityInquiryPolicy0) {`
- L5562: `if (inquiryMissingField) {`
- L5586: `if (!availabilityResult.needsHandoff) {`
- L5609: `if (fastPathSubFlow === "create") {`
- L5611: `if (!createDraftConsistency.valid) {`
- L5622: `if (missingField) {`
- L5633: `if (fastPathSubFlow === "modify") {`
- L5635: `if (previewTarget?.reservationId) {`
- L5653: `if (fastPathSubFlow === "modify") {`
- L5683: `if (ambiguousQuotedProposalConfirmationFast) {`
- L5717: `if (fastPathSubFlow === "create" && !explicitTurnSlotsFast.guestName) {`
- L5719: `if (safeLeadGuestName) explicitTurnSlotsFast.guestName = safeLeadGuestName;`

### 5727-5976

- L5731: `if (currentTurnReadyCreateFast) {`
- L5736: `if (!createDraftConsistency.valid) {`
- L5853: `if (hasOneDateOnly && hasContext && !shouldDeferSingleDateFastPath) {`
- L5854: `if (singleFastISO && reservationContextualMissingSideFast) {`
- L5864: `if (`
- L5872: `if (!normalizedFastPathSlots.numGuests) {`
- L5874: `if (explicitGuestCount) normalizedFastPathSlots.numGuests = explicitGuestCount;`
- L5877: `if (`
- L5889: `if (inheritedCheckOutCoherence && !inheritedCheckOutCoherence.ok) {`
- L5895: `if (`
- L5903: `if (isPastReservationDateISO(coISO) \|\| (checkOutCoherence && !checkOutCoherence.ok)) {`
- L5909: `if (!sanitizedCreateSlots.numGuests) {`
- L5911: `if (explicitGuestCount) sanitizedCreateSlots.numGuests = explicitGuestCount;`
- L5926: `if (availabilityInquiryPolicyFast) {`
- L5929: `if (inquiryMissingField) {`
- L5948: `if (ciISO && coISO) {`
- L5954: `if (!availabilityResult.needsHandoff) {`

### 5977-6226

- L5978: `if (fastPathSubFlow === "create") {`
- L5986: `if (!createDraftConsistency.valid) {`
- L5998: `if (missingField) {`
- L6007: `if (canAutoQuoteCreateFast && isCreateStateReadyForQuote(normalizedFastPathSlots) && ciISO && coISO) {`
- L6045: `if (ciISO && coISO) {`
- L6046: `if (fastPathSubFlow === "modify") {`
- L6048: `if (previewTarget?.reservationId) {`
- L6066: `if (fastPathSubFlow === "modify") {`
- L6090: `if (singleFastISO && fastPathSubFlow === "modify" && fastTemporalSideIntent) {`
- L6126: `if (`
- L6139: `if (`
- L6156: `if (drFast.checkIn && !explicitCheckOutFast && !isConfirmedBooking && isPastReservationCheckInISO(drFast.checkIn)) {`
- L6165: `if (last instanceof HumanMessage) {`
- L6167: `if (lastTxt.trim() === userTxtFast.trim()) hist.pop();`
- L6172: `if (prevISO && currISO) {`
- L6183: `if (fastPathSubFlow === "create") {`
- L6191: `if (!createDraftConsistency.valid) {`
- L6202: `if (missingField) {`
- L6212: `if (canAutoQuoteCreateFast) {`

### 6227-6476

- L6250: `if (fastPathSubFlow === "modify") {`
- L6252: `if (previewTarget?.reservationId) {`
- L6270: `if (fastPathSubFlow === "modify") {`
- L6291: `if (modifyContextActiveFast) {`
- L6321: `if (`
- L6338: `if (hasValueForQueuedField) {`
- L6341: `if (nextQueuedModifyState) {`
- L6416: `if (genericModify && (resolutionFast.status === "ambiguous" \|\| resolutionFast.status === "out_of_range")) {`
- L6428: `if (`
- L6444: `if (!fastInlineValidation.ok) {`
- L6445: `if (fastInlineValidation.nextField) {`
- L6472: `if (`

### 6477-6726

- L6484: `if (activeFieldFast) {`
- L6517: `if (`
- L6556: `if (canOpenModifyMenu) {`
- L6579: `if (resolvedFastReservationTarget?.reservationId) {`
- L6593: `if (pre.prevCategory === 'send_email_copy') {`
- L6597: `if (wantsWhatsApp) {`
- L6600: `if (phoneMatchWA) {`
- L6603: `if (norm.normalized) {`
- L6619: `if (isWhatsAppReady()) {`
- L6623: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L6624: `if (requestId) {`
- L6629: `if (ack) break;`
- L6667: `if (wantsEscalate) {`
- L6677: `if (emailInMsg \|\| wantsRetry) {`
- L6678: `if (!lastEmail) {`
- L6687: `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso; };`
- L6699: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L6700: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L6715: `if (cLoop.isNotConfigured \|\| cLoop.isQuota) {`
- L6720: `if (attempt < 2 && !sent) await new Promise(r => setTimeout(r, 150));`
- L6723: `if (sent) {`

### 6727-6976

- L6739: `if (prevFailures >= escalationThreshold) {`
- L6750: `if (isNotConfigured) {`
- L6756: `} else if (isQuota) {`
- L6837: `if (looksNonReservationDomainTurn && pre.st?.selectedReservationTarget && !shouldPreserveReservationSelectionForOverride) {`
- L6885: `if (awaitingModifyPreviewConfirmationEarly && pendingModifyPatchEarly?.reservationId) {`
- L6887: `if (!pendingTarget?.reservationId \|\| pendingTarget.reservationStatus === "cancelled" \|\| pendingTarget.reservationStatus === "error") {`
- L6923: `if (previewReject) {`
- L6934: `if (hasPreviewCorrections && !previewConfirm) {`
- L6936: `if (!previewValidation.ok) {`
- L6950: `if (!previewConfirm) {`
- L6956: `if (!previewValidation.ok) {`

### 6977-7226

- L6992: `if (`
- L7007: `if (`
- L7046: `if (`
- L7054: `if (`
- L7090: `if (explicitModifyExit) {`
- L7169: `if (`
- L7180: `if (`
- L7193: `if (`
- L7224: `if (`

### 7227-7476

- L7232: `if (ambiguousReservationAction) {`
- L7233: `if (ambiguousReservationAction === "modify") {`
- L7256: `if (`
- L7300: `if (`
- L7315: `if (targetId && target) {`
- L7340: `if (effectiveSnapshotQueryKind === "list") {`
- L7378: `if (effectiveSnapshotQueryKind && resolvedSnapshotTarget) {`
- L7410: `if (modifyFocusActiveEarly && explicitReservationCode && !explicitIdReservationTarget && !explicitOrdinalReservationTarget) {`
- L7463: `if (`
- L7468: `if (!target?.reservationId) {`
- L7472: `if (target.reservationStatus === "cancelled" \|\| target.reservationStatus === "error") {`

### 7477-7726

- L7518: `if (!hasImmediateModifyValue && hasExplicitModifyFieldRequest && hasExplicitModifyTarget) {`
- L7525: `if (activeField) {`
- L7538: `if (hasImmediateModifyValue && hasExplicitModifyTarget && target.reservationId && directImmediateModifyFields.length > 0) {`
- L7548: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L7555: `if (nextRoomTypeForCapacity && hasValidGuestCount) {`
- L7557: `if (capacity > 0 && nextGuestCountNumber > capacity) {`
- L7589: `if (!hasImmediateModifyValue && hasTemporalModifySignal) {`
- L7613: `if (!hasImmediateModifyValue) {`
- L7626: `if (`
- L7667: `if (`

### 7727-7976

- L7758: `if (`
- L7794: `if (!previewTarget?.reservationId) {`
- L7805: `if (activeModifyField === "dates" && hasModifyDateCorrection) {`
- L7815: `if (correctedTemporalISO) {`
- L7820: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L7851: `if (!previewTarget?.reservationId) {`
- L7863: `if (!hasTurnLevelModifyValue && !awaitingModifyExecutionContinuation) {`
- L7868: `if (activeModifyField === "guests" && nextGuestCount) {`
- L7869: `if (!codeFromModifySubstate) {`
- L7875: `if (baseRoomType && hasValidGuestCount) {`
- L7877: `if (capacity > 0 && nextGuestCountNumber > capacity) {`
- L7897: `if (queuedModifyState) {`
- L7926: `if (!previewTarget?.reservationId) {`
- L7935: `if (activeModifyField === "roomType" && nextRoomType && String(nextRoomType) !== String(pre.st?.reservationSlots?.roomType \|\| "")) {`
- L7936: `if (!codeFromModifySubstate) {`
- L7941: `if (queuedModifyState) {`
- L7970: `if (!previewTarget?.reservationId) {`

### 7977-8226

- L7979: `if (activeModifyField === "dates" && hasExplicitDateRange && nextCheckIn && nextCheckOut) {`
- L7980: `if (!codeFromModifySubstate) {`
- L7985: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L7990: `if (queuedModifyState) {`
- L8020: `if (!previewTarget?.reservationId) {`
- L8031: `if (awaitingModifyExecutionContinuation) {`
- L8050: `if (additionalReservationIntent && hasConfirmedBookingContext) {`
- L8079: `if (hasCheckIn && !hasCheckOut) {`
- L8087: `if (!hasCheckIn && hasCheckOut) {`
- L8095: `if (hasCheckIn && hasCheckOut) {`
- L8097: `if (missingField) {`
- L8165: `if (shouldHandleAvailabilityInquiry) {`
- L8167: `if (inquiryMissingField) {`
- L8191: `if (inquiryCheckIn && inquiryCheckOut) {`
- L8193: `if (inquiryDateCoherence && !inquiryDateCoherence.ok) {`
- L8202: `if (!availabilityResult.needsHandoff) {`
- L8222: `if (availabilityInquiryAmbiguousAdvance) {`

### 8227-8476

- L8276: `if (!createDraftConsistency.valid) {`
- L8315: `if (`
- L8327: `if (readyCreateDateCoherence && !readyCreateDateCoherence.ok) {`
- L8361: `if (pendingCreateProposal && !modifyExecutionActive) {`
- L8371: `if (quotedReplyIsNegative) {`
- L8378: `if (!strictQuotedConfirmation && quotedReplyHasConfirmWord) {`
- L8383: `if (!strictQuotedConfirmation && quotedReplyIsBareAffirmative) {`
- L8392: `if (!strictQuotedConfirmation) {`
- L8415: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L8418: `if (typeof startWeekday !== "number" \|\| typeof endWeekday !== "number") return {};`

### 8477-8726

- L8479: `if (hasQuotedProposalCorrection) {`
- L8481: `if (!quotedDraftConsistency.valid) {`
- L8492: `if (!isCreateStateReadyForQuote(quotedDraftConsistency.sanitizedSlots)) {`
- L8509: `if (hasQuotedProposalDateCorrection && requoteCheckIn && requoteCheckOut) {`
- L8511: `if (requoteCoherence && !requoteCoherence.ok) {`
- L8551: `if (`
- L8586: `if (`
- L8602: `if (`
- L8620: `if (`
- L8654: `if (emailAskRE.test(userTxtRaw)) {`
- L8657: `if (!email) {`
- L8666: `if (!iso) return iso;`
- L8679: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L8680: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L8687: `lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150));`
- L8690: `if (sentOK) {`
- L8726: `if (!emailAskRE.test(userTxtRaw) && recentReservationMention && lightVerb && (hasEmailAddr \|\| mentionsEmailWord)) {`

### 8727-8976

- L8728: `if (!explicitEmail) {`
- L8737: `if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L8749: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L8750: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L8756: `} catch (err) { lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150)); }`
- L8758: `if (sentOK) {`
- L8792: `if (!waAskRE.test(userTxtRaw) && waLightAskRE.test(userTxtRaw) && (pre.st?.lastReservation \|\| recentReservationMention)) {`
- L8797: `if (!jid) {`
- L8799: `if (phoneInline) {`
- L8801: `if (attempt.normalized) {`
- L8817: `if (isWhatsAppReady()) {`
- L8821: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L8823: `if (requestId) {`
- L8828: `if (ack) break;`
- L8843: `if (code !== 'WA_NOT_READY') {`
- L8875: `if (isWhatsAppReady()) {`
- L8879: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L8880: `if (requestId) {`
- L8885: `if (ack) break;`
- L8899: `if (code !== 'WA_NOT_READY') {`
- L8912: `if (waAskRE.test(userTxtRaw)) {`
- L8918: `if (!jid) {`
- L8921: `if (phoneInline) {`
- L8923: `if (attempt.normalized) {`
- L8939: `if (isWhatsAppReady()) {`
- L8943: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L8944: `if (requestId) {`
- L8949: `if (ack) break;`
- L8964: `if (code !== 'WA_NOT_READY') {`

### 8977-9226

- L8997: `if (isWhatsAppReady()) {`
- L9001: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L9002: `if (requestId) {`
- L9007: `if (ack) break;`
- L9021: `if (code !== 'WA_NOT_READY') {`
- L9034: `if (pre.prevCategory === "send_whatsapp_copy") {`
- L9036: `if (phoneMatch) {`
- L9038: `if (digits.length >= 6) {`
- L9053: `if (isWhatsAppReady()) {`
- L9057: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L9058: `if (requestId) {`
- L9063: `if (ack) break;`
- L9078: `if (code !== 'WA_NOT_READY') {`
- L9134: `if (inCancelFlow && cancelCodeFromUser && !isPureConfirm(userTxtRaw)) {`
- L9150: `if (pendingCancellation?.reservationId && pendingCancellation.awaitingConfirmation && isPureConfirm(userTxtRaw)) {`
- L9210: `if (wantsCancel) {`
- L9211: `if (`

### 9227-9476

- L9244: `if (!resolvedCancelCode) {`
- L9245: `if (reservationReference.status === "ambiguous" \|\| reservationReference.status === "out_of_range") {`
- L9260: `if (!(isPureConfirm(userTxtRaw) \|\| hasInlineCancelConfirmation)) {`
- L9341: `if (offeredTimeSide && isPureAffirmative(userTxtRaw, pre.lang)) {`
- L9347: `if (time && typeof time === "string") {`
- L9374: `if (`
- L9391: `if (`
- L9403: `if (`
- L9409: `if (!isReservationConfirmable && !modifyExecutionActive && !hasCreateQuoteConfirmationContext) {`
- L9410: `if (reservationFlow === "confirmed") {`
- L9415: `: "There is already a confirmed booking on this conversation. Tell me if you want to modify or cancel it.";`
- L9418: `if (activeCreateFlow && nextCreateMissingField) {`
- L9430: `if (!hasGuests) {`
- L9431: `if (activeCreateFlow && pre.msg.channel === "email" && nextCreateMissingField) {`
- L9439: `if (!hasGuestName) {`
- L9440: `if (!modifyExecutionActive) {`
- L9460: `if (modifyExecutionActive) {`
- L9464: `if (awaitingModifyPreviewConfirmation && pendingModifyPatch?.reservationId) {`
- L9466: `if (!pendingTarget?.reservationId \|\| pendingTarget.reservationStatus === "cancelled" \|\| pendingTarget.reservationStatus === "error") {`

### 9477-9726

- L9499: `if (previewReject) {`
- L9510: `if (hasPreviewCorrections && !previewConfirm) {`
- L9512: `if (!previewValidation.ok) {`
- L9526: `if (!previewConfirm) {`
- L9532: `if (!previewValidation.ok) {`
- L9579: `if (`
- L9587: `if (!hasChanges) {`
- L9618: `if (!codeFromUser) {`
- L9619: `if (reservationReference.status === "ambiguous" \|\| reservationReference.status === "out_of_range") {`
- L9626: `if (!hasChanges) {`
- L9633: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L9638: `if (!genericModifyTarget?.reservationId \|\| genericModifyTarget.reservationStatus === "cancelled" \|\| genericModifyTarget.reservationStatus === "error") {`
- L9651: `if (!genericModifyValidation.ok) {`
- L9652: `if (genericModifyValidation.nextField) {`
- L9684: `if (hasCreateQuoteConfirmationContext) {`
- L9690: `if (!createDraftConsistency.valid) {`
- L9701: `if (!isCreateStateReadyForQuote(snapshot as ReservationSlotsStrict)) {`
- L9703: `if (missingField) {`
- L9709: `if (!snapshot.roomType \|\| !snapshot.checkIn \|\| !snapshot.checkOut) {`
- L9714: `if (createDateCoherence && !createDateCoherence.ok) {`
- L9723: `if (result.ok && hasReservationId) {`

### 9727-9976

- L9773: `if (canonicalRecordForReply) {`
- L9821: `if (await tryConversationalGuestNameCapture(pre, state)) {`
- L9825: `if (!tryBodyLLMTestGreetingFastpath(pre, state)) {`
- L9849: `if (postBookingSnapshotQ && !hasConfirmedBookingContext) {`
- L9858: `if (`
- L9867: `if (`
- L9873: `if (postBookingSnapshotQ === "list") {`
- L9917: `if (postBookingLateCheckoutQ && hasConfirmedBookingContext) {`
- L9922: `if (postBookingEarlyCheckinQ && hasConfirmedBookingContext) {`
- L9932: `if (postBookingTimeQ && hasConfirmedBookingContext) {`

### 9977-10226

- L10030: `if (wantsNearby) {`
- L10033: `if (looksBillingByRule) {`
- L10044: `if (kbForced.ok && forcedText) {`
- L10051: `if (/(actividad\|actividades\|zona\|lugares para visitar\|restaurants? cercanos\|atracciones)/i.test(finalText)) {`
- L10081: `if (!forcedBillingResolved) {`
- L10104: `if (!hasReservationContext && !wantsNearby && !looksEventIntent && !looksTransactionalPricing) {`
- L10106: `if (skipKbFastpath) {`
- L10119: `if (kbPrecedence?.promptKey === "room_info_img" && !kbPrecedence.defersToRuntimeAction) {`
- L10121: `if (richResolved) {`
- L10157: `if (kb.ok && safeCat && text) {`
- L10172: `if (`
- L10184: `if (continuation) {`
- L10217: `if (pureCreateLateralTurn && !pureCreateLateralKbResolved) {`
- L10219: `if (failsafeReply) {`

### 10227-10476

- L10304: `if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {`
- L10322: `if (noContent && isNearby) {`
- L10338: `if (rbRich) explicitRich = rbRich;`
- L10339: `if (rbText) {`
- L10382: `if (!finalText) {`
- L10384: `if (!(pre as any).__orchestratorActive) {`
- L10406: `if (createFlowActive && createMissingField === "guestName" && nextCategory === "reservation") {`
- L10413: `if (reservationLocalFallbackNeeded) {`
- L10418: `if (Object.keys(fallbackSlots).length > 0) {`
- L10453: `if (pre.inModifyMode) {`
- L10455: `if (isContactHotelText(finalText, pre.lang)) {`
- L10466: `if (!ackedVerifyInThisReply && noNewChangeData && isQuoteOrConfirmText(finalText, pre.lang)) {`

### 10477-10726

- L10527: `if (`
- L10554: `if (!activeModifyField && (requestedChangeDates \|\| requestedChangeRoom \|\| requestedChangeGuests \|\| hasImplicitModifyValueFollowup)) {`
- L10555: `if ((pre.inModifyMode \|\| pre.prevCategory === "modify_reservation") && (hasBoundReservationTarget \|\| pre.prevCategory === "modify_reservation")) {`
- L10571: `if (hasImmediateFieldValue) {`
- L10589: `if (pendingRequestedFields.length > 0) {`
- L10594: `if (activeField === "dates" && ingestedSlots.checkIn && ingestedSlots.checkOut) {`
- L10599: `if (previewTarget?.reservationId) {`
- L10635: `if (activeField === "dates") {`
- L10637: `} else if (activeField === "guests") {`
- L10673: `if (pre.inModifyMode && wantsGenericModify(String(pre.msg.content \|\| ""), pre.lang) && (nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.chec`
- L10688: `if (resolvedModifyTarget?.reservationId) {`

### 10727-10976

- L10818: `if (lateCheckoutQ) {`
- L10822: `} else if (earlyCheckinQ) {`
- L10831: `} else if (timeQ) {`
- L10836: `if (hasConfirmedBookingContext) {`
- L10842: `if (time && typeof time === "string") {`
- L10869: `if (!nextCategory) nextCategory = "retrieval_based";`
- L10871: `} else if (triggerDateFlow) {`
- L10885: `if (shouldPersistPartialModifyDate && modifyTemporalSideIntent) {`
- L10912: `if (!hasDateTokenInMsg) {`
- L10914: `if (modifyTemporalSideIntent && (userDates.checkIn \|\| userDates.checkOut)) {`
- L10919: `} else if (sideIntent) {`
- L10921: `if (sideIntent === 'checkIn') preserveAskCheckIn = finalText; // preservar si luego se genera confirmación accidental`
- L10922: `} else if (mentionsNewDates \|\| mentionsDates) {`
- L10940: `if (cons.changed) {`
- L10944: `if (!userModifiesCheckInWithoutDate && (isEmpty \|\| cons.finalText)) {`
- L10946: `if (cons.finalText) finalText = cons.finalText;`
- L10948: `if (cons.preservedPrompt && /anot[eé] nuevas fechas\|anotei as novas datas\|noted the new dates/i.test(finalText \|\| '')) {`
- L10972: `if (newCI && newCO && (newCI !== prevCI \|\| newCO !== prevCO)) {`

### 10977-11226

- L10977: `if ((!txt \|\| genericAck \|\| !hasDatesMentioned)) {`
- L10979: `if (!iso) return iso \|\| '';`
- L10986: `if (!modifyExecutionActive && !createQuoteReady && !/¿cu[aá]l es la fecha de check\-?out\|what is the check\-?out date\|qual é a data de check\-?out/i.test(txt)) {`
- L11004: `if (hasDuplicateRange) {`
- L11011: `if (m instanceof HumanMessage) {`
- L11014: `if (dates.length === 1 && dates[0] !== currentDate) { previousSingle = dates[0]; break; }`
- L11017: `if (previousSingle && currentDate) {`
- L11031: `if (!modifyExecutionActive) {`
- L11049: `if (isVerifyAvailabilityAffirmative) {`
- L11066: `if (quoteGatedCreateFlow) {`
- L11068: `if (!createDraftConsistency.valid) {`
- L11080: `if (quoteGatedCreateFlow && !isCreateStateReadyForQuote(createQuoteSlots)) {`
- L11082: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L11090: `if (ci && co) {`
- L11092: `if (availabilityDateCoherence && !availabilityDateCoherence.ok) {`
- L11098: `if (modifyExecutionActive) {`
- L11103: `if (!modifyTarget?.reservationId) {`
- L11156: `if (availabilityNeedsHandoff) {`
- L11170: `if (missing) finalText = buildAskMissingDate(pre.lang, missing as any, modifyExecutionActive ? "modify" : "create");`
- L11184: `if (isAskAvailabilityStatusQuery(String(pre.msg.content \|\| ""), pre.lang)) {`
- L11202: `if (quoteGatedCreateFlow) {`
- L11204: `if (!createDraftConsistency.valid) {`
- L11216: `if (quoteGatedCreateFlow && !isCreateStateReadyForQuote(createQuoteSlots)) {`
- L11218: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L11224: `if (ciISO && coISO) {`
- L11226: `if (availabilityStatusDateCoherence && !availabilityStatusDateCoherence.ok) {`

### 11227-11476

- L11233: `if (modifyExecutionActive) {`
- L11250: `if (res.needsHandoff) {`
- L11278: `if (isAmenitiesTurn) {`
- L11282: `if (isBillingTurn) {`
- L11292: `if (isSupportTurn) {`
- L11305: `if (`
- L11312: `if (continuation) {`
- L11316: `if (shouldClearSelectedReservationTargetForCategory(nextCategory, promptKeyUsed)) {`
- L11327: `if (!shouldPreserveModifyTarget) {`
- L11343: `if (`
- L11350: `if (!createDraftConsistency.valid) {`
- L11354: `} else if (!isCreateStateReadyForQuote(quotedReservationSnapshot as ReservationSlotsStrict)) {`
- L11356: `if (missingField) {`
- L11363: `if (`
- L11374: `if (`
- L11411: `if (!(graphResult as any)?.meta?.debug?.route_source && finalText) {`
- L11432: `if (!raw) return raw;`
- L11446: `/(?:\n\|\r\n){1,}if you want to explore the area[\s\S]*$/i,`
- L11456: `if (!raw) return raw;`

### 11477-11726

- L11492: `if (!asksAcceptance) return answer;`
- L11501: `if (!hit) return answer;`
- L11514: `if (accepted) {`
- L11516: `if (!isNegative) return answer;`
- L11537: `if (!out) return out;`
- L11539: `if (hasQuestion) return out;`
- L11577: `if (lang === "pt") {`
- L11578: `if (asksAcceptance && hit) {`
- L11583: `if (asksCurrency) return 'Moedas habilitadas hoje: ${currencies.join(", ") \|\| "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e comprovantes?';`
- L11584: `if (asksInvoices) return 'Emitimos fatura: ${issuesInvoices ? "sim" : "por enquanto não"}.\nComprovantes: ${docs.join(", ") \|\| "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e moedas?';`
- L11587: `if (lang === "en") {`
- L11588: `if (asksAcceptance && hit) {`
- L11593: `if (asksCurrency) return 'Enabled currencies today: ${currencies.join(", ") \|\| "(to be confirmed)"}.\n\nDo you want details on payment methods and invoices?';`
- L11594: `if (asksInvoices) return 'Invoices issued: ${issuesInvoices ? "yes" : "currently disabled"}.\nInvoice documents: ${docs.join(", ") \|\| "(to be confirmed)"}.\n\nDo you want details on payment methods an`
- L11598: `if (asksAcceptance && hit) {`
- L11603: `if (asksCurrency) return 'Monedas habilitadas hoy: ${currencies.join(", ") \|\| "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y comprobantes?';`
- L11604: `if (asksInvoices) return 'Emitimos factura: ${issuesInvoices ? "sí" : "por el momento no"}.\nComprobantes: ${docs.join(", ") \|\| "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y monedas?';`
- L11607: `if (lang === "pt") return "Posso te ajudar com pagamentos e faturamento. Quer que eu detalhe meios, moedas ou comprovantes?";`
- L11608: `if (lang === "en") return "I can help with payments and billing. Do you want details on methods, currencies, or invoices?";`
- L11615: `if (!out) return out;`
- L11617: `if (lang === "es") {`
- L11629: `if (hasRestriction && !hasProactive) {`
- L11634: `if (lang === "pt") {`
- L11641: `if (lang === "en") {`
- L11652: `if (!out) return out;`
- L11682: `if (!t) return false;`
- L11699: `if (!t) return false;`
- L11710: `if (!t) return false;`
- L11713: `if (`
- L11714: `/\b(modificar\|cambiar\|alterar\|mudar\|change\|edit\|update)\b.*\b(si\|if\|se)\b.*\b(hay\|have\|tem\|availability\|disponibilidad\|lugar)\b/i.test(normalizedText) \|\|`

### 11727-11922

- L11738: `if (normalizedIntent.kind !== "other") return null;`
- L11742: `const asksConditionalAvailability = /\b(modificar\|cambiar\|alterar\|mudar\|change\|edit\|update)\b.*\b(si\|if\|se)\b.*\b(hay\|have\|tem\|availability\|disponibilidad\|lugar)\b/i.test(normalizedText);`
- L11743: `const asksCanModify = /\b(saber\s+si\s+puedo\|know\s+if\s+i\s+can\|se\s+posso)\b.*\b(modificar\|cambiar\|alterar\|mudar\|change\|edit\|update)\b/i.test(normalizedText);`
- L11745: `if (!(asksBeforePrice \|\| asksConditionalAvailability \|\| asksCanModify)) return null;`
- L11747: `if (lang === "es") {`
- L11748: `if (asksBeforePrice) return "¿De cuál reserva querés que te recuerde el precio?";`
- L11749: `if (asksConditionalAvailability) return "¿Qué cambio querés consultar? Decime la habitación, fechas o cantidad de huéspedes para revisar disponibilidad.";`
- L11752: `if (lang === "pt") {`
- L11753: `if (asksBeforePrice) return "De qual reserva você quer que eu relembre o preço?";`
- L11754: `if (asksConditionalAvailability) return "Qual alteração você quer consultar? Diga o quarto, as datas ou a quantidade de hóspedes para eu verificar a disponibilidade.";`
- L11757: `if (asksBeforePrice) return "Which booking would you like me to remind you of the price for?";`
- L11758: `if (asksConditionalAvailability) return "What change would you like to check? Tell me the room, dates, or number of guests so I can review availability.";`
- L11780: `if (lang === "es") {`
- L11793: `if (lang === "pt") {`
- L11823: `if (!target?.reservationId) return "";`
- L11833: `if (lang === "pt") {`
- L11840: `if (lang === "en") {`
- L11858: `if (!t) return true;`
- L11872: `if (!/^[A-Z][A-Z0-9-]{4,23}$/.test(normalized)) continue;`
- L11873: `if (!/\d/.test(normalized)) continue;`
- L11906: `if (explicitRe.test(userTxtRaw)) {`
- L11912: `if (lightRe.test(userTxtRaw)) {`
- L11914: `if (hasReservationContext) {`


---

## 6. Líneas relevantes para temporal/checkIn/checkOut/numGuests

### 5227-5476

- L5266: `? "checkout_info"`
- L5268: `? "checkin_info"`
- L5273: `stableTurnSlots.checkIn \|\|`
- L5274: `stableTurnSlots.checkOut \|\|`
- L5276: `stableTurnSlots.numGuests \|\|`
- L5278: `extractRawOrderedDateRange(rawTurnText)?.checkIn`
- L5288: `isLateralTurn: nextCategory === "amenities_info" \|\| nextCategory === "checkin_info" \|\| nextCategory === "checkout_info",`
- L5330: `const earlyCheckinShortcutQ = detectEarlyCheckinQuestion(rawTurnText, pre.lang);`
- L5332: `earlyCheckinShortcutQ &&`
- L5339: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L5340: `finalText = buildEarlyCheckinResponse(pre.lang, guestState, {`
- L5341: `checkInTime: confCheckIn,`
- L5344: `nextCategory = "checkin_info";`
- L5346: `decision_layer: "early_checkin_heuristic",`
- L5347: `route_source: "early_checkin_heuristic",`
- L5348: `route_match: "early_checkin",`
- L5398: `!extractSlotsFromText(rawTurnText, pre.lang).checkIn &&`
- L5399: `!extractSlotsFromText(rawTurnText, pre.lang).checkOut &&`
- L5427: `Boolean(explicitDr0.checkIn && explicitDr0.checkOut) &&`
- L5428: `assessReservationDateCoherence(explicitDr0.checkIn, explicitDr0.checkOut)?.ok === true;`
- L5430: `Boolean(rawDr0?.checkIn && rawDr0?.checkOut) &&`
- L5431: `assessReservationDateCoherence(rawDr0?.checkIn, rawDr0?.checkOut)?.ok === true;`
- L5433: `Boolean(lightDr0.checkIn && lightDr0.checkOut) &&`
- L5434: `assessReservationDateCoherence(lightDr0.checkIn, lightDr0.checkOut)?.ok === true;`
- L5436: `Boolean(relativeWeekendDr0.checkIn && relativeWeekendDr0.checkOut) &&`
- L5437: `assessReservationDateCoherence(relativeWeekendDr0.checkIn, relativeWeekendDr0.checkOut)?.ok === true;`
- L5439: `Boolean(relativeWeekdayRangeDr0.checkIn && relativeWeekdayRangeDr0.checkOut) &&`
- L5440: `assessReservationDateCoherence(relativeWeekdayRangeDr0.checkIn, relativeWeekdayRangeDr0.checkOut)?.ok === true;`
- L5442: `Boolean(anchoredCreateDr0.checkIn && anchoredCreateDr0.checkOut) &&`
- L5443: `assessReservationDateCoherence(anchoredCreateDr0.checkIn, anchoredCreateDr0.checkOut)?.ok === true;`
- L5457: `: explicitDr0.checkIn \|\| explicitDr0.checkOut`
- L5464: `turnCreateSlots0.checkIn &&`
- L5465: `turnCreateSlots0.checkOut &&`
- L5467: `turnCreateSlots0.numGuests &&`
- L5470: `if (dr0.checkIn && dr0.checkOut && !isEventLikeMessage && !hasCompleteRichCreatePayloadInTurn0) {`
- L5474: `assessReservationDateCoherence(rawDr0?.checkIn, rawDr0?.checkOut) \|\|`
- L5475: `assessReservationDateCoherence(dr0.checkIn, dr0.checkOut);`

### 5477-5726

- L5484: `checkIn: dr0.checkIn,`
- L5485: `checkOut: dr0.checkOut,`
- L5499: `fastPathSlots.checkIn &&`
- L5500: `fastPathSlots.checkOut &&`
- L5502: `fastPathSlots.numGuests &&`
- L5510: `Boolean(fastPathTurnSlots.roomType \|\| fastPathTurnSlots.numGuests);`
- L5520: `(fastPathTurnSlots.roomType \|\| fastPathTurnSlots.numGuests)`
- L5525: `numGuests: fastPathSlots.numGuests \|\| resolvedModifyTarget0.numGuests,`
- L5526: `checkIn: fastPathSlots.checkIn \|\| resolvedModifyTarget0.checkIn,`
- L5527: `checkOut: fastPathSlots.checkOut \|\| resolvedModifyTarget0.checkOut,`
- L5581: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, dr0.checkIn, dr0.checkOut, {`
- L5646: `const ciTxt = isoToDDMMYYYY(dr0.checkIn) \|\| dr0.checkIn;`
- L5647: `const coTxt = isoToDDMMYYYY(dr0.checkOut) \|\| dr0.checkOut;`
- L5692: `const supportedDrFastRaw = await extractSupportedTemporalDateRange(userTxtFast, pre.lang);`
- L5696: `supportedDrFastRaw.checkIn && supportedDrFastRaw.checkOut`
- L5698: `: relativeWeekdayRangeFast.checkIn && relativeWeekdayRangeFast.checkOut`
- L5700: `: supportedDrFastRaw.checkIn \|\| supportedDrFastRaw.checkOut`
- L5718: `const safeLeadGuestName = extractSafeCreateTemporalLeadGuestName(userTxtFast);`

### 5727-5976

- L5746: `const ciISO = createDraftConsistency.sanitizedSlots.checkIn;`
- L5747: `const coISO = createDraftConsistency.sanitizedSlots.checkOut;`
- L5793: `const fastTemporalSideIntent = detectModifyTemporalSideIntent(userTxtFast, drFast);`
- L5794: `const explicitCheckOutFast =`
- L5795: `fastTemporalSideIntent === "checkOut" \|\|`
- L5796: `Boolean(explicitTurnSlotsFast.checkOut && !explicitTurnSlotsFast.checkIn);`
- L5804: `? !inquiryKnownFastSlots.checkIn`
- L5805: `? "checkIn"`
- L5806: `: !inquiryKnownFastSlots.checkOut`
- L5807: `? "checkOut"`
- L5814: `const createCheckOutRepairContextFast =`
- L5816: `explicitCheckOutFast &&`
- L5817: `Boolean(pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn) &&`
- L5818: `!Boolean(pre.st?.reservationSlots?.checkOut);`
- L5821: `(createCheckOutRepairContextFast ? "checkOut" : undefined) \|\|`
- L5823: `(inquiryMissingSideFast === "checkIn" \|\| inquiryMissingSideFast === "checkOut" ? inquiryMissingSideFast : undefined);`
- L5824: `const createCheckInRepairContextFast =`
- L5826: `!explicitCheckOutFast &&`
- L5827: `drFast.checkIn &&`
- L5828: `!drFast.checkOut &&`
- L5829: `!pre.st?.reservationSlots?.checkIn;`
- L5831: `createCheckInRepairContextFast &&`
- L5832: `reservationContextualMissingSideFastRaw === "checkOut"`
- L5833: `? "checkIn"`
- L5835: `const singleFastISO = drFast.checkIn \|\| drFast.checkOut;`
- L5836: `const hasOneDateOnly = Boolean(singleFastISO) && !(drFast.checkIn && drFast.checkOut);`
- L5847: `Boolean((pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn) && (pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut));`
- L5852: `!fastTemporalSideIntent;`
- L5856: `fastPathSubFlow === "create" && explicitCheckOutFast`
- L5857: `? "checkOut"`
- L5859: `const contextualFastDates = createSingleDateSideFast === "checkIn"`
- L5860: `? { checkIn: singleFastISO }`
- L5861: `: { checkOut: singleFastISO };`
- L5866: `createSingleDateSideFast === "checkOut" &&`
- L5867: `explicitCheckOutFast`
- L5869: `const explicitCheckOutSlots = mergeReservationSlots(pre.currSlots, normalizedFastPathSlots);`
- L5870: `Object.assign(normalizedFastPathSlots, explicitCheckOutSlots);`
- L5871: `normalizedFastPathSlots.checkOut = singleFastISO;`
- L5872: `if (!normalizedFastPathSlots.numGuests) {`
- L5874: `if (explicitGuestCount) normalizedFastPathSlots.numGuests = explicitGuestCount;`

### 5977-6226

- L6090: `if (singleFastISO && fastPathSubFlow === "modify" && fastTemporalSideIntent) {`
- L6098: `fastTemporalSideIntent`
- L6115: `fastTemporalSideIntent === "checkIn" ? "checkOut" : "checkIn"`
- L6128: `drFast.checkIn &&`
- L6129: `!explicitCheckOutFast &&`
- L6131: `isPastReservationCheckInISO(drFast.checkIn)`
- L6138: `delete sanitizedCreateSlots.checkOut;`
- L6140: `sanitizedCreateSlots.checkIn &&`
- L6141: `isPastReservationCheckInISO(sanitizedCreateSlots.checkIn)`
- L6143: `delete sanitizedCreateSlots.checkIn;`
- L6147: `finalText = buildPastReservationCheckInPrompt(pre.lang, drFast.checkIn);`
- L6156: `if (drFast.checkIn && !explicitCheckOutFast && !isConfirmedBooking && isPastReservationCheckInISO(drFast.checkIn)) {`
- L6157: `finalText = buildPastReservationCheckInPrompt(pre.lang, drFast.checkIn);`
- L6158: `const { checkIn: _dropInvalidCheckIn, ...restNextSlots } = nextSlots;`
- L6170: `const prevISO = prevSingle.checkIn \|\| prevSingle.checkOut;`
- L6171: `const currISO = drFast.checkIn \|\| drFast.checkOut;`
- L6179: `checkIn: ciISO,`
- L6180: `checkOut: coISO,`

### 6227-6476

- L6289: `const missingSide = drFast.checkIn ? "checkOut" : "checkIn";`
- L6303: `fastTemporalSideIntent`
- L6336: `(activeQueuedModifyField === "guests" && Boolean(queuedTurnSlots.numGuests)) \|\|`
- L6337: `(activeQueuedModifyField === "dates" && Boolean(queuedDateRange?.checkIn && queuedDateRange?.checkOut));`
- L6394: `const userDatesFast = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L6395: `const sideIntentFast = detectModifyTemporalSideIntent(userTxt, userDatesFast);`
- L6398: `const isDateTopicFast = Boolean(sideIntentFast \|\| userDatesFast.checkIn \|\| userDatesFast.checkOut \|\| hasAnyDateTokenFast \|\| mentionsDatesFast);`
- L6402: `const mentionsGuestsFieldFast = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxtFast);`
- L6405: `inlineModifyTurnSlotsFast.numGuests \|\|`
- L6406: `(inlineModifyDateRangeFast?.checkIn && inlineModifyDateRangeFast?.checkOut)`
- L6438: `numGuests: inlineModifyTurnSlotsFast.numGuests \|\| resolvedFastReservationTarget.numGuests,`
- L6439: `checkIn: inlineModifyDateRangeFast?.checkIn \|\| resolvedFastReservationTarget.checkIn,`
- L6440: `checkOut: inlineModifyDateRangeFast?.checkOut \|\| resolvedFastReservationTarget.checkOut,`

### 6477-6726

- L6490: `numGuests: resolvedFastReservationTarget.numGuests,`
- L6491: `checkIn: resolvedFastReservationTarget.checkIn,`
- L6492: `checkOut: resolvedFastReservationTarget.checkOut,`
- L6523: `!inlineModifyTurnSlotsFast.numGuests &&`
- L6524: `!(inlineModifyDateRangeFast?.checkIn && inlineModifyDateRangeFast?.checkOut)`
- L6529: `numGuests: resolvedFastReservationTarget.numGuests \|\| pre.st?.reservationSlots?.numGuests,`
- L6530: `checkIn: resolvedFastReservationTarget.checkIn \|\| pre.st?.reservationSlots?.checkIn,`
- L6531: `checkOut: resolvedFastReservationTarget.checkOut \|\| pre.st?.reservationSlots?.checkOut,`
- L6564: `numGuests: resolvedFastReservationTarget.numGuests,`
- L6565: `checkIn: resolvedFastReservationTarget.checkIn,`
- L6566: `checkOut: resolvedFastReservationTarget.checkOut,`
- L6613: `checkIn: pre.st?.reservationSlots?.checkIn \|\| pre.currSlots.checkIn,`
- L6614: `checkOut: pre.st?.reservationSlots?.checkOut \|\| pre.currSlots.checkOut,`
- L6615: `numGuests: pre.st?.reservationSlots?.numGuests \|\| pre.currSlots.numGuests,`
- L6693: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L6694: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L6695: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L6699: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L6700: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`

### 6727-6976

- L6907: `const correctionDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L6911: `numGuests: correctionTurnSlots.numGuests \|\| correctionGuestCount \|\| currentPreviewSnapshot.numGuests,`
- L6912: `checkIn: correctionDates.checkIn \|\| currentPreviewSnapshot.checkIn,`
- L6913: `checkOut: correctionDates.checkOut \|\| currentPreviewSnapshot.checkOut,`
- L6919: `String(updatedPreviewSnapshot.numGuests \|\| "") !== String(currentPreviewSnapshot.numGuests \|\| "") \|\|`
- L6920: `String(updatedPreviewSnapshot.checkIn \|\| "") !== String(currentPreviewSnapshot.checkIn \|\| "") \|\|`
- L6921: `String(updatedPreviewSnapshot.checkOut \|\| "") !== String(currentPreviewSnapshot.checkOut \|\| "");`

### 6977-7226

- L7052: `const earlyModifyDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7053: `const earlyModifySideIntent = detectModifyTemporalSideIntent(userTxtRaw, earlyModifyDates);`
- L7056: `(earlyModifyDates.checkIn \|\| earlyModifyDates.checkOut) &&`
- L7084: `earlyModifySideIntent === "checkIn" ? "checkOut" : "checkIn"`
- L7111: `const reservationCheckIn = nextSlots.checkIn \|\| pre.currSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L7112: `const reservationCheckOut = nextSlots.checkOut \|\| pre.currSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L7113: `const reservationGuests = nextSlots.numGuests \|\| pre.currSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests;`
- L7120: `const createDraftTemporalDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7125: `turnCreateSlots.checkIn \|\|`
- L7126: `turnCreateSlots.checkOut \|\|`
- L7128: `turnCreateSlots.numGuests \|\|`
- L7130: `createDraftTemporalDates.checkIn \|\|`
- L7131: `createDraftTemporalDates.checkOut \|\|`
- L7132: `createDraftRawOrderedDates?.checkIn \|\|`
- L7133: `createDraftRawOrderedDates?.checkOut \|\|`
- L7134: `createDraftRelativeWeekendRange.checkIn \|\|`
- L7135: `createDraftRelativeWeekendRange.checkOut`
- L7137: `const createDraftCheckIn =`
- L7138: `reservationCheckIn \|\|`
- L7139: `createDraftTemporalDates.checkIn \|\|`
- L7140: `createDraftRawOrderedDates?.checkIn \|\|`
- L7141: `createDraftRelativeWeekendRange.checkIn;`
- L7142: `const createDraftCheckOut =`
- L7143: `reservationCheckOut \|\|`
- L7144: `createDraftTemporalDates.checkOut \|\|`
- L7145: `createDraftRawOrderedDates?.checkOut \|\|`
- L7146: `createDraftRelativeWeekendRange.checkOut;`
- L7150: `Boolean(turnCreateSlots.checkIn && turnCreateSlots.checkOut) &&`
- L7151: `Boolean(turnCreateSlots.roomType \|\| turnCreateSlots.numGuests \|\| isSafeGuestName(turnCreateSlots.guestName \|\| ""));`
- L7154: `const explicitTurnDateCoherence = assessReservationDateCoherence(rawOrderedDateRange?.checkIn, rawOrderedDateRange?.checkOut);`
- L7155: `const reservationDateCoherence = assessReservationDateCoherence(reservationCheckIn, reservationCheckOut);`
- L7157: `pre.currSlots.checkIn !== pre.prevSlotsStrict?.checkIn \|\|`
- L7158: `pre.currSlots.checkOut !== pre.prevSlotsStrict?.checkOut \|\|`
- L7159: `Boolean(extractDateRangeFromText(userTxtRaw).checkIn \|\| extractDateRangeFromText(userTxtRaw).checkOut);`
- L7199: `reservationCheckIn &&`
- L7200: `reservationCheckOut &&`
- L7209: `checkIn: reservationCheckIn,`
- L7210: `checkOut: reservationCheckOut,`
- L7211: `numGuests: String(reservationGuests),`

### 7227-7476

- L7284: `numGuests: confirmedSnapshotFallback.slots.numGuests,`
- L7285: `checkIn: confirmedSnapshotFallback.slots.checkIn,`
- L7286: `checkOut: confirmedSnapshotFallback.slots.checkOut,`
- L7324: `numGuests: target.numGuests,`
- L7325: `checkIn: target.checkIn,`
- L7326: `checkOut: target.checkOut,`
- L7355: `checkIn: item.checkIn,`
- L7356: `checkOut: item.checkOut,`
- L7357: `numGuests: item.numGuests,`
- L7385: `numGuests: target.numGuests,`
- L7386: `checkIn: target.checkIn,`
- L7387: `checkOut: target.checkOut,`
- L7423: `const mentionsModifyDatesField = /\b(fechas\|fecha\|dates\|date\|datas\|data\|check-in\|check out\|check-out\|entrada\|salida\|ingreso)\b/i.test(normalizedUserTxtForModify);`
- L7425: `const mentionsModifyGuestsField = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxtForModify);`
- L7442: `Boolean(rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut) \|\|`
- L7443: `Boolean(directModifyTurnSlots.numGuests) \|\|`
- L7445: `const directModifyUserDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7446: `const directModifySideIntent = detectModifyTemporalSideIntent(userTxtRaw, directModifyUserDates);`
- L7447: `const hasTemporalModifySignal = hasModifyDatesEntrySignal(`
- L7460: `(hasExplicitModifyFieldRequest \|\| hasImmediateModifyValue \|\| hasTemporalModifySignal \|\| Boolean(explicitReservationCode))`

### 7477-7726

- L7491: `rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut ? "dates" : null,`
- L7492: `directModifyTurnSlots.numGuests ? "guests" : null,`
- L7500: `numGuests: pre.currSlots.numGuests \|\| nextSlots.numGuests \|\| target.numGuests,`
- L7501: `checkIn: pre.currSlots.checkIn \|\| nextSlots.checkIn \|\| target.checkIn,`
- L7502: `checkOut: pre.currSlots.checkOut \|\| nextSlots.checkOut \|\| target.checkOut,`
- L7542: `numGuests: directModifyTurnSlots.numGuests \|\| (reservationGuests ? String(reservationGuests) : undefined) \|\| target.numGuests,`
- L7543: `checkIn: rawOrderedDateRange?.checkIn \|\| reservationCheckIn \|\| target.checkIn,`
- L7544: `checkOut: rawOrderedDateRange?.checkOut \|\| reservationCheckOut \|\| target.checkOut,`
- L7547: `const modifyDateCoherence = assessReservationDateCoherence(snapshot.checkIn, snapshot.checkOut);`
- L7552: `const nextGuestCountNumber = Number.parseInt(String(snapshot.numGuests \|\| ""), 10);`
- L7589: `if (!hasImmediateModifyValue && hasTemporalModifySignal) {`
- L7594: `numGuests: reservationGuests \|\| target.numGuests,`
- L7595: `checkIn: reservationCheckIn \|\| target.checkIn,`
- L7596: `checkOut: reservationCheckOut \|\| target.checkOut,`
- L7609: `? buildAskMissingDate(pre.lang, directModifySideIntent === "checkIn" ? "checkOut" : "checkIn")`
- L7618: `numGuests: reservationGuests \|\| target.numGuests,`
- L7619: `checkIn: reservationCheckIn \|\| target.checkIn,`
- L7620: `checkOut: reservationCheckOut \|\| target.checkOut,`
- L7638: `numGuests: target?.numGuests,`
- L7639: `checkIn: target?.checkIn,`
- L7640: `checkOut: target?.checkOut,`
- L7660: `numGuests: target?.numGuests,`
- L7661: `checkIn: target?.checkIn,`
- L7662: `checkOut: target?.checkOut,`
- L7685: `const rawGuestCount = extractSlotsFromText(userTxtRaw, pre.lang).numGuests \|\| extractGuests(userTxtRaw);`
- L7694: `const hasExplicitDateRange = Boolean(rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut);`
- L7698: `const baseGuests = reservationGuests \|\| baseModifyTarget?.numGuests;`
- L7699: `const baseCheckIn = baseModifyTarget?.checkIn \|\| reservationCheckIn;`
- L7700: `const baseCheckOut = baseModifyTarget?.checkOut \|\| reservationCheckOut;`
- L7701: `const currentModifyCheckIn = nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn \|\| baseCheckIn;`
- L7702: `const currentModifyCheckOut = nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut \|\| baseCheckOut;`
- L7703: `const nextCheckIn = hasExplicitDateRange ? rawOrderedDateRange?.checkIn : baseCheckIn;`
- L7704: `const nextCheckOut = hasExplicitDateRange ? rawOrderedDateRange?.checkOut : baseCheckOut;`
- L7705: `const modifyTemporalDatesRaw =`
- L7707: `? await extractSupportedTemporalDateRange(userTxtRaw, pre.lang)`
- L7709: `const modifyTemporalDates =`
- L7711: `? anchorModifyRelativeDateToContext(pre, userTxtRaw, modifyTemporalDatesRaw, nextSlots)`
- L7712: `: modifyTemporalDatesRaw;`
- L7718: `checkIn: nextCheckIn,`
- L7719: `checkOut: nextCheckOut,`

### 7727-7976

- L7728: `Boolean(modifySingleTemporalISO) &&`
- L7733: `Boolean(modifySingleTemporalISO) &&`
- L7734: `!(modifyTemporalDates.checkIn && modifyTemporalDates.checkOut);`
- L7761: `modifySingleTemporalISO &&`
- L7764: `const contextualDateSlots = contextualMissingModifySide === "checkIn"`
- L7765: `? { checkIn: modifySingleTemporalISO }`
- L7766: `: { checkOut: modifySingleTemporalISO };`
- L7772: `numGuests: baseGuests,`
- L7773: `checkIn: baseCheckIn,`
- L7774: `checkOut: baseCheckOut,`
- L7806: `const correctionSideIntent = detectModifyTemporalSideIntent(userTxtRaw, modifyTemporalDates) \|\| "checkOut";`
- L7807: `const correctionTemporalDates =`
- L7808: `correctionSideIntent === "checkOut"`
- L7809: `? anchorRelativeWeekdayToCheckOutAfterCheckIn(userTxtRaw, modifyTemporalDates, currentModifyCheckIn)`
- L7810: `: modifyTemporalDates;`
- L7811: `const correctedTemporalISO =`
- L7812: `correctionSideIntent === "checkIn"`
- L7813: `? (correctionTemporalDates.checkIn \|\| correctionTemporalDates.checkOut)`
- L7814: `: (correctionTemporalDates.checkOut \|\| correctionTemporalDates.checkIn);`
- L7815: `if (correctedTemporalISO) {`
- L7816: `const correctedDates = correctionSideIntent === "checkIn"`
- L7817: `? { checkIn: correctedTemporalISO, checkOut: currentModifyCheckOut }`
- L7818: `: { checkIn: currentModifyCheckIn, checkOut: correctedTemporalISO };`
- L7819: `const modifyDateCoherence = assessReservationDateCoherence(correctedDates.checkIn, correctedDates.checkOut);`
- L7829: `numGuests: baseGuests,`
- L7830: `checkIn: currentModifyCheckIn,`
- L7831: `checkOut: currentModifyCheckOut,`
- L7882: `numGuests: String(nextGuestCountNumber),`
- L7900: `numGuests: nextGuestCount,`
- L7919: `numGuests: nextGuestCount,`
- L7920: `checkIn: nextCheckIn,`
- L7921: `checkOut: nextCheckOut,`
- L7931: `nextSlots = { ...nextSlots, numGuests: nextGuestCount } as ReservationSlotsStrict;`
- L7963: `numGuests: baseGuests,`
- L7964: `checkIn: baseCheckIn,`
- L7965: `checkOut: baseCheckOut,`

### 7977-8226

- L7979: `if (activeModifyField === "dates" && hasExplicitDateRange && nextCheckIn && nextCheckOut) {`
- L7984: `const modifyDateCoherence = assessReservationDateCoherence(nextCheckIn, nextCheckOut);`
- L7993: `checkIn: nextCheckIn,`
- L7994: `checkOut: nextCheckOut,`
- L8013: `numGuests: baseGuests,`
- L8014: `checkIn: nextCheckIn,`
- L8015: `checkOut: nextCheckOut,`
- L8045: `checkIn: createDraftCheckIn,`
- L8046: `checkOut: createDraftCheckOut,`
- L8047: `numGuests: reservationGuests ? String(reservationGuests) : undefined,`
- L8077: `const hasCheckIn = Boolean(additionalReservationDraft.checkIn);`
- L8078: `const hasCheckOut = Boolean(additionalReservationDraft.checkOut);`
- L8079: `if (hasCheckIn && !hasCheckOut) {`
- L8081: `? 'Perfecto, mantenemos la reserva anterior y abrimos una nueva. ${buildAskMissingDate(pre.lang, "checkOut", "create")}'`
- L8083: `? 'Perfeito, mantemos a reserva anterior e abrimos uma nova. ${buildAskMissingDate(pre.lang, "checkOut", "create")}'`
- L8084: `: 'Perfect, we will keep the previous booking and open a new one. ${buildAskMissingDate(pre.lang, "checkOut", "create")}';`
- L8087: `if (!hasCheckIn && hasCheckOut) {`
- L8089: `? 'Perfecto, mantenemos la reserva anterior y abrimos una nueva. ${buildAskMissingDate(pre.lang, "checkIn", "create")}'`
- L8091: `? 'Perfeito, mantemos a reserva anterior e abrimos uma nova. ${buildAskMissingDate(pre.lang, "checkIn", "create")}'`
- L8092: `: 'Perfect, we will keep the previous booking and open a new one. ${buildAskMissingDate(pre.lang, "checkIn", "create")}';`
- L8095: `if (hasCheckIn && hasCheckOut) {`
- L8108: `additionalReservationDraft.checkIn!,`
- L8109: `additionalReservationDraft.checkOut!,`
- L8161: `checkIn: reservationCheckIn,`
- L8162: `checkOut: reservationCheckOut,`
- L8163: `numGuests: reservationGuests ? String(reservationGuests) : undefined,`
- L8189: `const inquiryCheckIn = availabilityInquirySlots.checkIn;`
- L8190: `const inquiryCheckOut = availabilityInquirySlots.checkOut;`
- L8191: `if (inquiryCheckIn && inquiryCheckOut) {`
- L8192: `const inquiryDateCoherence = assessReservationDateCoherence(inquiryCheckIn, inquiryCheckOut);`
- L8197: `const availabilityResult = await runAvailabilityCheck(availabilityPre, availabilityInquirySlots, inquiryCheckIn, inquiryCheckOut, {`

### 8227-8476

- L8292: `createDraftTemporalDates.checkIn \|\|`
- L8293: `createDraftTemporalDates.checkOut \|\|`
- L8294: `createDraftRawOrderedDates?.checkIn \|\|`
- L8295: `createDraftRawOrderedDates?.checkOut \|\|`
- L8296: `createDraftRelativeWeekendRange.checkIn \|\|`
- L8297: `createDraftRelativeWeekendRange.checkOut \|\|`
- L8298: `(pre.currSlots.checkIn && pre.currSlots.checkIn !== pre.prevSlotsStrict?.checkIn) \|\|`
- L8299: `(pre.currSlots.checkOut && pre.currSlots.checkOut !== pre.prevSlotsStrict?.checkOut)`
- L8302: `createDraftConsistency.sanitizedSlots.checkIn &&`
- L8303: `createDraftConsistency.sanitizedSlots.checkOut &&`
- L8305: `createDraftConsistency.sanitizedSlots.numGuests &&`
- L8324: `const readyCreateCheckIn = createDraftConsistency.sanitizedSlots.checkIn;`
- L8325: `const readyCreateCheckOut = createDraftConsistency.sanitizedSlots.checkOut;`
- L8326: `const readyCreateDateCoherence = assessReservationDateCoherence(readyCreateCheckIn, readyCreateCheckOut);`
- L8334: `readyCreateCheckIn!,`
- L8335: `readyCreateCheckOut!`
- L8415: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L8420: `const checkIn = firstWeekdayOnOrAfter(baseIso, startWeekday);`
- L8421: `const checkOut = checkIn ? firstWeekdayStrictlyAfter(checkIn, endWeekday) : undefined;`
- L8422: `return checkIn && checkOut ? { checkIn, checkOut } : {};`
- L8424: `const quotedTurnSupportedDates = await extractSupportedTemporalDateRange(trimmedQuotedReply, pre.lang);`
- L8429: `quotedTurnSupportedDates.checkIn && quotedTurnSupportedDates.checkOut`
- L8431: `: quotedTurnRelativeWeekendRange.checkIn && quotedTurnRelativeWeekendRange.checkOut`
- L8433: `: quotedTurnDirectWeekdayRange.checkIn && quotedTurnDirectWeekdayRange.checkOut`
- L8435: `: quotedTurnRelativeWeekdayRange.checkIn && quotedTurnRelativeWeekdayRange.checkOut`
- L8437: `: quotedTurnSupportedDates.checkIn \|\| quotedTurnSupportedDates.checkOut`
- L8454: `quotedTurnSlots.numGuests \|\|`
- L8455: `quotedTurnSupportedDates.checkIn \|\|`
- L8456: `quotedTurnSupportedDates.checkOut \|\|`
- L8457: `quotedTurnRelativeWeekendRange.checkIn \|\|`
- L8458: `quotedTurnRelativeWeekendRange.checkOut \|\|`
- L8459: `quotedTurnDirectWeekdayRange.checkIn \|\|`
- L8460: `quotedTurnDirectWeekdayRange.checkOut \|\|`
- L8461: `quotedTurnRelativeWeekdayRange.checkIn \|\|`
- L8462: `quotedTurnRelativeWeekdayRange.checkOut \|\|`
- L8463: `quotedTurnSingleRelativeDate.checkIn \|\|`
- L8464: `quotedTurnSingleRelativeDate.checkOut`
- L8467: `quotedTurnSupportedDates.checkIn \|\|`
- L8468: `quotedTurnSupportedDates.checkOut \|\|`
- L8469: `quotedTurnRelativeWeekendRange.checkIn \|\|`

### 8477-8726

- L8507: `const requoteCheckIn = quotedDraftConsistency.sanitizedSlots.checkIn;`
- L8508: `const requoteCheckOut = quotedDraftConsistency.sanitizedSlots.checkOut;`
- L8509: `if (hasQuotedProposalDateCorrection && requoteCheckIn && requoteCheckOut) {`
- L8510: `const requoteCoherence = assessReservationDateCoherence(requoteCheckIn, requoteCheckOut);`
- L8518: `requoteCheckIn,`
- L8519: `requoteCheckOut`
- L8556: `createDraftConsistency.sanitizedSlots.checkIn \|\|`
- L8557: `createDraftConsistency.sanitizedSlots.checkOut \|\|`
- L8558: `createDraftConsistency.sanitizedSlots.numGuests \|\|`
- L8574: `turnExtractedCreateSlots.checkIn \|\|`
- L8575: `turnExtractedCreateSlots.checkOut \|\|`
- L8577: `turnExtractedCreateSlots.numGuests \|\|`
- L8626: `reservationCheckIn &&`
- L8627: `reservationCheckOut &&`
- L8635: `checkIn: reservationCheckIn,`
- L8636: `checkOut: reservationCheckOut,`
- L8637: `numGuests: String(reservationGuests),`
- L8673: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8674: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8675: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8679: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L8680: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`

### 8727-8976

- L8743: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8744: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8745: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8749: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L8750: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L8811: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8812: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8813: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8869: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8870: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8871: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8933: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8934: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8935: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`

### 8977-9226

- L8991: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8992: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8993: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L9047: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L9048: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L9049: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L9093: `const hasGuests = Boolean(pre.currSlots?.numGuests \|\| pre.st?.reservationSlots?.numGuests);`
- L9099: `(pre.currSlots?.checkIn \|\| pre.st?.reservationSlots?.checkIn) &&`
- L9100: `(pre.currSlots?.checkOut \|\| pre.st?.reservationSlots?.checkOut) &&`
- L9101: `(pre.currSlots?.numGuests \|\| pre.st?.reservationSlots?.numGuests) &&`
- L9104: `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;`
- L9165: `checkIn: cancelledReservation.checkIn,`
- L9166: `checkOut: cancelledReservation.checkOut,`
- L9167: `numGuests: cancelledReservation.numGuests,`

### 9227-9476

- L9294: `checkIn: cancelledReservation.checkIn,`
- L9295: `checkOut: cancelledReservation.checkOut,`
- L9296: `numGuests: cancelledReservation.numGuests,`
- L9345: `const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);`
- L9346: `const time = offeredTimeSide === "checkin" ? confCheckIn : confCheckOut;`
- L9349: `? (offeredTimeSide === "checkin" ? 'El check-in comienza a las ${time}.' : 'El check-out es hasta las ${time}.')`
- L9351: `? (offeredTimeSide === "checkin" ? 'O check-in começa às ${time}.' : 'O check-out vai até ${time}.')`
- L9352: `: (offeredTimeSide === "checkin" ? 'Check-in starts at ${time}.' : 'Check-out is until ${time}.');`
- L9353: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`
- L9361: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`
- L9370: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`

### 9477-9726

- L9487: `numGuests: nextSlots.numGuests \|\| currentPreviewSnapshot.numGuests,`
- L9488: `checkIn: nextSlots.checkIn \|\| currentPreviewSnapshot.checkIn,`
- L9489: `checkOut: nextSlots.checkOut \|\| currentPreviewSnapshot.checkOut,`
- L9495: `String(updatedPreviewSnapshot.numGuests \|\| "") !== String(currentPreviewSnapshot.numGuests \|\| "") \|\|`
- L9496: `String(updatedPreviewSnapshot.checkIn \|\| "") !== String(currentPreviewSnapshot.checkIn \|\| "") \|\|`
- L9497: `String(updatedPreviewSnapshot.checkOut \|\| "") !== String(currentPreviewSnapshot.checkOut \|\| "");`
- L9574: `const ci = nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L9575: `const co = nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L9577: `const ng = nextSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests;`
- L9599: `numGuests: ng,`
- L9600: `checkIn: ci,`
- L9601: `checkOut: co,`
- L9645: `numGuests: ng,`
- L9646: `checkIn: ci,`
- L9647: `checkOut: co,`
- L9709: `if (!snapshot.roomType \|\| !snapshot.checkIn \|\| !snapshot.checkOut) {`
- L9710: `finalText = buildAskMissingDate(pre.lang, !snapshot.checkIn ? "checkIn" : "checkOut");`
- L9713: `const createDateCoherence = assessReservationDateCoherence(snapshot.checkIn, snapshot.checkOut);`

### 9727-9976

- L9731: `checkIn: snapshot.checkIn,`
- L9732: `checkOut: snapshot.checkOut,`
- L9733: `numGuests: snapshot.numGuests,`
- L9756: `checkIn: snapshot.checkIn,`
- L9757: `checkOut: snapshot.checkOut,`
- L9758: `numGuests: snapshot.numGuests,`
- L9777: `checkIn: canonicalRecordForReply.checkIn,`
- L9778: `checkOut: canonicalRecordForReply.checkOut,`
- L9779: `numGuests: canonicalRecordForReply.numGuests,`
- L9786: `? '✅ ¡Reserva confirmada! Código **${result.reservationId ?? "pendiente"}**.\nHabitación **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Fechas **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySn`
- L9788: `? '✅ Reserva confirmada! Código **${result.reservationId ?? "pendente"}**.\nQuarto **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Datas **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySnapshot.`
- L9789: `: '✅ Booking confirmed! Code **${result.reservationId ?? "pending"}**.\nRoom **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Dates **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySnapshot.numGue`
- L9839: `const postBookingLateCheckoutQ = detectLateCheckoutQuestion(kbUserText, pre.lang);`
- L9840: `const postBookingEarlyCheckinQ = detectEarlyCheckinQuestion(kbUserText, pre.lang);`
- L9841: `const postBookingTimeQ = detectCheckinOrCheckoutTimeQuestion(kbUserText, pre.lang);`
- L9886: `checkIn: canonicalRecord.checkIn,`
- L9887: `checkOut: canonicalRecord.checkOut,`
- L9888: `numGuests: canonicalRecord.numGuests,`
- L9898: `checkIn: canonicalSlots.checkIn \|\| supplementalSlots.checkIn,`
- L9899: `checkOut: canonicalSlots.checkOut \|\| supplementalSlots.checkOut,`
- L9900: `numGuests: canonicalSlots.numGuests \|\| supplementalSlots.numGuests,`
- L9917: `if (postBookingLateCheckoutQ && hasConfirmedBookingContext) {`
- L9918: `finalText = buildLateCheckoutResponse(pre.lang, kbGuestState);`
- L9919: `nextCategory = "checkout_info";`
- L9922: `if (postBookingEarlyCheckinQ && hasConfirmedBookingContext) {`
- L9924: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L9925: `finalText = buildEarlyCheckinResponse(pre.lang, kbGuestState, {`
- L9926: `checkInTime: confCheckIn,`
- L9929: `nextCategory = "checkin_info";`
- L9935: `const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);`
- L9936: `const asksCheckOut = detectDateSideFromText(kbUserText) === "checkOut" \|\| /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(kbUserText);`
- L9937: `const time = asksCheckOut ? confCheckOut : confCheckIn;`
- L9940: `? (asksCheckOut ? 'El check-out es hasta las ${time}.' : 'El check-in comienza a las ${time}.')`
- L9942: `? (asksCheckOut ? 'O check-out vai até ${time}.' : 'O check-in começa às ${time}.')`
- L9943: `: (asksCheckOut ? 'Check-out is until ${time}.' : 'Check-in starts at ${time}.'))`
- L9949: `nextCategory = asksCheckOut ? "checkout_info" : "checkin_info";`
- L9957: `nextCategory = /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(kbUserText) ? "checkout_info" : "checkin_info";`

### 9977-10226

- L10165: `extractSlotsFromText(kbUserText, pre.lang).checkIn \|\|`
- L10166: `extractSlotsFromText(kbUserText, pre.lang).checkOut \|\|`
- L10168: `extractSlotsFromText(kbUserText, pre.lang).numGuests \|\|`
- L10170: `extractRawOrderedDateRange(kbUserText)?.checkIn`
- L10176: `nextCategory === "checkin_info" \|\|`
- L10177: `nextCategory === "checkout_info" \|\|`

### 10227-10476

- L10304: `if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {`
- L10305: `merged.numGuests = String((merged as any).numGuests);`
- L10465: `const noNewChangeData = !userDatesNow.checkIn && !userDatesNow.checkOut && !userMentionedSide && !userAffirmAfterVerify;`
- L10475: `const mentionsChangeDates = /\b(fechas\|fecha\|dates\|date\|datas\|data\|check-in\|check out\|check-out\|entrada\|salida\|ingreso)\b/i.test(normalizedUserTxt);`

### 10477-10726

- L10477: `const mentionsChangeGuests = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxt);`
- L10504: `const hasImmediateDateValue = Boolean(immediateDateRange?.checkIn && immediateDateRange?.checkOut);`
- L10505: `const hasImmediateGuestValue = Boolean(immediateTurnSlots.numGuests);`
- L10507: `const temporalUserDates = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L10508: `const temporalSideIntent = detectModifyTemporalSideIntent(userTxt, temporalUserDates);`
- L10509: `const hasTemporalModifySignal = hasModifyDatesEntrySignal(`
- L10510: `temporalSideIntent,`
- L10511: `temporalUserDates,`
- L10531: `hasTemporalModifySignal &&`
- L10535: `const partialModifySlots = buildModifyPartialDateSlots(knownSlots, temporalUserDates, temporalSideIntent);`
- L10548: `finalText = temporalSideIntent`
- L10549: `? buildAskMissingDate(pre.lang, temporalSideIntent === "checkIn" ? "checkOut" : "checkIn")`
- L10594: `if (activeField === "dates" && ingestedSlots.checkIn && ingestedSlots.checkOut) {`
- L10662: `const guestsFromText = extractSlotsFromText(String(pre.msg.content \|\| ""), pre.lang).numGuests;`
- L10666: `const prevGuestsVal = pre.prevSlotsStrict?.numGuests \|\| pre.st?.reservationSlots?.numGuests \|\| "";`
- L10668: `const haveDatesNow = Boolean((nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut));`
- L10673: `if (pre.inModifyMode && wantsGenericModify(String(pre.msg.content \|\| ""), pre.lang) && (nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut)) {`
- L10682: `numGuests: resolvedModifyTarget.numGuests,`
- L10683: `checkIn: resolvedModifyTarget.checkIn,`
- L10684: `checkOut: resolvedModifyTarget.checkOut,`
- L10705: `const userDates = await extractSupportedTemporalDateRange(String(pre.msg.content \|\| ""), pre.lang);`
- L10717: `const lateCheckoutQ = detectLateCheckoutQuestion(String(pre.msg.content \|\| ""), pre.lang);`
- L10718: `const earlyCheckinQ = detectEarlyCheckinQuestion(String(pre.msg.content \|\| ""), pre.lang);`
- L10720: `const timeQ = detectCheckinOrCheckoutTimeQuestion(String(pre.msg.content \|\| ""), pre.lang);`

### 10727-10976

- L10734: `const currentTurnCreateSlots = attributeSingleWordDateToPendingCreateCheckout(`
- L10741: `const shouldMergeCreateTemporalDates =`
- L10746: `const currentTurnCreateTemporalSlots = shouldMergeCreateTemporalDates`
- L10750: `checkIn: currentTurnCreateTemporalSlots.checkIn,`
- L10751: `checkOut: currentTurnCreateTemporalSlots.checkOut,`
- L10752: `roomType: currentTurnCreateTemporalSlots.roomType,`
- L10753: `numGuests: currentTurnCreateTemporalSlots.numGuests,`
- L10754: `guestName: currentTurnCreateTemporalSlots.guestName,`
- L10759: `currentTurnCreateTemporalSlots.checkIn &&`
- L10760: `currentTurnCreateTemporalSlots.checkOut &&`
- L10761: `currentTurnCreateTemporalSlots.roomType &&`
- L10762: `currentTurnCreateTemporalSlots.numGuests &&`
- L10763: `isSafeGuestName(currentTurnCreateTemporalSlots.guestName \|\| "")`
- L10767: `userDates.checkIn \|\|`
- L10768: `userDates.checkOut \|\|`
- L10769: `currentTurnCreateTemporalSlots.checkIn \|\|`
- L10770: `currentTurnCreateTemporalSlots.checkOut \|\|`
- L10771: `currentTurnRelativeWeekendRange.checkIn \|\|`
- L10772: `currentTurnRelativeWeekendRange.checkOut`
- L10786: `Boolean(currentTurnRelativeWeekendRange.checkIn && currentTurnRelativeWeekendRange.checkOut) \|\|`
- L10793: `currentTurnCreateTemporalSlots.checkIn &&`
- L10794: `currentTurnCreateTemporalSlots.checkOut &&`
- L10795: `currentTurnCreateTemporalSlots.roomType &&`
- L10796: `currentTurnCreateTemporalSlots.numGuests &&`
- L10797: `isSafeGuestName(currentTurnCreateTemporalSlots.guestName \|\| "")`
- L10802: `checkIn: currentTurnCreateTemporalSlots.checkIn,`
- L10803: `checkOut: currentTurnCreateTemporalSlots.checkOut,`
- L10804: `roomType: currentTurnCreateTemporalSlots.roomType,`
- L10805: `numGuests: currentTurnCreateTemporalSlots.numGuests,`
- L10806: `guestName: currentTurnCreateTemporalSlots.guestName,`
- L10814: `!lateCheckoutQ &&`
- L10815: `!earlyCheckinQ &&`
- L10816: `(pre.inModifyMode \|\| mentionsDates \|\| hasAnyDateToken \|\| Boolean(userDates.checkIn \|\| userDates.checkOut));`
- L10818: `if (lateCheckoutQ) {`
- L10819: `finalText = buildLateCheckoutResponse(pre.lang, guestState);`
- L10820: `nextCategory = "checkout_info";`
- L10822: `} else if (earlyCheckinQ) {`
- L10824: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L10825: `finalText = buildEarlyCheckinResponse(pre.lang, guestState, {`
- L10826: `checkInTime: confCheckIn,`

### 10977-11226

- L11030: `nextSlots.checkIn = ciISO; nextSlots.checkOut = coISO;`
- L11051: `const ciISO = pendingAvailabilityVerification?.checkIn \|\| proposed.checkIn \|\| nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L11052: `const coISO = pendingAvailabilityVerification?.checkOut \|\| proposed.checkOut \|\| nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L11054: `checkIn: ciISO,`
- L11055: `checkOut: coISO,`
- L11060: `checkIn: createQuoteSlots.checkIn,`
- L11061: `checkOut: createQuoteSlots.checkOut,`
- L11063: `numGuests: createQuoteSlots.numGuests,`
- L11082: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L11110: `numGuests: modifyTarget.numGuests \|\| nextSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests,`
- L11111: `checkIn: ciISO,`
- L11112: `checkOut: coISO,`
- L11133: `checkIn: ciISO,`
- L11134: `checkOut: coISO,`
- L11169: `const missing = !ciISO ? "checkIn" : !coISO ? "checkOut" : undefined;`
- L11187: `const ciISO = proposed.checkIn \|\| nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L11188: `const coISO = proposed.checkOut \|\| nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L11190: `checkIn: ciISO,`
- L11191: `checkOut: coISO,`
- L11196: `checkIn: createQuoteSlots.checkIn,`
- L11197: `checkOut: createQuoteSlots.checkOut,`
- L11199: `numGuests: createQuoteSlots.numGuests,`
- L11218: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`

### 11227-11476

- L11255: `const missing = !ciISO ? "checkIn" : "checkOut";`
- L11264: `: "I had an issue checking availability. Could you try again?";`
- L11298: `focusTurnExtractedSlots.checkIn \|\|`
- L11299: `focusTurnExtractedSlots.checkOut \|\|`
- L11301: `focusTurnExtractedSlots.numGuests \|\|`
- L11303: `extractRawOrderedDateRange(String(pre.msg.content \|\| ""))?.checkIn`
- L11367: `quotedReservationSnapshot.checkIn &&`
- L11368: `quotedReservationSnapshot.checkOut &&`
- L11369: `quotedReservationSnapshot.numGuests &&`
- L11378: `quotedReservationSnapshot.checkIn &&`
- L11379: `quotedReservationSnapshot.checkOut &&`
- L11380: `quotedReservationSnapshot.numGuests &&`

### 11477-11726

- L11667: `const hasDates = Boolean(slots.checkIn && slots.checkOut);`
- L11694: `const RE_CHANGE_GUESTS = /(cambiar\|modificar\|alterar\|change)\s+(hu[eé]spedes\|huespedes\|personas\|guests\|pessoas)/i;`

### 11727-11922

- L11767: `const hasDates = Boolean(slots.checkIn && slots.checkOut);`
- L11774: `numGuests: slots.numGuests,`
- L11775: `checkIn: slots.checkIn,`
- L11776: `checkOut: slots.checkOut,`
- L11825: `const checkIn = isoToDDMMYYYY(target.checkIn) \|\| target.checkIn \|\| (lang === "pt" ? "sem data" : lang === "en" ? "no date" : "sin fecha");`
- L11826: `const checkOut = isoToDDMMYYYY(target.checkOut) \|\| target.checkOut \|\| (lang === "pt" ? "sem data" : lang === "en" ? "no date" : "sin fecha");`
- L11836: `'${target.reservationId} · ${statusLabel}${target.guestName ? ' · em nome de ${target.guestName}' : ""}${roomType ? ' · quarto: ${roomType}' : ""} · ${checkIn} → ${checkOut}${target.numGuests ? ' · hóspedes: ${target.num`
- L11843: `'${target.reservationId} · ${statusLabel}${target.guestName ? ' · under ${target.guestName}' : ""}${roomType ? ' · room: ${roomType}' : ""} · ${checkIn} → ${checkOut}${target.numGuests ? ' · guests: ${target.numGuests}' `
- L11849: `'${target.reservationId} · ${statusLabel}${target.guestName ? ' · a nombre de ${target.guestName}' : ""}${roomType ? ' · habitación: ${roomType}' : ""} · ${checkIn} → ${checkOut}${target.numGuests ? ' · huéspedes: ${targ`
- L11894: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L11895: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L11896: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L11913: `const hasReservationContext = Boolean(pre?.st?.lastReservation \|\| pre?.st?.reservationSlots?.checkIn \|\| pre?.st?.reservationSlots?.reservationId);`
