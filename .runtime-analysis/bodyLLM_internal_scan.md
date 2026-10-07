# bodyLLM internal scan

Archivo: `lib/handlers/messageHandler.ts`
current_code_commit: `59c7f39c95eb2ccea2b1ab74b9490449148642b8`
messageHandler_lines: 13204
Rango analizado: L5731-L12340
Tamaño estimado: 6610 líneas
Bucket size: 250

> Scan estático readonly. Sirve para mapear densidad interna de `bodyLLM`, no para modificar código.

---

## 1. Buckets internos de bodyLLM

| Rango | Top markers | returns | awaits | decisions | temporal/check markers |
| --- | --- | ---: | ---: | ---: | ---: |
| 5731-5980 | `date/temporal:77`, `structured analyze:52`, `create:25`, `graph/classifier/policy:24`, `state/result:20`, `reservationSlots:20`, `reply builders:16`, `faq/policies/amenities:13` | 7 | 3 | 13 | 26 |
| 5981-6230 | `date/temporal:71`, `create:51`, `reservationSlots:46`, `modify:44`, `availability:27`, `state/result:19`, `graph/classifier/policy:17`, `reply builders:16` | 10 | 9 | 16 | 24 |
| 6231-6480 | `date/temporal:121`, `create:79`, `reservationSlots:57`, `state/result:36`, `modify:21`, `availability:16`, `structured analyze:11`, `graph/classifier/policy:8` | 3 | 6 | 17 | 64 |
| 6481-6730 | `date/temporal:54`, `create:48`, `reservationSlots:44`, `state/result:38`, `modify:27`, `availability:24`, `reply builders:20`, `graph/classifier/policy:15` | 10 | 10 | 18 | 18 |
| 6731-6980 | `modify:84`, `date/temporal:68`, `create:33`, `reservationSlots:30`, `state/result:20`, `reply builders:16`, `email/whatsapp copy:14`, `conversationFocus:10` | 8 | 10 | 11 | 10 |
| 6981-7230 | `modify:73`, `reservationSlots:64`, `selected target:60`, `date/temporal:52`, `reply builders:28`, `email/whatsapp copy:23`, `state/result:21`, `snapshot/verify:10` | 8 | 7 | 15 | 17 |
| 7231-7480 | `email/whatsapp copy:122`, `reservationSlots:50`, `date/temporal:37`, `state/result:27`, `modify:22`, `structured analyze:20`, `snapshot/verify:16`, `graph/classifier/policy:15` | 10 | 18 | 17 | 8 |
| 7481-7730 | `modify:79`, `date/temporal:58`, `snapshot/verify:50`, `reservationSlots:36`, `confirm:23`, `reply builders:21`, `structured analyze:18`, `availability:15` | 11 | 12 | 12 | 11 |
| 7731-7980 | `date/temporal:121`, `reservationSlots:76`, `create:35`, `modify:33`, `snapshot/verify:33`, `state/result:25`, `reply builders:19`, `confirm:14` | 7 | 6 | 10 | 41 |
| 7981-8230 | `modify:97`, `date/temporal:88`, `reservationSlots:70`, `selected target:38`, `reply builders:31`, `state/result:25`, `email/whatsapp copy:22`, `snapshot/verify:19` | 8 | 11 | 14 | 22 |
| 8231-8480 | `date/temporal:160`, `modify:120`, `reservationSlots:104`, `reply builders:20`, `selected target:19`, `state/result:17`, `email/whatsapp copy:12`, `snapshot/verify:10` | 7 | 7 | 8 | 48 |
| 8481-8730 | `modify:136`, `date/temporal:101`, `reservationSlots:92`, `reply builders:45`, `state/result:39`, `early return:21`, `graph/classifier/policy:21`, `email/whatsapp copy:12` | 21 | 10 | 22 | 33 |
| 8731-8980 | `create:58`, `availability:56`, `date/temporal:56`, `reservationSlots:37`, `reply builders:25`, `state/result:19`, `graph/classifier/policy:16`, `early return:10` | 10 | 8 | 12 | 24 |
| 8981-9230 | `create:184`, `date/temporal:175`, `reservationSlots:43`, `reply builders:42`, `snapshot/verify:20`, `state/result:17`, `confirm:17`, `early return:11` | 11 | 8 | 12 | 29 |
| 9231-9480 | `create:127`, `date/temporal:94`, `reservationSlots:53`, `email/whatsapp copy:37`, `state/result:20`, `reply builders:17`, `early return:11`, `snapshot/verify:10` | 11 | 12 | 16 | 43 |
| 9481-9730 | `email/whatsapp copy:192`, `reservationSlots:86`, `state/result:38`, `date/temporal:34`, `snapshot/verify:13`, `early return:12`, `graph/classifier/policy:10`, `structured analyze:2` | 11 | 24 | 28 | 14 |
| 9731-9980 | `email/whatsapp copy:136`, `reservationSlots:79`, `cancel:55`, `date/temporal:35`, `state/result:31`, `confirm:18`, `create:15`, `early return:10` | 10 | 25 | 19 | 14 |
| 9981-10230 | `cancel:67`, `date/temporal:41`, `confirm:24`, `create:23`, `selected target:22`, `reservationSlots:21`, `reply builders:19`, `snapshot/verify:15` | 13 | 11 | 11 | 11 |
| 10231-10480 | `reservationSlots:75`, `modify:59`, `date/temporal:52`, `snapshot/verify:33`, `state/result:31`, `create:31`, `reply builders:27`, `early return:21` | 21 | 12 | 24 | 13 |
| 10481-10730 | `snapshot/verify:80`, `reservationSlots:73`, `date/temporal:64`, `reply builders:45`, `create:35`, `state/result:23`, `modify:18`, `confirm:17` | 11 | 12 | 15 | 23 |
| 10731-10980 | `date/temporal:47`, `reservationSlots:40`, `reply builders:25`, `snapshot/verify:23`, `canonical state:21`, `billing:21`, `confirm:18`, `state/result:14` | 10 | 6 | 12 | 22 |
| 10981-11230 | `graph/classifier/policy:56`, `reply builders:36`, `reservationSlots:27`, `state/result:18`, `create:13`, `billing:13`, `fallback:13`, `email/whatsapp copy:10` | 6 | 7 | 11 | 8 |
| 11231-11480 | `date/temporal:77`, `modify:55`, `reservationSlots:41`, `fallback:30`, `state/result:28`, `email/whatsapp copy:23`, `reply builders:22`, `create:21` | 1 | 8 | 14 | 14 |
| 11481-11730 | `date/temporal:166`, `modify:74`, `create:62`, `reservationSlots:57`, `reply builders:17`, `state/result:16`, `availability:9`, `email/whatsapp copy:8` | 4 | 5 | 9 | 46 |
| 11731-11980 | `date/temporal:157`, `create:46`, `reservationSlots:34`, `modify:27`, `state/result:19`, `confirm:19`, `reply builders:15`, `structured analyze:12` | 7 | 4 | 28 | 42 |
| 11981-12230 | `create:82`, `reservationSlots:62`, `date/temporal:54`, `modify:33`, `availability:30`, `state/result:25`, `reply builders:25`, `email/whatsapp copy:13` | 8 | 10 | 23 | 21 |
| 12231-12340 | `create:45`, `reservationSlots:24`, `snapshot/verify:20`, `date/temporal:12`, `modify:8`, `graph/classifier/policy:8`, `reply builders:8`, `state/result:7` | 1 | 4 | 8 | 6 |

---

## 2. Diagrama tentativo por buckets

```mermaid
flowchart TD
  B0["5731-5980<br/>date/temporal<br/>structured analyze<br/>create"]
  B1["5981-6230<br/>date/temporal<br/>create<br/>reservationSlots"]
  B2["6231-6480<br/>date/temporal<br/>create<br/>reservationSlots"]
  B3["6481-6730<br/>date/temporal<br/>create<br/>reservationSlots"]
  B4["6731-6980<br/>modify<br/>date/temporal<br/>create"]
  B5["6981-7230<br/>modify<br/>reservationSlots<br/>selected target"]
  B6["7231-7480<br/>email/whatsapp copy<br/>reservationSlots<br/>date/temporal"]
  B7["7481-7730<br/>modify<br/>date/temporal<br/>snapshot/verify"]
  B8["7731-7980<br/>date/temporal<br/>reservationSlots<br/>create"]
  B9["7981-8230<br/>modify<br/>date/temporal<br/>reservationSlots"]
  B10["8231-8480<br/>date/temporal<br/>modify<br/>reservationSlots"]
  B11["8481-8730<br/>modify<br/>date/temporal<br/>reservationSlots"]
  B12["8731-8980<br/>create<br/>availability<br/>date/temporal"]
  B13["8981-9230<br/>create<br/>date/temporal<br/>reservationSlots"]
  B14["9231-9480<br/>create<br/>date/temporal<br/>reservationSlots"]
  B15["9481-9730<br/>email/whatsapp copy<br/>reservationSlots<br/>state/result"]
  B16["9731-9980<br/>email/whatsapp copy<br/>reservationSlots<br/>cancel"]
  B17["9981-10230<br/>cancel<br/>date/temporal<br/>confirm"]
  B18["10231-10480<br/>reservationSlots<br/>modify<br/>date/temporal"]
  B19["10481-10730<br/>snapshot/verify<br/>reservationSlots<br/>date/temporal"]
  B20["10731-10980<br/>date/temporal<br/>reservationSlots<br/>reply builders"]
  B21["10981-11230<br/>graph/classifier/policy<br/>reply builders<br/>reservationSlots"]
  B22["11231-11480<br/>date/temporal<br/>modify<br/>reservationSlots"]
  B23["11481-11730<br/>date/temporal<br/>modify<br/>create"]
  B24["11731-11980<br/>date/temporal<br/>create<br/>reservationSlots"]
  B25["11981-12230<br/>create<br/>reservationSlots<br/>date/temporal"]
  B26["12231-12340<br/>create<br/>reservationSlots<br/>snapshot/verify"]

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

### 5731-5980

- L5758: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5811: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5871: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5898: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5915: `return {`
- L5926: `return {`
- L5947: `return {`

### 5981-6230

- L6022: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L6086: `return {`
- L6094: `return {`
- L6116: `return {`
- L6144: `return {`
- L6156: `return {`
- L6167: `return {`
- L6180: `return {`
- L6206: `return {`
- L6227: `return {`

### 6231-6480

- L6285: `return {`
- L6332: `return {`
- L6462: `return {`

### 6481-6730

- L6486: `return {`
- L6515: `return {`
- L6534: `return {`
- L6545: `return {`
- L6582: `return {`
- L6596: `return {`
- L6627: `return {`
- L6663: `return {`
- L6694: `return {`
- L6706: `return { finalText, nextCategory: modifyContextActiveFast ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };`

### 6731-6980

- L6739: `return {`
- L6750: `return {`
- L6787: `return {`
- L6800: `return {`
- L6826: `return {`
- L6861: `return { finalText, nextCategory: modifyContextActiveFast ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };`
- L6901: `return {`
- L6937: `return { finalText, nextCategory: "retrieval_based", nextSlots, needsSupervision, graphResult: null };`

### 6981-7230

- L6990: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult: null };`
- L7026: `return { finalText, nextCategory: "modify_reservation", nextSlots: holderGuardSlots, needsSupervision, graphResult: null };`
- L7052: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult: null };`
- L7082: `return {`
- L7090: `return {`
- L7134: `return {`
- L7165: `return {`
- L7215: `return { finalText, nextCategory: "modify_reservation", nextSlots: knownSlots, needsSupervision, graphResult: null };`

### 7231-7480

- L7266: `return { finalText: finalTextWA, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: false, graphResult: null };`
- L7275: `return { finalText: failText, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: code && code !== 'WA_NOT_READY', graphResult: null };`
- L7285: `return { finalText: askNum, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: false, graphResult: null };`
- L7301: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L7310: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L7313: `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso; };`
- L7356: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L7373: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L7395: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L7404: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`

### 7481-7730

- L7520: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7558: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L7571: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L7574: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L7579: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L7591: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L7595: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L7608: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L7627: `return {`
- L7672: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7715: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 7731-7980

- L7734: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7806: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7818: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7858: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7882: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7891: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7965: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`

### 7981-8230

- L7990: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L8038: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L8068: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L8087: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8138: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8155: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8179: `return { finalText, nextCategory: "modify_reservation", nextSlots: holderGuardSlots, needsSupervision, graphResult };`
- L8227: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 8231-8480

- L8242: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8260: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L8265: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L8278: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8303: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8315: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8357: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 8481-8730

- L8488: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8494: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8514: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8545: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8551: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8557: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8563: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8585: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8606: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8620: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8624: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8630: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8650: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8664: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8668: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8674: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8679: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8700: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8714: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8720: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8728: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 8731-8980

- L8777: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8785: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8795: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8823: `return {`
- L8837: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8872: `return {`
- L8887: `return { finalText, nextCategory: "availability_inquiry", nextSlots, needsSupervision, graphResult };`
- L8911: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L8916: `return {`
- L8971: `return {`

### 8981-9230

- L9033: `return {`
- L9079: `return {`
- L9093: `return {`
- L9115: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9145: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision: needsSupervision \|\| readyCreateResult.needsHandoff, graphResult };`
- L9161: `return { finalText, nextCategory: "reservation", nextSlots: pausedDraft, needsSupervision, graphResult };`
- L9166: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9175: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9201: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L9204: `if (typeof startWeekday !== "number" \|\| typeof endWeekday !== "number") return {};`
- L9208: `return checkIn && checkOut ? { checkIn, checkOut } : {};`

### 9231-9480

- L9270: `return {`
- L9284: `return {`
- L9299: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9329: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9350: `return {`
- L9380: `return {`
- L9398: `return {`
- L9435: `return { finalText: buildAskGuestName(pre.lang), nextCategory, nextSlots, needsSupervision, graphResult };`
- L9449: `return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };`
- L9452: `if (!iso) return iso;`
- L9453: `const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`

### 9481-9730

- L9482: `return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };`
- L9499: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L9520: `return { finalText: ask, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L9523: `if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L9550: `return { finalText: ok, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L9566: `return { finalText: fail, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L9625: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L9637: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L9646: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L9681: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L9693: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`

### 9731-9980

- L9746: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9758: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9768: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9803: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9815: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9860: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9872: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9931: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9946: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9959: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`

### 9981-10230

- L10004: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L10017: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L10052: `return { finalText, nextCategory: "cancel_reservation", nextSlots: {}, needsSupervision, graphResult };`
- L10057: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L10068: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L10080: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L10100: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L10145: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L10158: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L10185: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10193: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10205: `return {`
- L10223: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`

### 10231-10480

- L10238: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10250: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10256: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10259: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10279: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10295: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10330: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10343: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L10346: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L10351: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L10363: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L10367: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L10380: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L10421: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10428: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10451: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10456: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10459: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10465: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10470: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10475: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 10481-10730

- L10499: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L10503: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L10516: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10528: `return {`
- L10541: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10546: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10551: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10632: `return {`
- L10646: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10657: `return toBodyLLMResult(state);`
- L10708: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`

### 10731-10980

- L10733: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10749: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10759: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10768: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10826: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10831: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10841: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10861: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10869: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L10888: `return keys.some((k) => hay.includes(k));`

### 10981-11230

- L10987: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L11012: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L11048: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult, rich: explicitRich };`
- L11070: `debugLog("[KB] fastpath return", { ok: kb.ok, safeCat, hasText: Boolean(text) });`
- L11122: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L11150: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`

### 11231-11480

- L11464: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 11481-11730

- L11504: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L11516: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L11537: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L11563: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 11731-11980

- L11733: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L11742: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L11768: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L11776: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L11891: `if (!iso) return iso \|\| '';`
- L11893: `return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L11932: `const [dd, mm, yyyy] = d.split(/[\/\-]/); return '${yyyy}-${mm}-${dd}';`

### 11981-12230

- L11983: `return {`
- L11997: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L12006: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L12017: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L12084: `return {`
- L12119: `return {`
- L12133: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L12140: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`

### 12231-12340

- L12339: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult, rich };`


---

## 4. Awaits por bucket

### 5731-5980

- L5762: `const stableIntent = await runStableIntentsGuard({`
- L5850: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5881: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`

### 5981-6230

- L6076: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6095: `finalText: await persistModifyPreviewContext(pre, resolvedModifyTarget0, snapshot),`
- L6104: `await persistAvailabilityInquiry(pre, fastPathSlots);`
- L6124: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, dr0.checkIn, dr0.checkOut, {`
- L6133: `await persistAvailabilityInquiry(pre, nextSlots);`
- L6155: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L6166: `await persistCreateDraft(pre, fastPathSlots);`
- L6179: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L6197: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 6231-6480

- L6235: `const supportedDrFastRaw = await extractSupportedTemporalDateRange(userTxtFast, pre.lang);`
- L6284: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L6295: `const readyCreateResult = await runAvailabilityCheck(`
- L6307: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6461: `await persistCreateDraftSnapshot(pre, sanitizedCreateSlots);`
- L6474: `await persistAvailabilityInquiry(pre, normalizedFastPathSlots);`

### 6481-6730

- L6495: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, ciISO, coISO, {`
- L6504: `await persistAvailabilityInquiry(pre, nextSlots);`
- L6533: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L6543: `await persistCreateDraft(pre, normalizedFastPathSlots);`
- L6554: `const readyCreateResult = await runAvailabilityCheck(`
- L6564: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6595: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L6613: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6647: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6692: `await persistCreateDraftSnapshot(pre, sanitizedCreateSlots);`

### 6731-6980

- L6738: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L6749: `await persistCreateDraft(pre, fastPathSlots);`
- L6759: `const readyCreateResult = await runAvailabilityCheck(`
- L6769: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6799: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L6817: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6838: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6888: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6923: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6966: `const userDatesFast = await extractSupportedTemporalDateRange(userTxt, pre.lang);`

### 6981-7230

- L7014: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7035: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7072: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7091: `finalText: await persistModifyPreviewContext(pre, resolvedFastReservationTarget, snapshot),`
- L7111: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7160: `await persistModifyExecutionContext(pre, resolvedFastReservationTarget.reservationId, {`
- L7213: `await updateConversationState(pre.msg.hotelId, pre.conversationId, modifyMenuPatch as any);`

### 7231-7480

- L7233: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L7234: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L7235: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L7246: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L7248: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L7251: `const { redis } = await import('@/lib/services/redis');`
- L7254: `const ack = await redis.get('wa:ack:${requestId}');`
- L7256: `await new Promise(r => setTimeout(r, 120));`
- L7295: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { supervised: true, desiredAction: 'notify_reception', updatedBy: 'ai' } as any);`
- L7315: `const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');`
- L7330: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: lastEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L7338: `const { classifyEmailError } = await import('@/lib/email/classifyEmailError');`
- L7346: `if (attempt < 2 && !sent) await new Promise(r => setTimeout(r, 150));`
- L7350: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { lastEmailCopyAttempt: { to: lastEmail, failures: 0, updatedAt: new Date().toISOString(), lastErrorType: undefined }, lastCategory: `
- L7359: `const { classifyEmailError } = await import('@/lib/email/classifyEmailError');`
- L7367: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { supervised: true, desiredAction: 'notify_reception', lastEmailCopyAttempt: { to: lastEmail, failures: prevFailures, updatedAt: new `
- L7375: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { lastEmailCopyAttempt: { to: lastEmail, failures: prevFailures, updatedAt: new Date().toISOString(), lastError: rawMsg, lastErrorTyp`
- L7464: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 7481-7730

- L7514: `await persistModifyExecutionContext(pre, pendingModifyPatchEarly.reservationId, {`
- L7534: `const correctionDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7551: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L7564: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L7573: `finalText = await persistModifyPreviewContext(pre, pendingTarget, updatedPreviewSnapshot);`
- L7584: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L7594: `finalText = await executeModifyReservationWithSnapshot(pre, pendingTarget.reservationId, currentPreviewSnapshot);`
- L7598: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7651: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7680: `const earlyModifyDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7698: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7719: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 7731-7980

- L7748: `const createDraftTemporalDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7833: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7862: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7959: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7969: `const reservationListSource = await resolveReservationListSource(pre);`
- L7979: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 7981-8230

- L7995: `const reservationListSource = await resolveReservationListSource(pre);`
- L8014: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8026: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8033: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8053: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8079: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8113: `const directModifyUserDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L8142: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8167: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8187: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8218: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 8231-8480

- L8250: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8264: `finalText = await persistModifyPreviewContext(pre, target, snapshot);`
- L8268: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8291: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8325: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8399: `? await extractSupportedTemporalDateRange(userTxtRaw, pre.lang)`
- L8472: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 8481-8730

- L8490: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, ingestedSlots);`
- L8529: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8547: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, correctedSlots);`
- L8570: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8595: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8622: `finalText = await persistModifyPreviewContext(pre, previewTarget, snapshot);`
- L8639: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8666: `finalText = await persistModifyPreviewContext(pre, previewTarget, snapshot);`
- L8689: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8716: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, snapshot);`

### 8731-8980

- L8750: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8797: `const availabilityResult = await runAvailabilityCheck(`
- L8806: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8860: `await persistAvailabilityInquiry(pre, availabilityInquirySlots);`
- L8889: `const availabilityResult = await runAvailabilityCheck(availabilityPre, availabilityInquirySlots, inquiryCheckIn, inquiryCheckOut, {`
- L8898: `await persistAvailabilityInquiry(pre, nextSlots);`
- L8915: `await persistAvailabilityInquiry(pre, availabilityInquirySlots);`
- L8969: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`

### 8981-9230

- L9019: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9052: `const holderQuoteResult = await runAvailabilityCheck(`
- L9062: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9088: `await persistCreateDraft(pre, updatedHolderSnapshot);`
- L9117: `const readyCreateResult = await runAvailabilityCheck(`
- L9127: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9159: `await persistCreateDraft(pre, pausedDraft);`
- L9210: `const quotedTurnSupportedDates = await extractSupportedTemporalDateRange(trimmedQuotedReply, pre.lang);`

### 9231-9480

- L9268: `await persistCreateDraftSnapshot(pre, quotedDraftConsistency.sanitizedSlots);`
- L9280: `await persistCreateDraft(pre, quotedDraftConsistency.sanitizedSlots);`
- L9301: `const requoteResult = await runAvailabilityCheck(`
- L9311: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9332: `await persistCreateDraft(pre, quotedDraftConsistency.sanitizedSlots);`
- L9348: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L9378: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L9396: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L9417: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9455: `const { sendReservationCopy } = await import("@/lib/email/sendReservationCopy");`
- L9470: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: email, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9473: `lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150));`

### 9481-9730

- L9525: `const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');`
- L9540: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: explicitEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9542: `} catch (err) { lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150)); }`
- L9591: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L9592: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L9593: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L9604: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jidInline, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9606: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jidInline, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L9610: `const { redis } = await import('@/lib/services/redis');`
- L9613: `const ack = await redis.get('wa:ack:${requestId}');`
- L9615: `await new Promise(r => setTimeout(r, 120));`
- L9649: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L9650: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L9651: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L9662: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9664: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L9667: `const { redis } = await import('@/lib/services/redis');`
- L9670: `const ack = await redis.get('wa:ack:${requestId}');`
- L9672: `await new Promise(r => setTimeout(r, 120));`
- L9713: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L9714: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L9715: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L9726: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jidInline, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9728: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jidInline, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`

### 9731-9980

- L9731: `const { redis } = await import('@/lib/services/redis');`
- L9734: `const ack = await redis.get('wa:ack:${requestId}');`
- L9736: `await new Promise(r => setTimeout(r, 120));`
- L9771: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L9772: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L9773: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L9784: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9786: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L9789: `const { redis } = await import('@/lib/services/redis');`
- L9792: `const ack = await redis.get('wa:ack:${requestId}');`
- L9794: `await new Promise(r => setTimeout(r, 120));`
- L9827: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L9828: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L9829: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L9840: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L9842: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L9845: `const { redis } = await import('@/lib/services/redis');`
- L9848: `const ack = await redis.get('wa:ack:${requestId}');`
- L9850: `await new Promise(r => setTimeout(r, 120));`
- L9923: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9933: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9951: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9962: `const { cancelReservation } = await import("@/lib/agents/reservations");`
- L9963: `const r = await cancelReservation(pre.msg.hotelId, pendingCancellation.reservationId);`
- L9970: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 9981-10230

- L10007: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10035: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10059: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10072: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10083: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10103: `const { cancelReservation } = await import("@/lib/agents/reservations");`
- L10104: `const r = await cancelReservation(pre.msg.hotelId, resolvedCancelCode);`
- L10111: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10148: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10166: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L10203: `await persistCreateDraft(pre, createDraftSlots);`

### 10231-10480

- L10241: `await persistCreateDraft(pre, createDraftSlots);`
- L10254: `await persistCreateDraft(pre, createDraftSlots);`
- L10263: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10289: `await persistModifyExecutionContext(pre, pendingModifyPatch.reservationId, {`
- L10323: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L10336: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L10345: `finalText = await persistModifyPreviewContext(pre, pendingTarget, updatedPreviewSnapshot);`
- L10356: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L10366: `finalText = await executeModifyReservationWithSnapshot(pre, pendingTarget.reservationId, currentPreviewSnapshot);`
- L10370: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10412: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10430: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 10481-10730

- L10488: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10502: `finalText = await persistModifyPreviewContext(pre, genericModifyTarget, snapshot);`
- L10506: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10526: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L10539: `await persistCreateDraft(pre, snapshot as ReservationSlotsStrict);`
- L10554: `const { confirmAndCreate } = await import("@/lib/agents/reservations");`
- L10555: `const result = await confirmAndCreate(pre.msg.hotelId, snapshot as any, pre.msg.channel);`
- L10587: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10656: `if (await tryConversationalGuestNameCapture(pre, state)) {`
- L10690: `const reservationListSource = await resolveReservationListSource(pre);`
- L10701: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10726: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 10731-10980

- L10742: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10834: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L10845: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L10948: `const kbForced = await answerWithKnowledge({`
- L10957: `finalText = await harmonizeBillingCurrencyAnswer(finalText, kbUserText, pre.msg.hotelId, pre.lang);`
- L10963: `finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);`

### 10981-11230

- L10993: `finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);`
- L11026: `hasRoomImages: await hotelHasRenderableRoomInventoryVisuals(pre),`
- L11031: `const richResolved = await runKbPrecedenceRichPath(pre, kbPrecedence.promptKey);`
- L11051: `const kb = await answerWithKnowledge({`
- L11099: `await persistCreateLateralCategoryIfNeeded(pre, kbUserText, dominantTurnDomain, nextCategory);`
- L11134: `await persistCreateLateralCategoryIfNeeded(pre, kbUserText, dominantTurnDomain, nextCategory);`
- L11166: `graphResult = await withTimeout(`

### 11231-11480

- L11237: `const rbState = await retrievalBased({`
- L11268: `await tryBodyLLMStructuredEnrichment(pre, state);`
- L11284: `await tryBodyLLMStructuredFallback(pre, state);`
- L11319: `await persistCreateDraft(pre, createGatingSlots);`
- L11331: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11363: `await persistCreateLateralCategoryIfNeeded(pre, rawTurnText, dominantTurnDomain, nextCategory);`
- L11419: `const temporalUserDates = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L11448: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 11481-11730

- L11488: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11512: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, ingestedSlots);`
- L11539: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11601: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11617: `const userDates = await extractSupportedTemporalDateRange(String(pre.msg.content \|\| ""), pre.lang);`

### 11731-11980

- L11735: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L11750: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L11807: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11840: `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({`

### 11981-12230

- L11981: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L11995: `await persistCreateDraft(pre, createQuoteSlots);`
- L12027: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, modifyTarget, modifySnapshot);`
- L12040: `const res = await runAvailabilityCheck(availabilityPre, nextSlots, ciISO!, coISO!);`
- L12050: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L12117: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L12131: `await persistCreateDraft(pre, createQuoteSlots);`
- L12142: `const res = await runAvailabilityCheck(availabilityPre, { ...nextSlots }, ciISO, coISO);`
- L12147: `await persistModifyExecutionContext(pre, modifyReservationId, {`
- L12195: `finalText = await harmonizeBillingCurrencyAnswer(`

### 12231-12340

- L12240: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L12263: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L12269: `await persistCreateDraft(pre, quotedReservationSnapshot as ReservationSlotsStrict);`
- L12295: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`


---

## 5. Decisiones por bucket

### 5731-5980

- L5744: `if (correctedGuestName) {`
- L5786: `if (stableIntent.matched && stableIntent.response && !shouldSuppressStableIntent) {`
- L5796: `if (stableIntent.intentKey === "farewell") {`
- L5828: `if (`
- L5836: `if (continuation) finalText = '${String(finalText \|\| "").trim()} ${continuation}'.trim();`
- L5838: `if (shouldClearSelectedReservationTargetForCategory(nextCategory, null)) {`
- L5849: `if (!shouldPreserveModifyTarget) {`
- L5874: `if (`
- L5901: `if (rawCreateDateIssue) {`
- L5914: `if (!isNonReservationFollowup && rawCreateSubFlow === "create" && rawCreateIntent.kind !== "modify" && rawCreateIntent.kind !== "cancel" && hasExplicitCreateContext) {`
- L5924: `if (dominantTurnDomain.dominant === "pricing" && !dominantTurnDomain.hasReservation) {`
- L5945: `if (vagueWeekendReservationIntent) {`
- L5955: `// Fast-path 0: if the user provides an explicit full date range in the same message, confirm immediately`

### 5981-6230

- L6013: `if (dr0.checkIn && dr0.checkOut && !isEventLikeMessage && !hasCompleteRichCreatePayloadInTurn0) {`
- L6019: `if (dr0Coherence && !dr0Coherence.ok) {`
- L6055: `if (shouldBypassRichCreateFastPath \|\| shouldBypassRichModifyFastPath) {`
- L6059: `if (`
- L6074: `if (!fastModifyValidation.ok) {`
- L6075: `if (fastModifyValidation.nextField) {`
- L6102: `if (availabilityInquiryPolicy0) {`
- L6105: `if (inquiryMissingField) {`
- L6129: `if (!availabilityResult.needsHandoff) {`
- L6152: `if (fastPathSubFlow === "create") {`
- L6154: `if (!createDraftConsistency.valid) {`
- L6165: `if (missingField) {`
- L6176: `if (fastPathSubFlow === "modify") {`
- L6178: `if (previewTarget?.reservationId) {`
- L6196: `if (fastPathSubFlow === "modify") {`
- L6226: `if (ambiguousQuotedProposalConfirmationFast) {`

### 6231-6480

- L6260: `if (fastPathSubFlow === "create" && !explicitTurnSlotsFast.guestName) {`
- L6262: `if (safeLeadGuestName) explicitTurnSlotsFast.guestName = safeLeadGuestName;`
- L6278: `if (currentTurnReadyCreateFast) {`
- L6283: `if (!createDraftConsistency.valid) {`
- L6399: `if (hasOneDateOnly && hasContext && !shouldDeferSingleDateFastPath) {`
- L6400: `if (singleFastISO && reservationContextualMissingSideFast) {`
- L6410: `if (`
- L6418: `if (!normalizedFastPathSlots.numGuests) {`
- L6420: `if (explicitGuestCount) normalizedFastPathSlots.numGuests = explicitGuestCount;`
- L6423: `if (`
- L6435: `if (inheritedCheckOutCoherence && !inheritedCheckOutCoherence.ok) {`
- L6441: `if (`
- L6449: `if (isPastReservationDateISO(coISO) \|\| (checkOutCoherence && !checkOutCoherence.ok)) {`
- L6455: `if (!sanitizedCreateSlots.numGuests) {`
- L6457: `if (explicitGuestCount) sanitizedCreateSlots.numGuests = explicitGuestCount;`
- L6472: `if (availabilityInquiryPolicyFast) {`
- L6475: `if (inquiryMissingField) {`

### 6481-6730

- L6494: `if (ciISO && coISO) {`
- L6500: `if (!availabilityResult.needsHandoff) {`
- L6524: `if (fastPathSubFlow === "create") {`
- L6532: `if (!createDraftConsistency.valid) {`
- L6544: `if (missingField) {`
- L6553: `if (canAutoQuoteCreateFast && isCreateStateReadyForQuote(normalizedFastPathSlots) && ciISO && coISO) {`
- L6591: `if (ciISO && coISO) {`
- L6592: `if (fastPathSubFlow === "modify") {`
- L6594: `if (previewTarget?.reservationId) {`
- L6612: `if (fastPathSubFlow === "modify") {`
- L6636: `if (singleFastISO && fastPathSubFlow === "modify" && fastTemporalSideIntent) {`
- L6672: `if (`
- L6685: `if (`
- L6702: `if (drFast.checkIn && !explicitCheckOutFast && !isConfirmedBooking && isPastReservationCheckInISO(drFast.checkIn)) {`
- L6711: `if (last instanceof HumanMessage) {`
- L6713: `if (lastTxt.trim() === userTxtFast.trim()) hist.pop();`
- L6718: `if (prevISO && currISO) {`
- L6729: `if (fastPathSubFlow === "create") {`

### 6731-6980

- L6737: `if (!createDraftConsistency.valid) {`
- L6748: `if (missingField) {`
- L6758: `if (canAutoQuoteCreateFast) {`
- L6796: `if (fastPathSubFlow === "modify") {`
- L6798: `if (previewTarget?.reservationId) {`
- L6816: `if (fastPathSubFlow === "modify") {`
- L6837: `if (modifyContextActiveFast) {`
- L6867: `if (`
- L6884: `if (hasValueForQueuedField) {`
- L6887: `if (nextQueuedModifyState) {`
- L6922: `if (explicitModifyExitFast) {`

### 6981-7230

- L6988: `if (genericModify && (resolutionFast.status === "ambiguous" \|\| resolutionFast.status === "out_of_range")) {`
- L7000: `if (`
- L7028: `if (`
- L7054: `if (`
- L7070: `if (!fastInlineValidation.ok) {`
- L7071: `if (fastInlineValidation.nextField) {`
- L7098: `if (`
- L7110: `if (activeFieldFast) {`
- L7143: `if (`
- L7182: `if (canOpenModifyMenu) {`
- L7205: `if (resolvedFastReservationTarget?.reservationId) {`
- L7219: `if (pre.prevCategory === 'send_email_copy') {`
- L7223: `if (wantsWhatsApp) {`
- L7226: `if (phoneMatchWA) {`
- L7229: `if (norm.normalized) {`

### 7231-7480

- L7245: `if (isWhatsAppReady()) {`
- L7249: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L7250: `if (requestId) {`
- L7255: `if (ack) break;`
- L7293: `if (wantsEscalate) {`
- L7303: `if (emailInMsg \|\| wantsRetry) {`
- L7304: `if (!lastEmail) {`
- L7313: `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso; };`
- L7325: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L7326: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L7341: `if (cLoop.isNotConfigured \|\| cLoop.isQuota) {`
- L7346: `if (attempt < 2 && !sent) await new Promise(r => setTimeout(r, 150));`
- L7349: `if (sent) {`
- L7365: `if (prevFailures >= escalationThreshold) {`
- L7376: `if (isNotConfigured) {`
- L7382: `} else if (isQuota) {`
- L7463: `if (looksNonReservationDomainTurn && pre.st?.selectedReservationTarget && !shouldPreserveReservationSelectionForOverride) {`

### 7481-7730

- L7511: `if (awaitingModifyPreviewConfirmationEarly && pendingModifyPatchEarly?.reservationId) {`
- L7513: `if (!pendingTarget?.reservationId \|\| pendingTarget.reservationStatus === "cancelled" \|\| pendingTarget.reservationStatus === "error") {`
- L7550: `if (previewReject) {`
- L7561: `if (hasPreviewCorrections && !previewConfirm) {`
- L7563: `if (!previewValidation.ok) {`
- L7577: `if (!previewConfirm) {`
- L7583: `if (!previewValidation.ok) {`
- L7620: `if (`
- L7635: `if (`
- L7674: `if (`
- L7682: `if (`
- L7718: `if (explicitModifyExit) {`

### 7731-7980

- L7797: `if (`
- L7808: `if (`
- L7821: `if (`
- L7852: `if (`
- L7860: `if (ambiguousReservationAction) {`
- L7861: `if (ambiguousReservationAction === "modify") {`
- L7884: `if (`
- L7928: `if (`
- L7943: `if (targetId && target) {`
- L7968: `if (effectiveSnapshotQueryKind === "list") {`

### 7981-8230

- L7992: `if (effectiveSnapshotQueryKind && !resolvedSnapshotTarget) {`
- L7994: `if (localConfirmed.length === 0) {`
- L7998: `if (candidates.length === 1) {`
- L8019: `} else if (candidates.length > 1) {`
- L8032: `if (finalText) {`
- L8042: `if (effectiveSnapshotQueryKind && resolvedSnapshotTarget) {`
- L8077: `if (modifyFocusActiveEarly && explicitReservationCode && !explicitIdReservationTarget && !explicitOrdinalReservationTarget) {`
- L8131: `if (`
- L8136: `if (!target?.reservationId) {`
- L8140: `if (target.reservationStatus === "cancelled" \|\| target.reservationStatus === "error") {`
- L8157: `if (wantsConfirmedHolderChange) {`
- L8210: `if (!hasImmediateModifyValue && hasExplicitModifyFieldRequest && hasExplicitModifyTarget) {`
- L8217: `if (activeField) {`
- L8230: `if (hasImmediateModifyValue && hasExplicitModifyTarget && target.reservationId && directImmediateModifyFields.length > 0) {`

### 8231-8480

- L8240: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L8247: `if (nextRoomTypeForCapacity && hasValidGuestCount) {`
- L8249: `if (capacity > 0 && nextGuestCountNumber > capacity) {`
- L8281: `if (!hasImmediateModifyValue && hasTemporalModifySignal) {`
- L8305: `if (!hasImmediateModifyValue) {`
- L8318: `if (`
- L8359: `if (`
- L8450: `if (`

### 8481-8730

- L8486: `if (!previewTarget?.reservationId) {`
- L8497: `if (activeModifyField === "dates" && hasModifyDateCorrection) {`
- L8507: `if (correctedTemporalISO) {`
- L8512: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L8543: `if (!previewTarget?.reservationId) {`
- L8555: `if (!hasTurnLevelModifyValue && !awaitingModifyExecutionContinuation) {`
- L8560: `if (activeModifyField === "guests" && nextGuestCount) {`
- L8561: `if (!codeFromModifySubstate) {`
- L8567: `if (baseRoomType && hasValidGuestCount) {`
- L8569: `if (capacity > 0 && nextGuestCountNumber > capacity) {`
- L8589: `if (queuedModifyState) {`
- L8618: `if (!previewTarget?.reservationId) {`
- L8627: `if (activeModifyField === "roomType" && nextRoomType && String(nextRoomType) !== String(pre.st?.reservationSlots?.roomType \|\| "")) {`
- L8628: `if (!codeFromModifySubstate) {`
- L8633: `if (queuedModifyState) {`
- L8662: `if (!previewTarget?.reservationId) {`
- L8671: `if (activeModifyField === "dates" && hasExplicitDateRange && nextCheckIn && nextCheckOut) {`
- L8672: `if (!codeFromModifySubstate) {`
- L8677: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L8682: `if (queuedModifyState) {`
- L8712: `if (!previewTarget?.reservationId) {`
- L8723: `if (awaitingModifyExecutionContinuation) {`

### 8731-8980

- L8742: `if (additionalReservationIntent && hasConfirmedBookingContext) {`
- L8771: `if (hasCheckIn && !hasCheckOut) {`
- L8779: `if (!hasCheckIn && hasCheckOut) {`
- L8787: `if (hasCheckIn && hasCheckOut) {`
- L8789: `if (missingField) {`
- L8857: `if (shouldHandleAvailabilityInquiry) {`
- L8859: `if (inquiryMissingField) {`
- L8883: `if (inquiryCheckIn && inquiryCheckOut) {`
- L8885: `if (inquiryDateCoherence && !inquiryDateCoherence.ok) {`
- L8894: `if (!availabilityResult.needsHandoff) {`
- L8914: `if (availabilityInquiryAmbiguousAdvance) {`
- L8968: `if (!createDraftConsistency.valid) {`

### 8981-9230

- L9014: `if (draftHolderCorrectionActive) {`
- L9018: `if (!holderCandidate) {`
- L9051: `if (shouldQuoteUpdatedHolder) {`
- L9101: `if (`
- L9113: `if (readyCreateDateCoherence && !readyCreateDateCoherence.ok) {`
- L9147: `if (pendingCreateProposal && !modifyExecutionActive) {`
- L9157: `if (quotedReplyIsNegative) {`
- L9164: `if (!strictQuotedConfirmation && quotedReplyHasConfirmWord) {`
- L9169: `if (!strictQuotedConfirmation && quotedReplyIsBareAffirmative) {`
- L9178: `if (!strictQuotedConfirmation) {`
- L9201: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L9204: `if (typeof startWeekday !== "number" \|\| typeof endWeekday !== "number") return {};`

### 9231-9480

- L9265: `if (hasQuotedProposalCorrection) {`
- L9267: `if (!quotedDraftConsistency.valid) {`
- L9278: `if (!isCreateStateReadyForQuote(quotedDraftConsistency.sanitizedSlots)) {`
- L9295: `if (hasQuotedProposalDateCorrection && requoteCheckIn && requoteCheckOut) {`
- L9297: `if (requoteCoherence && !requoteCoherence.ok) {`
- L9337: `if (`
- L9372: `if (`
- L9388: `if (`
- L9406: `if (`
- L9440: `if (emailAskRE.test(userTxtRaw)) {`
- L9443: `if (!email) {`
- L9452: `if (!iso) return iso;`
- L9465: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L9466: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L9473: `lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150));`
- L9476: `if (sentOK) {`

### 9481-9730

- L9512: `if (!emailAskRE.test(userTxtRaw) && recentReservationMention && lightVerb && (hasEmailAddr \|\| mentionsEmailWord)) {`
- L9514: `if (!explicitEmail) {`
- L9523: `if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L9535: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L9536: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L9542: `} catch (err) { lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150)); }`
- L9544: `if (sentOK) {`
- L9578: `if (!waAskRE.test(userTxtRaw) && waLightAskRE.test(userTxtRaw) && (pre.st?.lastReservation \|\| recentReservationMention)) {`
- L9583: `if (!jid) {`
- L9585: `if (phoneInline) {`
- L9587: `if (attempt.normalized) {`
- L9603: `if (isWhatsAppReady()) {`
- L9607: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L9609: `if (requestId) {`
- L9614: `if (ack) break;`
- L9629: `if (code !== 'WA_NOT_READY') {`
- L9661: `if (isWhatsAppReady()) {`
- L9665: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L9666: `if (requestId) {`
- L9671: `if (ack) break;`
- L9685: `if (code !== 'WA_NOT_READY') {`
- L9698: `if (waAskRE.test(userTxtRaw)) {`
- L9704: `if (!jid) {`
- L9707: `if (phoneInline) {`
- L9709: `if (attempt.normalized) {`
- L9725: `if (isWhatsAppReady()) {`
- L9729: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L9730: `if (requestId) {`

### 9731-9980

- L9735: `if (ack) break;`
- L9750: `if (code !== 'WA_NOT_READY') {`
- L9783: `if (isWhatsAppReady()) {`
- L9787: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L9788: `if (requestId) {`
- L9793: `if (ack) break;`
- L9807: `if (code !== 'WA_NOT_READY') {`
- L9820: `if (pre.prevCategory === "send_whatsapp_copy") {`
- L9822: `if (phoneMatch) {`
- L9824: `if (digits.length >= 6) {`
- L9839: `if (isWhatsAppReady()) {`
- L9843: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L9844: `if (requestId) {`
- L9849: `if (ack) break;`
- L9864: `if (code !== 'WA_NOT_READY') {`
- L9920: `if (inCancelFlow && cancelCodeFromUser && !isPureConfirm(userTxtRaw)) {`
- L9922: `if (canonicalCancelTarget && canonicalCancelTarget.canonicalStatus !== "active") {`
- L9948: `if (pendingCancellation?.reservationId && pendingCancellation.awaitingConfirmation && isPureConfirm(userTxtRaw)) {`
- L9950: `if (canonicalCancelTarget && canonicalCancelTarget.canonicalStatus !== "active") {`

### 9981-10230

- L10020: `if (wantsCancel) {`
- L10021: `if (`
- L10054: `if (!resolvedCancelCode) {`
- L10055: `if (reservationReference.status === "ambiguous" \|\| reservationReference.status === "out_of_range") {`
- L10071: `if (canonicalCancelTarget && canonicalCancelTarget.canonicalStatus !== "active") {`
- L10082: `if (!(isPureConfirm(userTxtRaw) \|\| hasInlineCancelConfirmation)) {`
- L10163: `if (offeredTimeSide && isPureAffirmative(userTxtRaw, pre.lang)) {`
- L10169: `if (time && typeof time === "string") {`
- L10196: `if (`
- L10213: `if (`
- L10225: `if (`

### 10231-10480

- L10231: `if (!isReservationConfirmable && !modifyExecutionActive && !hasCreateQuoteConfirmationContext) {`
- L10232: `if (reservationFlow === "confirmed") {`
- L10237: `: "There is already a confirmed booking on this conversation. Tell me if you want to modify or cancel it.";`
- L10240: `if (activeCreateFlow && nextCreateMissingField) {`
- L10252: `if (!hasGuests) {`
- L10253: `if (activeCreateFlow && pre.msg.channel === "email" && nextCreateMissingField) {`
- L10261: `if (!hasGuestName) {`
- L10262: `if (!modifyExecutionActive) {`
- L10282: `if (modifyExecutionActive) {`
- L10286: `if (awaitingModifyPreviewConfirmation && pendingModifyPatch?.reservationId) {`
- L10288: `if (!pendingTarget?.reservationId \|\| pendingTarget.reservationStatus === "cancelled" \|\| pendingTarget.reservationStatus === "error") {`
- L10322: `if (previewReject) {`
- L10333: `if (hasPreviewCorrections && !previewConfirm) {`
- L10335: `if (!previewValidation.ok) {`
- L10349: `if (!previewConfirm) {`
- L10355: `if (!previewValidation.ok) {`
- L10402: `if (`
- L10410: `if (!hasChanges) {`
- L10411: `if (hasDraftHolderCorrectionIntent(userTxtRaw)) {`
- L10453: `if (!codeFromUser) {`
- L10454: `if (reservationReference.status === "ambiguous" \|\| reservationReference.status === "out_of_range") {`
- L10461: `if (!hasChanges) {`
- L10468: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L10473: `if (!genericModifyTarget?.reservationId \|\| genericModifyTarget.reservationStatus === "cancelled" \|\| genericModifyTarget.reservationStatus === "error") {`

### 10481-10730

- L10486: `if (!genericModifyValidation.ok) {`
- L10487: `if (genericModifyValidation.nextField) {`
- L10519: `if (hasCreateQuoteConfirmationContext) {`
- L10525: `if (!createDraftConsistency.valid) {`
- L10536: `if (!isCreateStateReadyForQuote(snapshot as ReservationSlotsStrict)) {`
- L10538: `if (missingField) {`
- L10544: `if (!snapshot.roomType \|\| !snapshot.checkIn \|\| !snapshot.checkOut) {`
- L10549: `if (createDateCoherence && !createDateCoherence.ok) {`
- L10558: `if (result.ok && hasReservationId) {`
- L10608: `if (canonicalRecordForReply) {`
- L10656: `if (await tryConversationalGuestNameCapture(pre, state)) {`
- L10660: `if (!tryBodyLLMTestGreetingFastpath(pre, state)) {`
- L10684: `if (`
- L10693: `if (postBookingSnapshotQ === "list") {`
- L10710: `if (candidates.length === 1) {`

### 10731-10980

- L10735: `if (candidates.length > 1) {`
- L10752: `if (postBookingSnapshotQ && !hasConfirmedBookingContext) {`
- L10761: `if (`
- L10770: `if (`
- L10776: `if (postBookingSnapshotQ === "list") {`
- L10828: `if (postBookingLateCheckoutQ && hasConfirmedBookingContext) {`
- L10833: `if (postBookingEarlyCheckinQ && hasConfirmedBookingContext) {`
- L10843: `if (postBookingTimeQ && hasConfirmedBookingContext) {`
- L10941: `if (wantsNearby) {`
- L10944: `if (looksBillingByRule) {`
- L10955: `if (kbForced.ok && forcedText) {`
- L10962: `if (/(actividad\|actividades\|zona\|lugares para visitar\|restaurants? cercanos\|atracciones)/i.test(finalText)) {`

### 10981-11230

- L10992: `if (!forcedBillingResolved) {`
- L11015: `if (!hasReservationContext && !wantsNearby && !looksEventIntent && !looksTransactionalPricing) {`
- L11017: `if (skipKbFastpath) {`
- L11030: `if (kbPrecedence?.promptKey === "room_info_img" && !kbPrecedence.defersToRuntimeAction) {`
- L11032: `if (richResolved) {`
- L11068: `if (kb.ok && safeCat && text) {`
- L11083: `if (`
- L11095: `if (continuation) {`
- L11128: `if (pureCreateLateralTurn && !pureCreateLateralKbResolved) {`
- L11130: `if (failsafeReply) {`
- L11216: `if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {`

### 11231-11480

- L11234: `if (noContent && isNearby) {`
- L11250: `if (rbRich) explicitRich = rbRich;`
- L11251: `if (rbText) {`
- L11294: `if (!finalText) {`
- L11296: `if (!(pre as any).__orchestratorActive) {`
- L11318: `if (createFlowActive && createMissingField === "guestName" && nextCategory === "reservation") {`
- L11325: `if (reservationLocalFallbackNeeded) {`
- L11330: `if (Object.keys(fallbackSlots).length > 0) {`
- L11365: `if (pre.inModifyMode) {`
- L11367: `if (isContactHotelText(finalText, pre.lang)) {`
- L11378: `if (!ackedVerifyInThisReply && noNewChangeData && isQuoteOrConfirmText(finalText, pre.lang)) {`
- L11439: `if (`
- L11466: `if (!activeModifyField && (requestedChangeDates \|\| requestedChangeRoom \|\| requestedChangeGuests \|\| hasImplicitModifyValueFollowup)) {`
- L11467: `if ((pre.inModifyMode \|\| pre.prevCategory === "modify_reservation") && (hasBoundReservationTarget \|\| pre.prevCategory === "modify_reservation")) {`

### 11481-11730

- L11483: `if (hasImmediateFieldValue) {`
- L11501: `if (pendingRequestedFields.length > 0) {`
- L11506: `if (activeField === "dates" && ingestedSlots.checkIn && ingestedSlots.checkOut) {`
- L11511: `if (previewTarget?.reservationId) {`
- L11547: `if (activeField === "dates") {`
- L11549: `} else if (activeField === "guests") {`
- L11585: `if (pre.inModifyMode && wantsGenericModify(String(pre.msg.content \|\| ""), pre.lang) && (nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.chec`
- L11600: `if (resolvedModifyTarget?.reservationId) {`
- L11730: `if (lateCheckoutQ) {`

### 11731-11980

- L11734: `} else if (earlyCheckinQ) {`
- L11743: `} else if (timeQ) {`
- L11748: `if (hasConfirmedBookingContext) {`
- L11754: `if (time && typeof time === "string") {`
- L11781: `if (!nextCategory) nextCategory = "retrieval_based";`
- L11783: `} else if (triggerDateFlow) {`
- L11797: `if (shouldPersistPartialModifyDate && modifyTemporalSideIntent) {`
- L11824: `if (!hasDateTokenInMsg) {`
- L11826: `if (modifyTemporalSideIntent && (userDates.checkIn \|\| userDates.checkOut)) {`
- L11831: `} else if (sideIntent) {`
- L11833: `if (sideIntent === 'checkIn') preserveAskCheckIn = finalText; // preservar si luego se genera confirmación accidental`
- L11834: `} else if (mentionsNewDates \|\| mentionsDates) {`
- L11852: `if (cons.changed) {`
- L11856: `if (!userModifiesCheckInWithoutDate && (isEmpty \|\| cons.finalText)) {`
- L11858: `if (cons.finalText) finalText = cons.finalText;`
- L11860: `if (cons.preservedPrompt && /anot[eé] nuevas fechas\|anotei as novas datas\|noted the new dates/i.test(finalText \|\| '')) {`
- L11884: `if (newCI && newCO && (newCI !== prevCI \|\| newCO !== prevCO)) {`
- L11889: `if ((!txt \|\| genericAck \|\| !hasDatesMentioned)) {`
- L11891: `if (!iso) return iso \|\| '';`
- L11898: `if (!modifyExecutionActive && !createQuoteReady && !/¿cu[aá]l es la fecha de check\-?out\|what is the check\-?out date\|qual é a data de check\-?out/i.test(txt)) {`
- L11916: `if (hasDuplicateRange) {`
- L11923: `if (m instanceof HumanMessage) {`
- L11926: `if (dates.length === 1 && dates[0] !== currentDate) { previousSingle = dates[0]; break; }`
- L11929: `if (previousSingle && currentDate) {`
- L11943: `if (!modifyExecutionActive) {`
- L11961: `if (isVerifyAvailabilityAffirmative) {`
- L11978: `if (quoteGatedCreateFlow) {`
- L11980: `if (!createDraftConsistency.valid) {`

### 11981-12230

- L11992: `if (quoteGatedCreateFlow && !isCreateStateReadyForQuote(createQuoteSlots)) {`
- L11994: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L12002: `if (ci && co) {`
- L12004: `if (availabilityDateCoherence && !availabilityDateCoherence.ok) {`
- L12010: `if (modifyExecutionActive) {`
- L12015: `if (!modifyTarget?.reservationId) {`
- L12068: `if (availabilityNeedsHandoff) {`
- L12082: `if (missing) finalText = buildAskMissingDate(pre.lang, missing as any, modifyExecutionActive ? "modify" : "create");`
- L12096: `if (isAskAvailabilityStatusQuery(String(pre.msg.content \|\| ""), pre.lang)) {`
- L12114: `if (quoteGatedCreateFlow) {`
- L12116: `if (!createDraftConsistency.valid) {`
- L12128: `if (quoteGatedCreateFlow && !isCreateStateReadyForQuote(createQuoteSlots)) {`
- L12130: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L12136: `if (ciISO && coISO) {`
- L12138: `if (availabilityStatusDateCoherence && !availabilityStatusDateCoherence.ok) {`
- L12145: `if (modifyExecutionActive) {`
- L12162: `if (res.needsHandoff) {`
- L12190: `if (isAmenitiesTurn) {`
- L12194: `if (isBillingTurn) {`
- L12204: `if (isSupportTurn) {`
- L12217: `if (`
- L12224: `if (continuation) {`
- L12228: `if (shouldClearSelectedReservationTargetForCategory(nextCategory, promptKeyUsed)) {`

### 12231-12340

- L12239: `if (!shouldPreserveModifyTarget) {`
- L12255: `if (`
- L12262: `if (!createDraftConsistency.valid) {`
- L12266: `} else if (!isCreateStateReadyForQuote(quotedReservationSnapshot as ReservationSlotsStrict)) {`
- L12268: `if (missingField) {`
- L12275: `if (`
- L12286: `if (`
- L12323: `if (!(graphResult as any)?.meta?.debug?.route_source && finalText) {`


---

## 6. Líneas relevantes para temporal/checkIn/checkOut/numGuests

### 5731-5980

- L5792: `? "checkout_info"`
- L5794: `? "checkin_info"`
- L5816: `stableTurnSlots.checkIn \|\|`
- L5817: `stableTurnSlots.checkOut \|\|`
- L5819: `stableTurnSlots.numGuests \|\|`
- L5821: `extractRawOrderedDateRange(rawTurnText)?.checkIn`
- L5831: `isLateralTurn: nextCategory === "amenities_info" \|\| nextCategory === "checkin_info" \|\| nextCategory === "checkout_info",`
- L5873: `const earlyCheckinShortcutQ = detectEarlyCheckinQuestion(rawTurnText, pre.lang);`
- L5875: `earlyCheckinShortcutQ &&`
- L5882: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L5883: `finalText = buildEarlyCheckinResponse(pre.lang, guestState, {`
- L5884: `checkInTime: confCheckIn,`
- L5887: `nextCategory = "checkin_info";`
- L5889: `decision_layer: "early_checkin_heuristic",`
- L5890: `route_source: "early_checkin_heuristic",`
- L5891: `route_match: "early_checkin",`
- L5941: `!extractSlotsFromText(rawTurnText, pre.lang).checkIn &&`
- L5942: `!extractSlotsFromText(rawTurnText, pre.lang).checkOut &&`
- L5970: `Boolean(explicitDr0.checkIn && explicitDr0.checkOut) &&`
- L5971: `assessReservationDateCoherence(explicitDr0.checkIn, explicitDr0.checkOut)?.ok === true;`
- L5973: `Boolean(rawDr0?.checkIn && rawDr0?.checkOut) &&`
- L5974: `assessReservationDateCoherence(rawDr0?.checkIn, rawDr0?.checkOut)?.ok === true;`
- L5976: `Boolean(lightDr0.checkIn && lightDr0.checkOut) &&`
- L5977: `assessReservationDateCoherence(lightDr0.checkIn, lightDr0.checkOut)?.ok === true;`
- L5979: `Boolean(relativeWeekendDr0.checkIn && relativeWeekendDr0.checkOut) &&`
- L5980: `assessReservationDateCoherence(relativeWeekendDr0.checkIn, relativeWeekendDr0.checkOut)?.ok === true;`

### 5981-6230

- L5982: `Boolean(relativeWeekdayRangeDr0.checkIn && relativeWeekdayRangeDr0.checkOut) &&`
- L5983: `assessReservationDateCoherence(relativeWeekdayRangeDr0.checkIn, relativeWeekdayRangeDr0.checkOut)?.ok === true;`
- L5985: `Boolean(anchoredCreateDr0.checkIn && anchoredCreateDr0.checkOut) &&`
- L5986: `assessReservationDateCoherence(anchoredCreateDr0.checkIn, anchoredCreateDr0.checkOut)?.ok === true;`
- L6000: `: explicitDr0.checkIn \|\| explicitDr0.checkOut`
- L6007: `turnCreateSlots0.checkIn &&`
- L6008: `turnCreateSlots0.checkOut &&`
- L6010: `turnCreateSlots0.numGuests &&`
- L6013: `if (dr0.checkIn && dr0.checkOut && !isEventLikeMessage && !hasCompleteRichCreatePayloadInTurn0) {`
- L6017: `assessReservationDateCoherence(rawDr0?.checkIn, rawDr0?.checkOut) \|\|`
- L6018: `assessReservationDateCoherence(dr0.checkIn, dr0.checkOut);`
- L6027: `checkIn: dr0.checkIn,`
- L6028: `checkOut: dr0.checkOut,`
- L6042: `fastPathSlots.checkIn &&`
- L6043: `fastPathSlots.checkOut &&`
- L6045: `fastPathSlots.numGuests &&`
- L6053: `Boolean(fastPathTurnSlots.roomType \|\| fastPathTurnSlots.numGuests);`
- L6063: `(fastPathTurnSlots.roomType \|\| fastPathTurnSlots.numGuests)`
- L6068: `numGuests: fastPathSlots.numGuests \|\| resolvedModifyTarget0.numGuests,`
- L6069: `checkIn: fastPathSlots.checkIn \|\| resolvedModifyTarget0.checkIn,`
- L6070: `checkOut: fastPathSlots.checkOut \|\| resolvedModifyTarget0.checkOut,`
- L6124: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, dr0.checkIn, dr0.checkOut, {`
- L6189: `const ciTxt = isoToDDMMYYYY(dr0.checkIn) \|\| dr0.checkIn;`
- L6190: `const coTxt = isoToDDMMYYYY(dr0.checkOut) \|\| dr0.checkOut;`

### 6231-6480

- L6235: `const supportedDrFastRaw = await extractSupportedTemporalDateRange(userTxtFast, pre.lang);`
- L6239: `supportedDrFastRaw.checkIn && supportedDrFastRaw.checkOut`
- L6241: `: relativeWeekdayRangeFast.checkIn && relativeWeekdayRangeFast.checkOut`
- L6243: `: supportedDrFastRaw.checkIn \|\| supportedDrFastRaw.checkOut`
- L6261: `const safeLeadGuestName = extractSafeCreateTemporalLeadGuestName(userTxtFast);`
- L6293: `const ciISO = createDraftConsistency.sanitizedSlots.checkIn;`
- L6294: `const coISO = createDraftConsistency.sanitizedSlots.checkOut;`
- L6340: `const fastTemporalSideIntent = detectModifyTemporalSideIntent(userTxtFast, drFast);`
- L6341: `const explicitCheckOutFast =`
- L6342: `fastTemporalSideIntent === "checkOut" \|\|`
- L6343: `Boolean(explicitTurnSlotsFast.checkOut && !explicitTurnSlotsFast.checkIn);`
- L6351: `? !inquiryKnownFastSlots.checkIn`
- L6352: `? "checkIn"`
- L6353: `: !inquiryKnownFastSlots.checkOut`
- L6354: `? "checkOut"`
- L6361: `const createCheckOutRepairContextFast =`
- L6363: `explicitCheckOutFast &&`
- L6364: `Boolean(pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn) &&`
- L6365: `!Boolean(pre.st?.reservationSlots?.checkOut);`
- L6368: `(createCheckOutRepairContextFast ? "checkOut" : undefined) \|\|`
- L6370: `(inquiryMissingSideFast === "checkIn" \|\| inquiryMissingSideFast === "checkOut" ? inquiryMissingSideFast : undefined);`
- L6371: `const createCheckInRepairContextFast =`
- L6373: `!explicitCheckOutFast &&`
- L6374: `drFast.checkIn &&`
- L6375: `!drFast.checkOut &&`
- L6376: `!pre.st?.reservationSlots?.checkIn;`
- L6378: `createCheckInRepairContextFast`
- L6379: `? "checkIn"`
- L6381: `const singleFastISO = drFast.checkIn \|\| drFast.checkOut;`
- L6382: `const hasOneDateOnly = Boolean(singleFastISO) && !(drFast.checkIn && drFast.checkOut);`
- L6393: `Boolean((pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn) && (pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut));`
- L6398: `!fastTemporalSideIntent;`
- L6402: `fastPathSubFlow === "create" && explicitCheckOutFast`
- L6403: `? "checkOut"`
- L6405: `const contextualFastDates = createSingleDateSideFast === "checkIn"`
- L6406: `? { checkIn: singleFastISO }`
- L6407: `: { checkOut: singleFastISO };`
- L6412: `createSingleDateSideFast === "checkOut" &&`
- L6413: `explicitCheckOutFast`
- L6415: `const explicitCheckOutSlots = mergeReservationSlots(pre.currSlots, normalizedFastPathSlots);`

### 6481-6730

- L6636: `if (singleFastISO && fastPathSubFlow === "modify" && fastTemporalSideIntent) {`
- L6644: `fastTemporalSideIntent`
- L6661: `fastTemporalSideIntent === "checkIn" ? "checkOut" : "checkIn"`
- L6674: `drFast.checkIn &&`
- L6675: `!explicitCheckOutFast &&`
- L6677: `isPastReservationCheckInISO(drFast.checkIn)`
- L6684: `delete sanitizedCreateSlots.checkOut;`
- L6686: `sanitizedCreateSlots.checkIn &&`
- L6687: `isPastReservationCheckInISO(sanitizedCreateSlots.checkIn)`
- L6689: `delete sanitizedCreateSlots.checkIn;`
- L6693: `finalText = buildPastReservationCheckInPrompt(pre.lang, drFast.checkIn);`
- L6702: `if (drFast.checkIn && !explicitCheckOutFast && !isConfirmedBooking && isPastReservationCheckInISO(drFast.checkIn)) {`
- L6703: `finalText = buildPastReservationCheckInPrompt(pre.lang, drFast.checkIn);`
- L6704: `const { checkIn: _dropInvalidCheckIn, ...restNextSlots } = nextSlots;`
- L6716: `const prevISO = prevSingle.checkIn \|\| prevSingle.checkOut;`
- L6717: `const currISO = drFast.checkIn \|\| drFast.checkOut;`
- L6725: `checkIn: ciISO,`
- L6726: `checkOut: coISO,`

### 6731-6980

- L6835: `const missingSide = drFast.checkIn ? "checkOut" : "checkIn";`
- L6849: `fastTemporalSideIntent`
- L6882: `(activeQueuedModifyField === "guests" && Boolean(queuedTurnSlots.numGuests)) \|\|`
- L6883: `(activeQueuedModifyField === "dates" && Boolean(queuedDateRange?.checkIn && queuedDateRange?.checkOut));`
- L6966: `const userDatesFast = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L6967: `const sideIntentFast = detectModifyTemporalSideIntent(userTxt, userDatesFast);`
- L6970: `const isDateTopicFast = Boolean(sideIntentFast \|\| userDatesFast.checkIn \|\| userDatesFast.checkOut \|\| hasAnyDateTokenFast \|\| mentionsDatesFast);`
- L6974: `const mentionsGuestsFieldFast = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxtFast);`
- L6977: `inlineModifyTurnSlotsFast.numGuests \|\|`
- L6978: `(inlineModifyDateRangeFast?.checkIn && inlineModifyDateRangeFast?.checkOut)`

### 6981-7230

- L7009: `numGuests: resolvedFastReservationTarget.numGuests,`
- L7010: `checkIn: resolvedFastReservationTarget.checkIn,`
- L7011: `checkOut: resolvedFastReservationTarget.checkOut,`
- L7064: `numGuests: inlineModifyTurnSlotsFast.numGuests \|\| resolvedFastReservationTarget.numGuests,`
- L7065: `checkIn: inlineModifyDateRangeFast?.checkIn \|\| resolvedFastReservationTarget.checkIn,`
- L7066: `checkOut: inlineModifyDateRangeFast?.checkOut \|\| resolvedFastReservationTarget.checkOut,`
- L7116: `numGuests: resolvedFastReservationTarget.numGuests,`
- L7117: `checkIn: resolvedFastReservationTarget.checkIn,`
- L7118: `checkOut: resolvedFastReservationTarget.checkOut,`
- L7149: `!inlineModifyTurnSlotsFast.numGuests &&`
- L7150: `!(inlineModifyDateRangeFast?.checkIn && inlineModifyDateRangeFast?.checkOut)`
- L7155: `numGuests: resolvedFastReservationTarget.numGuests \|\| pre.st?.reservationSlots?.numGuests,`
- L7156: `checkIn: resolvedFastReservationTarget.checkIn \|\| pre.st?.reservationSlots?.checkIn,`
- L7157: `checkOut: resolvedFastReservationTarget.checkOut \|\| pre.st?.reservationSlots?.checkOut,`
- L7190: `numGuests: resolvedFastReservationTarget.numGuests,`
- L7191: `checkIn: resolvedFastReservationTarget.checkIn,`
- L7192: `checkOut: resolvedFastReservationTarget.checkOut,`

### 7231-7480

- L7239: `checkIn: pre.st?.reservationSlots?.checkIn \|\| pre.currSlots.checkIn,`
- L7240: `checkOut: pre.st?.reservationSlots?.checkOut \|\| pre.currSlots.checkOut,`
- L7241: `numGuests: pre.st?.reservationSlots?.numGuests \|\| pre.currSlots.numGuests,`
- L7319: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L7320: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L7321: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L7325: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L7326: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`

### 7481-7730

- L7534: `const correctionDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7538: `numGuests: correctionTurnSlots.numGuests \|\| correctionGuestCount \|\| currentPreviewSnapshot.numGuests,`
- L7539: `checkIn: correctionDates.checkIn \|\| currentPreviewSnapshot.checkIn,`
- L7540: `checkOut: correctionDates.checkOut \|\| currentPreviewSnapshot.checkOut,`
- L7546: `String(updatedPreviewSnapshot.numGuests \|\| "") !== String(currentPreviewSnapshot.numGuests \|\| "") \|\|`
- L7547: `String(updatedPreviewSnapshot.checkIn \|\| "") !== String(currentPreviewSnapshot.checkIn \|\| "") \|\|`
- L7548: `String(updatedPreviewSnapshot.checkOut \|\| "") !== String(currentPreviewSnapshot.checkOut \|\| "");`
- L7680: `const earlyModifyDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7681: `const earlyModifySideIntent = detectModifyTemporalSideIntent(userTxtRaw, earlyModifyDates);`
- L7684: `(earlyModifyDates.checkIn \|\| earlyModifyDates.checkOut) &&`
- L7712: `earlyModifySideIntent === "checkIn" ? "checkOut" : "checkIn"`

### 7731-7980

- L7739: `const reservationCheckIn = nextSlots.checkIn \|\| pre.currSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L7740: `const reservationCheckOut = nextSlots.checkOut \|\| pre.currSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L7741: `const reservationGuests = nextSlots.numGuests \|\| pre.currSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests;`
- L7748: `const createDraftTemporalDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7753: `turnCreateSlots.checkIn \|\|`
- L7754: `turnCreateSlots.checkOut \|\|`
- L7756: `turnCreateSlots.numGuests \|\|`
- L7758: `createDraftTemporalDates.checkIn \|\|`
- L7759: `createDraftTemporalDates.checkOut \|\|`
- L7760: `createDraftRawOrderedDates?.checkIn \|\|`
- L7761: `createDraftRawOrderedDates?.checkOut \|\|`
- L7762: `createDraftRelativeWeekendRange.checkIn \|\|`
- L7763: `createDraftRelativeWeekendRange.checkOut`
- L7765: `const createDraftCheckIn =`
- L7766: `reservationCheckIn \|\|`
- L7767: `createDraftTemporalDates.checkIn \|\|`
- L7768: `createDraftRawOrderedDates?.checkIn \|\|`
- L7769: `createDraftRelativeWeekendRange.checkIn;`
- L7770: `const createDraftCheckOut =`
- L7771: `reservationCheckOut \|\|`
- L7772: `createDraftTemporalDates.checkOut \|\|`
- L7773: `createDraftRawOrderedDates?.checkOut \|\|`
- L7774: `createDraftRelativeWeekendRange.checkOut;`
- L7778: `Boolean(turnCreateSlots.checkIn && turnCreateSlots.checkOut) &&`
- L7779: `Boolean(turnCreateSlots.roomType \|\| turnCreateSlots.numGuests \|\| isSafeGuestName(turnCreateSlots.guestName \|\| ""));`
- L7782: `const explicitTurnDateCoherence = assessReservationDateCoherence(rawOrderedDateRange?.checkIn, rawOrderedDateRange?.checkOut);`
- L7783: `const reservationDateCoherence = assessReservationDateCoherence(reservationCheckIn, reservationCheckOut);`
- L7785: `pre.currSlots.checkIn !== pre.prevSlotsStrict?.checkIn \|\|`
- L7786: `pre.currSlots.checkOut !== pre.prevSlotsStrict?.checkOut \|\|`
- L7787: `Boolean(extractDateRangeFromText(userTxtRaw).checkIn \|\| extractDateRangeFromText(userTxtRaw).checkOut);`
- L7827: `reservationCheckIn &&`
- L7828: `reservationCheckOut &&`
- L7837: `checkIn: reservationCheckIn,`
- L7838: `checkOut: reservationCheckOut,`
- L7839: `numGuests: String(reservationGuests),`
- L7912: `numGuests: confirmedSnapshotFallback.slots.numGuests,`
- L7913: `checkIn: confirmedSnapshotFallback.slots.checkIn,`
- L7914: `checkOut: confirmedSnapshotFallback.slots.checkOut,`
- L7952: `numGuests: target.numGuests,`
- L7953: `checkIn: target.checkIn,`

### 7981-8230

- L8007: `numGuests: target.numGuests,`
- L8008: `checkIn: target.checkIn,`
- L8009: `checkOut: target.checkOut,`
- L8049: `numGuests: target.numGuests,`
- L8050: `checkIn: target.checkIn,`
- L8051: `checkOut: target.checkOut,`
- L8090: `const mentionsModifyDatesField = /\b(fechas\|fecha\|dates\|date\|datas\|data\|check-in\|check out\|check-out\|entrada\|salida\|ingreso)\b/i.test(normalizedUserTxtForModify);`
- L8092: `const mentionsModifyGuestsField = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxtForModify);`
- L8109: `Boolean(rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut) \|\|`
- L8110: `Boolean(directModifyTurnSlots.numGuests) \|\|`
- L8113: `const directModifyUserDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L8114: `const directModifySideIntent = detectModifyTemporalSideIntent(userTxtRaw, directModifyUserDates);`
- L8115: `const hasTemporalModifySignal = hasModifyDatesEntrySignal(`
- L8128: `(hasExplicitModifyFieldRequest \|\| hasImmediateModifyValue \|\| hasTemporalModifySignal \|\| Boolean(explicitReservationCode))`
- L8162: `numGuests: pre.currSlots.numGuests \|\| nextSlots.numGuests \|\| target.numGuests,`
- L8163: `checkIn: pre.currSlots.checkIn \|\| nextSlots.checkIn \|\| target.checkIn,`
- L8164: `checkOut: pre.currSlots.checkOut \|\| nextSlots.checkOut \|\| target.checkOut,`
- L8183: `rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut ? "dates" : null,`
- L8184: `directModifyTurnSlots.numGuests ? "guests" : null,`
- L8192: `numGuests: pre.currSlots.numGuests \|\| nextSlots.numGuests \|\| target.numGuests,`
- L8193: `checkIn: pre.currSlots.checkIn \|\| nextSlots.checkIn \|\| target.checkIn,`
- L8194: `checkOut: pre.currSlots.checkOut \|\| nextSlots.checkOut \|\| target.checkOut,`

### 8231-8480

- L8234: `numGuests: directModifyTurnSlots.numGuests \|\| (reservationGuests ? String(reservationGuests) : undefined) \|\| target.numGuests,`
- L8235: `checkIn: rawOrderedDateRange?.checkIn \|\| reservationCheckIn \|\| target.checkIn,`
- L8236: `checkOut: rawOrderedDateRange?.checkOut \|\| reservationCheckOut \|\| target.checkOut,`
- L8239: `const modifyDateCoherence = assessReservationDateCoherence(snapshot.checkIn, snapshot.checkOut);`
- L8244: `const nextGuestCountNumber = Number.parseInt(String(snapshot.numGuests \|\| ""), 10);`
- L8281: `if (!hasImmediateModifyValue && hasTemporalModifySignal) {`
- L8286: `numGuests: reservationGuests \|\| target.numGuests,`
- L8287: `checkIn: reservationCheckIn \|\| target.checkIn,`
- L8288: `checkOut: reservationCheckOut \|\| target.checkOut,`
- L8301: `? buildAskMissingDate(pre.lang, directModifySideIntent === "checkIn" ? "checkOut" : "checkIn")`
- L8310: `numGuests: reservationGuests \|\| target.numGuests,`
- L8311: `checkIn: reservationCheckIn \|\| target.checkIn,`
- L8312: `checkOut: reservationCheckOut \|\| target.checkOut,`
- L8330: `numGuests: target?.numGuests,`
- L8331: `checkIn: target?.checkIn,`
- L8332: `checkOut: target?.checkOut,`
- L8352: `numGuests: target?.numGuests,`
- L8353: `checkIn: target?.checkIn,`
- L8354: `checkOut: target?.checkOut,`
- L8377: `const rawGuestCount = extractSlotsFromText(userTxtRaw, pre.lang).numGuests \|\| extractGuests(userTxtRaw);`
- L8386: `const hasExplicitDateRange = Boolean(rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut);`
- L8390: `const baseGuests = reservationGuests \|\| baseModifyTarget?.numGuests;`
- L8391: `const baseCheckIn = baseModifyTarget?.checkIn \|\| reservationCheckIn;`
- L8392: `const baseCheckOut = baseModifyTarget?.checkOut \|\| reservationCheckOut;`
- L8393: `const currentModifyCheckIn = nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn \|\| baseCheckIn;`
- L8394: `const currentModifyCheckOut = nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut \|\| baseCheckOut;`
- L8395: `const nextCheckIn = hasExplicitDateRange ? rawOrderedDateRange?.checkIn : baseCheckIn;`
- L8396: `const nextCheckOut = hasExplicitDateRange ? rawOrderedDateRange?.checkOut : baseCheckOut;`
- L8397: `const modifyTemporalDatesRaw =`
- L8399: `? await extractSupportedTemporalDateRange(userTxtRaw, pre.lang)`
- L8401: `const modifyTemporalDates =`
- L8403: `? anchorModifyRelativeDateToContext(pre, userTxtRaw, modifyTemporalDatesRaw, nextSlots)`
- L8404: `: modifyTemporalDatesRaw;`
- L8410: `checkIn: nextCheckIn,`
- L8411: `checkOut: nextCheckOut,`
- L8414: `const modifySingleTemporalISO =`
- L8415: `modifyTemporalDates.checkIn \|\| modifyTemporalDates.checkOut;`
- L8418: `Boolean(currentModifyCheckIn && currentModifyCheckOut) &&`
- L8420: `Boolean(modifySingleTemporalISO) &&`
- L8425: `Boolean(modifySingleTemporalISO) &&`

### 8481-8730

- L8498: `const correctionSideIntent = detectModifyTemporalSideIntent(userTxtRaw, modifyTemporalDates) \|\| "checkOut";`
- L8499: `const correctionTemporalDates =`
- L8500: `correctionSideIntent === "checkOut"`
- L8501: `? anchorRelativeWeekdayToCheckOutAfterCheckIn(userTxtRaw, modifyTemporalDates, currentModifyCheckIn)`
- L8502: `: modifyTemporalDates;`
- L8503: `const correctedTemporalISO =`
- L8504: `correctionSideIntent === "checkIn"`
- L8505: `? (correctionTemporalDates.checkIn \|\| correctionTemporalDates.checkOut)`
- L8506: `: (correctionTemporalDates.checkOut \|\| correctionTemporalDates.checkIn);`
- L8507: `if (correctedTemporalISO) {`
- L8508: `const correctedDates = correctionSideIntent === "checkIn"`
- L8509: `? { checkIn: correctedTemporalISO, checkOut: currentModifyCheckOut }`
- L8510: `: { checkIn: currentModifyCheckIn, checkOut: correctedTemporalISO };`
- L8511: `const modifyDateCoherence = assessReservationDateCoherence(correctedDates.checkIn, correctedDates.checkOut);`
- L8521: `numGuests: baseGuests,`
- L8522: `checkIn: currentModifyCheckIn,`
- L8523: `checkOut: currentModifyCheckOut,`
- L8574: `numGuests: String(nextGuestCountNumber),`
- L8592: `numGuests: nextGuestCount,`
- L8611: `numGuests: nextGuestCount,`
- L8612: `checkIn: nextCheckIn,`
- L8613: `checkOut: nextCheckOut,`
- L8623: `nextSlots = { ...nextSlots, numGuests: nextGuestCount } as ReservationSlotsStrict;`
- L8655: `numGuests: baseGuests,`
- L8656: `checkIn: baseCheckIn,`
- L8657: `checkOut: baseCheckOut,`
- L8671: `if (activeModifyField === "dates" && hasExplicitDateRange && nextCheckIn && nextCheckOut) {`
- L8676: `const modifyDateCoherence = assessReservationDateCoherence(nextCheckIn, nextCheckOut);`
- L8685: `checkIn: nextCheckIn,`
- L8686: `checkOut: nextCheckOut,`
- L8705: `numGuests: baseGuests,`
- L8706: `checkIn: nextCheckIn,`
- L8707: `checkOut: nextCheckOut,`

### 8731-8980

- L8737: `checkIn: createDraftCheckIn,`
- L8738: `checkOut: createDraftCheckOut,`
- L8739: `numGuests: reservationGuests ? String(reservationGuests) : undefined,`
- L8769: `const hasCheckIn = Boolean(additionalReservationDraft.checkIn);`
- L8770: `const hasCheckOut = Boolean(additionalReservationDraft.checkOut);`
- L8771: `if (hasCheckIn && !hasCheckOut) {`
- L8773: `? 'Perfecto, mantenemos la reserva anterior y abrimos una nueva. ${buildAskMissingDate(pre.lang, "checkOut", "create")}'`
- L8775: `? 'Perfeito, mantemos a reserva anterior e abrimos uma nova. ${buildAskMissingDate(pre.lang, "checkOut", "create")}'`
- L8776: `: 'Perfect, we will keep the previous booking and open a new one. ${buildAskMissingDate(pre.lang, "checkOut", "create")}';`
- L8779: `if (!hasCheckIn && hasCheckOut) {`
- L8781: `? 'Perfecto, mantenemos la reserva anterior y abrimos una nueva. ${buildAskMissingDate(pre.lang, "checkIn", "create")}'`
- L8783: `? 'Perfeito, mantemos a reserva anterior e abrimos uma nova. ${buildAskMissingDate(pre.lang, "checkIn", "create")}'`
- L8784: `: 'Perfect, we will keep the previous booking and open a new one. ${buildAskMissingDate(pre.lang, "checkIn", "create")}';`
- L8787: `if (hasCheckIn && hasCheckOut) {`
- L8800: `additionalReservationDraft.checkIn!,`
- L8801: `additionalReservationDraft.checkOut!,`
- L8853: `checkIn: reservationCheckIn,`
- L8854: `checkOut: reservationCheckOut,`
- L8855: `numGuests: reservationGuests ? String(reservationGuests) : undefined,`
- L8881: `const inquiryCheckIn = availabilityInquirySlots.checkIn;`
- L8882: `const inquiryCheckOut = availabilityInquirySlots.checkOut;`
- L8883: `if (inquiryCheckIn && inquiryCheckOut) {`
- L8884: `const inquiryDateCoherence = assessReservationDateCoherence(inquiryCheckIn, inquiryCheckOut);`
- L8889: `const availabilityResult = await runAvailabilityCheck(availabilityPre, availabilityInquirySlots, inquiryCheckIn, inquiryCheckOut, {`

### 8981-9230

- L8984: `createDraftTemporalDates.checkIn \|\|`
- L8985: `createDraftTemporalDates.checkOut \|\|`
- L8986: `createDraftRawOrderedDates?.checkIn \|\|`
- L8987: `createDraftRawOrderedDates?.checkOut \|\|`
- L8988: `createDraftRelativeWeekendRange.checkIn \|\|`
- L8989: `createDraftRelativeWeekendRange.checkOut \|\|`
- L8990: `(pre.currSlots.checkIn && pre.currSlots.checkIn !== pre.prevSlotsStrict?.checkIn) \|\|`
- L8991: `(pre.currSlots.checkOut && pre.currSlots.checkOut !== pre.prevSlotsStrict?.checkOut)`
- L8994: `createDraftConsistency.sanitizedSlots.checkIn &&`
- L8995: `createDraftConsistency.sanitizedSlots.checkOut &&`
- L8997: `createDraftConsistency.sanitizedSlots.numGuests &&`
- L9048: `Boolean(updatedHolderSnapshot.checkIn && updatedHolderSnapshot.checkOut && updatedHolderSnapshot.roomType && updatedHolderSnapshot.numGuests) &&`
- L9055: `updatedHolderSnapshot.checkIn!,`
- L9056: `updatedHolderSnapshot.checkOut!`
- L9110: `const readyCreateCheckIn = createDraftConsistency.sanitizedSlots.checkIn;`
- L9111: `const readyCreateCheckOut = createDraftConsistency.sanitizedSlots.checkOut;`
- L9112: `const readyCreateDateCoherence = assessReservationDateCoherence(readyCreateCheckIn, readyCreateCheckOut);`
- L9120: `readyCreateCheckIn!,`
- L9121: `readyCreateCheckOut!`
- L9201: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L9206: `const checkIn = firstWeekdayOnOrAfter(baseIso, startWeekday);`
- L9207: `const checkOut = checkIn ? firstWeekdayStrictlyAfter(checkIn, endWeekday) : undefined;`
- L9208: `return checkIn && checkOut ? { checkIn, checkOut } : {};`
- L9210: `const quotedTurnSupportedDates = await extractSupportedTemporalDateRange(trimmedQuotedReply, pre.lang);`
- L9215: `quotedTurnSupportedDates.checkIn && quotedTurnSupportedDates.checkOut`
- L9217: `: quotedTurnRelativeWeekendRange.checkIn && quotedTurnRelativeWeekendRange.checkOut`
- L9219: `: quotedTurnDirectWeekdayRange.checkIn && quotedTurnDirectWeekdayRange.checkOut`
- L9221: `: quotedTurnRelativeWeekdayRange.checkIn && quotedTurnRelativeWeekdayRange.checkOut`
- L9223: `: quotedTurnSupportedDates.checkIn \|\| quotedTurnSupportedDates.checkOut`

### 9231-9480

- L9240: `quotedTurnSlots.numGuests \|\|`
- L9241: `quotedTurnSupportedDates.checkIn \|\|`
- L9242: `quotedTurnSupportedDates.checkOut \|\|`
- L9243: `quotedTurnRelativeWeekendRange.checkIn \|\|`
- L9244: `quotedTurnRelativeWeekendRange.checkOut \|\|`
- L9245: `quotedTurnDirectWeekdayRange.checkIn \|\|`
- L9246: `quotedTurnDirectWeekdayRange.checkOut \|\|`
- L9247: `quotedTurnRelativeWeekdayRange.checkIn \|\|`
- L9248: `quotedTurnRelativeWeekdayRange.checkOut \|\|`
- L9249: `quotedTurnSingleRelativeDate.checkIn \|\|`
- L9250: `quotedTurnSingleRelativeDate.checkOut`
- L9253: `quotedTurnSupportedDates.checkIn \|\|`
- L9254: `quotedTurnSupportedDates.checkOut \|\|`
- L9255: `quotedTurnRelativeWeekendRange.checkIn \|\|`
- L9256: `quotedTurnRelativeWeekendRange.checkOut \|\|`
- L9257: `quotedTurnDirectWeekdayRange.checkIn \|\|`
- L9258: `quotedTurnDirectWeekdayRange.checkOut \|\|`
- L9259: `quotedTurnRelativeWeekdayRange.checkIn \|\|`
- L9260: `quotedTurnRelativeWeekdayRange.checkOut \|\|`
- L9261: `quotedTurnSingleRelativeDate.checkIn \|\|`
- L9262: `quotedTurnSingleRelativeDate.checkOut`
- L9293: `const requoteCheckIn = quotedDraftConsistency.sanitizedSlots.checkIn;`
- L9294: `const requoteCheckOut = quotedDraftConsistency.sanitizedSlots.checkOut;`
- L9295: `if (hasQuotedProposalDateCorrection && requoteCheckIn && requoteCheckOut) {`
- L9296: `const requoteCoherence = assessReservationDateCoherence(requoteCheckIn, requoteCheckOut);`
- L9304: `requoteCheckIn,`
- L9305: `requoteCheckOut`
- L9342: `createDraftConsistency.sanitizedSlots.checkIn \|\|`
- L9343: `createDraftConsistency.sanitizedSlots.checkOut \|\|`
- L9344: `createDraftConsistency.sanitizedSlots.numGuests \|\|`
- L9360: `turnExtractedCreateSlots.checkIn \|\|`
- L9361: `turnExtractedCreateSlots.checkOut \|\|`
- L9363: `turnExtractedCreateSlots.numGuests \|\|`
- L9412: `reservationCheckIn &&`
- L9413: `reservationCheckOut &&`
- L9421: `checkIn: reservationCheckIn,`
- L9422: `checkOut: reservationCheckOut,`
- L9423: `numGuests: String(reservationGuests),`
- L9459: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L9460: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`

### 9481-9730

- L9529: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L9530: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L9531: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L9535: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L9536: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L9597: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L9598: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L9599: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L9655: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L9656: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L9657: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L9719: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L9720: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L9721: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`

### 9731-9980

- L9777: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L9778: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L9779: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L9833: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L9834: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L9835: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L9879: `const hasGuests = Boolean(pre.currSlots?.numGuests \|\| pre.st?.reservationSlots?.numGuests);`
- L9885: `(pre.currSlots?.checkIn \|\| pre.st?.reservationSlots?.checkIn) &&`
- L9886: `(pre.currSlots?.checkOut \|\| pre.st?.reservationSlots?.checkOut) &&`
- L9887: `(pre.currSlots?.numGuests \|\| pre.st?.reservationSlots?.numGuests) &&`
- L9890: `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;`
- L9975: `checkIn: cancelledReservation.checkIn,`
- L9976: `checkOut: cancelledReservation.checkOut,`
- L9977: `numGuests: cancelledReservation.numGuests,`

### 9981-10230

- L10116: `checkIn: cancelledReservation.checkIn,`
- L10117: `checkOut: cancelledReservation.checkOut,`
- L10118: `numGuests: cancelledReservation.numGuests,`
- L10167: `const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);`
- L10168: `const time = offeredTimeSide === "checkin" ? confCheckIn : confCheckOut;`
- L10171: `? (offeredTimeSide === "checkin" ? 'El check-in comienza a las ${time}.' : 'El check-out es hasta las ${time}.')`
- L10173: `? (offeredTimeSide === "checkin" ? 'O check-in começa às ${time}.' : 'O check-out vai até ${time}.')`
- L10174: `: (offeredTimeSide === "checkin" ? 'Check-in starts at ${time}.' : 'Check-out is until ${time}.');`
- L10175: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`
- L10183: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`
- L10192: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`

### 10231-10480

- L10310: `numGuests: nextSlots.numGuests \|\| currentPreviewSnapshot.numGuests,`
- L10311: `checkIn: nextSlots.checkIn \|\| currentPreviewSnapshot.checkIn,`
- L10312: `checkOut: nextSlots.checkOut \|\| currentPreviewSnapshot.checkOut,`
- L10318: `String(updatedPreviewSnapshot.numGuests \|\| "") !== String(currentPreviewSnapshot.numGuests \|\| "") \|\|`
- L10319: `String(updatedPreviewSnapshot.checkIn \|\| "") !== String(currentPreviewSnapshot.checkIn \|\| "") \|\|`
- L10320: `String(updatedPreviewSnapshot.checkOut \|\| "") !== String(currentPreviewSnapshot.checkOut \|\| "");`
- L10397: `const ci = nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L10398: `const co = nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L10400: `const ng = nextSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests;`
- L10434: `numGuests: ng,`
- L10435: `checkIn: ci,`
- L10436: `checkOut: co,`
- L10480: `numGuests: ng,`

### 10481-10730

- L10481: `checkIn: ci,`
- L10482: `checkOut: co,`
- L10544: `if (!snapshot.roomType \|\| !snapshot.checkIn \|\| !snapshot.checkOut) {`
- L10545: `finalText = buildAskMissingDate(pre.lang, !snapshot.checkIn ? "checkIn" : "checkOut");`
- L10548: `const createDateCoherence = assessReservationDateCoherence(snapshot.checkIn, snapshot.checkOut);`
- L10566: `checkIn: snapshot.checkIn,`
- L10567: `checkOut: snapshot.checkOut,`
- L10568: `numGuests: snapshot.numGuests,`
- L10591: `checkIn: snapshot.checkIn,`
- L10592: `checkOut: snapshot.checkOut,`
- L10593: `numGuests: snapshot.numGuests,`
- L10612: `checkIn: canonicalRecordForReply.checkIn,`
- L10613: `checkOut: canonicalRecordForReply.checkOut,`
- L10614: `numGuests: canonicalRecordForReply.numGuests,`
- L10621: `? '✅ ¡Reserva confirmada! Código **${result.reservationId ?? "pendiente"}**.\nHabitación **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Fechas **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySn`
- L10623: `? '✅ Reserva confirmada! Código **${result.reservationId ?? "pendente"}**.\nQuarto **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Datas **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySnapshot.`
- L10624: `: '✅ Booking confirmed! Code **${result.reservationId ?? "pending"}**.\nRoom **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Dates **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySnapshot.numGue`
- L10674: `const postBookingLateCheckoutQ = detectLateCheckoutQuestion(kbUserText, pre.lang);`
- L10675: `const postBookingEarlyCheckinQ = detectEarlyCheckinQuestion(kbUserText, pre.lang);`
- L10676: `const postBookingTimeQ = detectCheckinOrCheckoutTimeQuestion(kbUserText, pre.lang);`
- L10719: `numGuests: target.numGuests,`
- L10720: `checkIn: target.checkIn,`
- L10721: `checkOut: target.checkOut,`

### 10731-10980

- L10795: `checkIn: canonicalRecord.checkIn,`
- L10796: `checkOut: canonicalRecord.checkOut,`
- L10797: `numGuests: canonicalRecord.numGuests,`
- L10809: `checkIn: persistedSlots.checkIn \|\| supplementalSlots.checkIn \|\| canonicalSlots.checkIn,`
- L10810: `checkOut: persistedSlots.checkOut \|\| supplementalSlots.checkOut \|\| canonicalSlots.checkOut,`
- L10811: `numGuests: canonicalSlots.numGuests \|\| persistedSlots.numGuests \|\| supplementalSlots.numGuests,`
- L10828: `if (postBookingLateCheckoutQ && hasConfirmedBookingContext) {`
- L10829: `finalText = buildLateCheckoutResponse(pre.lang, kbGuestState);`
- L10830: `nextCategory = "checkout_info";`
- L10833: `if (postBookingEarlyCheckinQ && hasConfirmedBookingContext) {`
- L10835: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L10836: `finalText = buildEarlyCheckinResponse(pre.lang, kbGuestState, {`
- L10837: `checkInTime: confCheckIn,`
- L10840: `nextCategory = "checkin_info";`
- L10846: `const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);`
- L10847: `const asksCheckOut = detectDateSideFromText(kbUserText) === "checkOut" \|\| /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(kbUserText);`
- L10848: `const time = asksCheckOut ? confCheckOut : confCheckIn;`
- L10851: `? (asksCheckOut ? 'El check-out es hasta las ${time}.' : 'El check-in comienza a las ${time}.')`
- L10853: `? (asksCheckOut ? 'O check-out vai até ${time}.' : 'O check-in começa às ${time}.')`
- L10854: `: (asksCheckOut ? 'Check-out is until ${time}.' : 'Check-in starts at ${time}.'))`
- L10860: `nextCategory = asksCheckOut ? "checkout_info" : "checkin_info";`
- L10868: `nextCategory = /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(kbUserText) ? "checkout_info" : "checkin_info";`

### 10981-11230

- L11076: `extractSlotsFromText(kbUserText, pre.lang).checkIn \|\|`
- L11077: `extractSlotsFromText(kbUserText, pre.lang).checkOut \|\|`
- L11079: `extractSlotsFromText(kbUserText, pre.lang).numGuests \|\|`
- L11081: `extractRawOrderedDateRange(kbUserText)?.checkIn`
- L11087: `nextCategory === "checkin_info" \|\|`
- L11088: `nextCategory === "checkout_info" \|\|`
- L11216: `if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {`
- L11217: `merged.numGuests = String((merged as any).numGuests);`

### 11231-11480

- L11377: `const noNewChangeData = !userDatesNow.checkIn && !userDatesNow.checkOut && !userMentionedSide && !userAffirmAfterVerify;`
- L11387: `const mentionsChangeDates = /\b(fechas\|fecha\|dates\|date\|datas\|data\|check-in\|check out\|check-out\|entrada\|salida\|ingreso)\b/i.test(normalizedUserTxt);`
- L11389: `const mentionsChangeGuests = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxt);`
- L11416: `const hasImmediateDateValue = Boolean(immediateDateRange?.checkIn && immediateDateRange?.checkOut);`
- L11417: `const hasImmediateGuestValue = Boolean(immediateTurnSlots.numGuests);`
- L11419: `const temporalUserDates = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L11420: `const temporalSideIntent = detectModifyTemporalSideIntent(userTxt, temporalUserDates);`
- L11421: `const hasTemporalModifySignal = hasModifyDatesEntrySignal(`
- L11422: `temporalSideIntent,`
- L11423: `temporalUserDates,`
- L11443: `hasTemporalModifySignal &&`
- L11447: `const partialModifySlots = buildModifyPartialDateSlots(knownSlots, temporalUserDates, temporalSideIntent);`
- L11460: `finalText = temporalSideIntent`
- L11461: `? buildAskMissingDate(pre.lang, temporalSideIntent === "checkIn" ? "checkOut" : "checkIn")`

### 11481-11730

- L11506: `if (activeField === "dates" && ingestedSlots.checkIn && ingestedSlots.checkOut) {`
- L11574: `const guestsFromText = extractSlotsFromText(String(pre.msg.content \|\| ""), pre.lang).numGuests;`
- L11578: `const prevGuestsVal = pre.prevSlotsStrict?.numGuests \|\| pre.st?.reservationSlots?.numGuests \|\| "";`
- L11580: `const haveDatesNow = Boolean((nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut));`
- L11585: `if (pre.inModifyMode && wantsGenericModify(String(pre.msg.content \|\| ""), pre.lang) && (nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut)) {`
- L11594: `numGuests: resolvedModifyTarget.numGuests,`
- L11595: `checkIn: resolvedModifyTarget.checkIn,`
- L11596: `checkOut: resolvedModifyTarget.checkOut,`
- L11617: `const userDates = await extractSupportedTemporalDateRange(String(pre.msg.content \|\| ""), pre.lang);`
- L11629: `const lateCheckoutQ = detectLateCheckoutQuestion(String(pre.msg.content \|\| ""), pre.lang);`
- L11630: `const earlyCheckinQ = detectEarlyCheckinQuestion(String(pre.msg.content \|\| ""), pre.lang);`
- L11632: `const timeQ = detectCheckinOrCheckoutTimeQuestion(String(pre.msg.content \|\| ""), pre.lang);`
- L11646: `const currentTurnCreateSlots = attributeSingleWordDateToPendingCreateCheckout(`
- L11653: `const shouldMergeCreateTemporalDates =`
- L11658: `const currentTurnCreateTemporalSlots = shouldMergeCreateTemporalDates`
- L11662: `checkIn: currentTurnCreateTemporalSlots.checkIn,`
- L11663: `checkOut: currentTurnCreateTemporalSlots.checkOut,`
- L11664: `roomType: currentTurnCreateTemporalSlots.roomType,`
- L11665: `numGuests: currentTurnCreateTemporalSlots.numGuests,`
- L11666: `guestName: currentTurnCreateTemporalSlots.guestName,`
- L11671: `currentTurnCreateTemporalSlots.checkIn &&`
- L11672: `currentTurnCreateTemporalSlots.checkOut &&`
- L11673: `currentTurnCreateTemporalSlots.roomType &&`
- L11674: `currentTurnCreateTemporalSlots.numGuests &&`
- L11675: `isSafeGuestName(currentTurnCreateTemporalSlots.guestName \|\| "")`
- L11679: `userDates.checkIn \|\|`
- L11680: `userDates.checkOut \|\|`
- L11681: `currentTurnCreateTemporalSlots.checkIn \|\|`
- L11682: `currentTurnCreateTemporalSlots.checkOut \|\|`
- L11683: `currentTurnRelativeWeekendRange.checkIn \|\|`
- L11684: `currentTurnRelativeWeekendRange.checkOut`
- L11698: `Boolean(currentTurnRelativeWeekendRange.checkIn && currentTurnRelativeWeekendRange.checkOut) \|\|`
- L11705: `currentTurnCreateTemporalSlots.checkIn &&`
- L11706: `currentTurnCreateTemporalSlots.checkOut &&`
- L11707: `currentTurnCreateTemporalSlots.roomType &&`
- L11708: `currentTurnCreateTemporalSlots.numGuests &&`
- L11709: `isSafeGuestName(currentTurnCreateTemporalSlots.guestName \|\| "")`
- L11714: `checkIn: currentTurnCreateTemporalSlots.checkIn,`
- L11715: `checkOut: currentTurnCreateTemporalSlots.checkOut,`
- L11716: `roomType: currentTurnCreateTemporalSlots.roomType,`

### 11731-11980

- L11731: `finalText = buildLateCheckoutResponse(pre.lang, guestState);`
- L11732: `nextCategory = "checkout_info";`
- L11734: `} else if (earlyCheckinQ) {`
- L11736: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L11737: `finalText = buildEarlyCheckinResponse(pre.lang, guestState, {`
- L11738: `checkInTime: confCheckIn,`
- L11741: `nextCategory = "checkin_info";`
- L11751: `const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);`
- L11752: `const asksCheckOut = detectDateSideFromText(String(pre.msg.content \|\| "")) === "checkOut" \|\| /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(String(pre.msg.content \|\| ""));`
- L11753: `const time = asksCheckOut ? confCheckOut : confCheckIn;`
- L11756: `? (asksCheckOut ? 'El check-out es hasta las ${time}.' : 'El check-in comienza a las ${time}.')`
- L11758: `? (asksCheckOut ? 'O check-out vai até ${time}.' : 'O check-in começa às ${time}.')`
- L11759: `: (asksCheckOut ? 'Check-out is until ${time}.' : 'Check-in starts at ${time}.');`
- L11767: `nextCategory = asksCheckOut ? "checkout_info" : "checkin_info";`
- L11775: `nextCategory = /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(String(pre.msg.content \|\| "")) ? "checkout_info" : "checkin_info";`
- L11784: `const modifyTemporalSideIntent = detectModifyTemporalSideIntent(String(pre.msg.content \|\| ""), userDates);`
- L11796: `Boolean(modifyTemporalSideIntent && (userDates.checkIn \|\| userDates.checkOut));`
- L11797: `if (shouldPersistPartialModifyDate && modifyTemporalSideIntent) {`
- L11805: `modifyTemporalSideIntent`
- L11823: `let preserveAskCheckIn: string \| null = null;`
- L11826: `if (modifyTemporalSideIntent && (userDates.checkIn \|\| userDates.checkOut)) {`
- L11829: `modifyTemporalSideIntent === "checkIn" ? "checkOut" : "checkIn"`
- L11833: `if (sideIntent === 'checkIn') preserveAskCheckIn = finalText; // preservar si luego se genera confirmación accidental`
- L11847: `prevSlots: { checkIn: pre.prevSlotsStrict?.checkIn, checkOut: pre.prevSlotsStrict?.checkOut },`
- L11850: `preserveAskCheckInPrompt: preserveAskCheckIn,`
- L11854: `const userModifiesCheckInWithoutDate = !userProvidedSomeDate && /modificar\s+.*check\s*-?in\|change\s+.*check-?in/i.test(String(pre.msg.content \|\| ''));`
- L11856: `if (!userModifiesCheckInWithoutDate && (isEmpty \|\| cons.finalText)) {`
- L11866: `// Salvaguarda adicional: si tras la consolidación tenemos un rango NUEVO (checkIn+checkOut)`
- L11871: `const prevCI = pre.prevSlotsStrict?.checkIn;`
- L11872: `const prevCO = pre.prevSlotsStrict?.checkOut;`
- L11873: `const newCI = nextSlots.checkIn;`
- L11874: `const newCO = nextSlots.checkOut;`
- L11875: `const createQuoteReadySlots = mergeReservationSlots(pre.st?.reservationSlots, currentTurnCreateTemporalSlots, nextSlots);`
- L11878: `Boolean(currentTurnRelativeWeekendRange.checkIn && currentTurnRelativeWeekendRange.checkOut) \|\|`
- L11942: `nextSlots.checkIn = ciISO; nextSlots.checkOut = coISO;`
- L11963: `const ciISO = pendingAvailabilityVerification?.checkIn \|\| proposed.checkIn \|\| nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L11964: `const coISO = pendingAvailabilityVerification?.checkOut \|\| proposed.checkOut \|\| nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L11966: `checkIn: ciISO,`
- L11967: `checkOut: coISO,`
- L11972: `checkIn: createQuoteSlots.checkIn,`

### 11981-12230

- L11994: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L12022: `numGuests: modifyTarget.numGuests \|\| nextSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests,`
- L12023: `checkIn: ciISO,`
- L12024: `checkOut: coISO,`
- L12045: `checkIn: ciISO,`
- L12046: `checkOut: coISO,`
- L12081: `const missing = !ciISO ? "checkIn" : !coISO ? "checkOut" : undefined;`
- L12099: `const ciISO = proposed.checkIn \|\| nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L12100: `const coISO = proposed.checkOut \|\| nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L12102: `checkIn: ciISO,`
- L12103: `checkOut: coISO,`
- L12108: `checkIn: createQuoteSlots.checkIn,`
- L12109: `checkOut: createQuoteSlots.checkOut,`
- L12111: `numGuests: createQuoteSlots.numGuests,`
- L12130: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L12167: `const missing = !ciISO ? "checkIn" : "checkOut";`
- L12176: `: "I had an issue checking availability. Could you try again?";`
- L12210: `focusTurnExtractedSlots.checkIn \|\|`
- L12211: `focusTurnExtractedSlots.checkOut \|\|`
- L12213: `focusTurnExtractedSlots.numGuests \|\|`
- L12215: `extractRawOrderedDateRange(String(pre.msg.content \|\| ""))?.checkIn`

### 12231-12340

- L12279: `quotedReservationSnapshot.checkIn &&`
- L12280: `quotedReservationSnapshot.checkOut &&`
- L12281: `quotedReservationSnapshot.numGuests &&`
- L12290: `quotedReservationSnapshot.checkIn &&`
- L12291: `quotedReservationSnapshot.checkOut &&`
- L12292: `quotedReservationSnapshot.numGuests &&`
