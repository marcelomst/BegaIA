# bodyLLM internal scan

Archivo: `lib/handlers/messageHandler.ts`  
Rango analizado: L5148-L11813
Tamaño estimado: 6666 líneas
Bucket size: 250

> Scan estático readonly. Sirve para mapear densidad interna de `bodyLLM`, no para modificar código.

---

## 1. Buckets internos de bodyLLM

| Rango | Top markers | returns | awaits | decisions | temporal/check markers |
| --- | --- | ---: | ---: | ---: | ---: |
| 5148-5397 | `date/temporal:117`, `structured analyze:45`, `create:43`, `reservationSlots:19`, `graph/classifier/policy:19`, `state/result:18`, `faq/policies/amenities:14`, `reply builders:12` | 5 | 3 | 13 | 37 |
| 5398-5647 | `modify:58`, `date/temporal:58`, `reservationSlots:53`, `create:43`, `availability:28`, `state/result:27`, `graph/classifier/policy:18`, `reply builders:16` | 10 | 10 | 16 | 18 |
| 5648-5897 | `date/temporal:97`, `create:71`, `reservationSlots:51`, `state/result:34`, `availability:29`, `graph/classifier/policy:13`, `reply builders:9`, `modify:7` | 5 | 7 | 17 | 60 |
| 5898-6147 | `create:69`, `date/temporal:56`, `reservationSlots:45`, `state/result:35`, `modify:27`, `reply builders:17`, `email/whatsapp copy:13`, `early return:10` | 10 | 12 | 19 | 18 |
| 6148-6397 | `modify:101`, `date/temporal:81`, `reservationSlots:38`, `state/result:26`, `reply builders:18`, `selected target:15`, `create:11`, `conversationFocus:10` | 8 | 7 | 12 | 13 |
| 6398-6647 | `email/whatsapp copy:106`, `reservationSlots:84`, `date/temporal:52`, `modify:40`, `selected target:34`, `state/result:31`, `reply builders:17`, `graph/classifier/policy:11` | 9 | 17 | 21 | 19 |
| 6648-6897 | `modify:66`, `date/temporal:46`, `snapshot/verify:45`, `email/whatsapp copy:45`, `reservationSlots:31`, `structured analyze:19`, `selected target:17`, `graph/classifier/policy:14` | 11 | 12 | 11 | 7 |
| 6898-7147 | `date/temporal:129`, `reservationSlots:69`, `modify:54`, `create:38`, `state/result:25`, `reply builders:19`, `snapshot/verify:16`, `structured analyze:14` | 7 | 6 | 9 | 39 |
| 7148-7397 | `modify:73`, `date/temporal:57`, `snapshot/verify:51`, `reservationSlots:34`, `selected target:28`, `reply builders:23`, `email/whatsapp copy:14`, `structured analyze:13` | 8 | 8 | 11 | 20 |
| 7398-7647 | `date/temporal:148`, `modify:126`, `reservationSlots:117`, `selected target:32`, `reply builders:26`, `state/result:24`, `email/whatsapp copy:11`, `conversationFocus:10` | 9 | 8 | 10 | 43 |
| 7648-7897 | `modify:129`, `date/temporal:112`, `reservationSlots:91`, `reply builders:34`, `state/result:32`, `early return:15`, `email/whatsapp copy:15`, `graph/classifier/policy:15` | 15 | 9 | 17 | 36 |
| 7898-8147 | `date/temporal:79`, `availability:58`, `reservationSlots:50`, `modify:38`, `reply builders:38`, `create:33`, `state/result:27`, `graph/classifier/policy:20` | 15 | 9 | 17 | 31 |
| 8148-8397 | `create:203`, `date/temporal:202`, `reservationSlots:37`, `reply builders:33`, `confirm:18`, `state/result:16`, `early return:9`, `modify:7` | 9 | 5 | 10 | 47 |
| 8398-8647 | `create:97`, `email/whatsapp copy:60`, `reservationSlots:50`, `date/temporal:40`, `state/result:21`, `reply builders:17`, `early return:13`, `graph/classifier/policy:11` | 13 | 12 | 17 | 22 |
| 8648-8897 | `email/whatsapp copy:194`, `reservationSlots:86`, `state/result:38`, `date/temporal:36`, `snapshot/verify:13`, `early return:12`, `graph/classifier/policy:10`, `confirm:1` | 11 | 27 | 29 | 14 |
| 8898-9147 | `email/whatsapp copy:112`, `reservationSlots:78`, `cancel:55`, `date/temporal:33`, `state/result:30`, `confirm:20`, `snapshot/verify:17`, `create:15` | 8 | 22 | 17 | 14 |
| 9148-9397 | `cancel:50`, `create:46`, `date/temporal:40`, `confirm:35`, `reservationSlots:28`, `reply builders:24`, `modify:19`, `email/whatsapp copy:18` | 16 | 12 | 19 | 11 |
| 9398-9647 | `reservationSlots:83`, `date/temporal:67`, `modify:56`, `snapshot/verify:55`, `state/result:31`, `create:24`, `reply builders:22`, `early return:21` | 21 | 14 | 21 | 18 |
| 9648-9897 | `reservationSlots:71`, `date/temporal:70`, `snapshot/verify:61`, `reply builders:41`, `canonical state:29`, `state/result:24`, `confirm:24`, `create:17` | 10 | 4 | 10 | 37 |
| 9898-10147 | `reply builders:35`, `billing:34`, `reservationSlots:24`, `graph/classifier/policy:23`, `state/result:14`, `create:14`, `email/whatsapp copy:13`, `fallback:11` | 6 | 8 | 12 | 6 |
| 10148-10397 | `reservationSlots:45`, `graph/classifier/policy:42`, `fallback:32`, `date/temporal:31`, `state/result:29`, `reply builders:24`, `create:23`, `modify:17` | 0 | 6 | 12 | 7 |
| 10398-10647 | `date/temporal:150`, `modify:110`, `reservationSlots:49`, `reply builders:22`, `state/result:18`, `create:17`, `email/whatsapp copy:13`, `selected target:10` | 5 | 7 | 11 | 29 |
| 10648-10897 | `date/temporal:183`, `create:66`, `reservationSlots:33`, `modify:28`, `confirm:17`, `state/result:14`, `reply builders:14`, `structured analyze:12` | 6 | 4 | 22 | 60 |
| 10898-11147 | `create:107`, `date/temporal:84`, `reservationSlots:74`, `availability:35`, `modify:32`, `state/result:29`, `reply builders:17`, `email/whatsapp copy:13` | 9 | 9 | 24 | 24 |
| 11148-11397 | `create:45`, `reservationSlots:27`, `reply builders:21`, `snapshot/verify:20`, `date/temporal:18`, `billing:12`, `modify:10`, `faq/policies/amenities:10` | 7 | 6 | 19 | 11 |
| 11398-11647 | `billing:55`, `early return:47`, `confirm:40`, `date/temporal:22`, `email/whatsapp copy:20`, `create:18`, `structured analyze:17`, `modify:13` | 47 | 1 | 43 | 2 |
| 11648-11813 | `reservationSlots:52`, `date/temporal:44`, `early return:20`, `email/whatsapp copy:20`, `state/result:8`, `reply builders:7`, `modify:6`, `confirm:4` | 20 | 0 | 13 | 13 |

---

## 2. Diagrama tentativo por buckets

```mermaid
flowchart TD
  B0["5148-5397<br/>date/temporal<br/>structured analyze<br/>create"]
  B1["5398-5647<br/>modify<br/>date/temporal<br/>reservationSlots"]
  B2["5648-5897<br/>date/temporal<br/>create<br/>reservationSlots"]
  B3["5898-6147<br/>create<br/>date/temporal<br/>reservationSlots"]
  B4["6148-6397<br/>modify<br/>date/temporal<br/>reservationSlots"]
  B5["6398-6647<br/>email/whatsapp copy<br/>reservationSlots<br/>date/temporal"]
  B6["6648-6897<br/>modify<br/>date/temporal<br/>snapshot/verify"]
  B7["6898-7147<br/>date/temporal<br/>reservationSlots<br/>modify"]
  B8["7148-7397<br/>modify<br/>date/temporal<br/>snapshot/verify"]
  B9["7398-7647<br/>date/temporal<br/>modify<br/>reservationSlots"]
  B10["7648-7897<br/>modify<br/>date/temporal<br/>reservationSlots"]
  B11["7898-8147<br/>date/temporal<br/>availability<br/>reservationSlots"]
  B12["8148-8397<br/>create<br/>date/temporal<br/>reservationSlots"]
  B13["8398-8647<br/>create<br/>email/whatsapp copy<br/>reservationSlots"]
  B14["8648-8897<br/>email/whatsapp copy<br/>reservationSlots<br/>state/result"]
  B15["8898-9147<br/>email/whatsapp copy<br/>reservationSlots<br/>cancel"]
  B16["9148-9397<br/>cancel<br/>create<br/>date/temporal"]
  B17["9398-9647<br/>reservationSlots<br/>date/temporal<br/>modify"]
  B18["9648-9897<br/>reservationSlots<br/>date/temporal<br/>snapshot/verify"]
  B19["9898-10147<br/>reply builders<br/>billing<br/>reservationSlots"]
  B20["10148-10397<br/>reservationSlots<br/>graph/classifier/policy<br/>fallback"]
  B21["10398-10647<br/>date/temporal<br/>modify<br/>reservationSlots"]
  B22["10648-10897<br/>date/temporal<br/>create<br/>reservationSlots"]
  B23["10898-11147<br/>create<br/>date/temporal<br/>reservationSlots"]
  B24["11148-11397<br/>create<br/>reservationSlots<br/>reply builders"]
  B25["11398-11647<br/>billing<br/>early return<br/>confirm"]
  B26["11648-11813<br/>reservationSlots<br/>date/temporal<br/>early return"]

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

### 5148-5397

- L5249: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5276: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5293: `return {`
- L5304: `return {`
- L5325: `return {`

### 5398-5647

- L5400: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };`
- L5464: `return {`
- L5472: `return {`
- L5494: `return {`
- L5522: `return {`
- L5534: `return {`
- L5545: `return {`
- L5558: `return {`
- L5584: `return {`
- L5605: `return {`

### 5648-5897

- L5659: `return {`
- L5706: `return {`
- L5837: `return {`
- L5861: `return {`
- L5890: `return {`

### 5898-6147

- L5909: `return {`
- L5920: `return {`
- L5957: `return {`
- L5971: `return {`
- L6002: `return {`
- L6038: `return {`
- L6069: `return {`
- L6081: `return { finalText, nextCategory: modifyContextActiveFast ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };`
- L6114: `return {`
- L6125: `return {`

### 6148-6397

- L6162: `return {`
- L6175: `return {`
- L6201: `return {`
- L6236: `return { finalText, nextCategory: modifyContextActiveFast ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };`
- L6276: `return {`
- L6339: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult: null };`
- L6377: `return {`
- L6385: `return {`

### 6398-6647

- L6429: `return {`
- L6460: `return {`
- L6510: `return { finalText, nextCategory: "modify_reservation", nextSlots: knownSlots, needsSupervision, graphResult: null };`
- L6561: `return { finalText: finalTextWA, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: false, graphResult: null };`
- L6570: `return { finalText: failText, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: code && code !== 'WA_NOT_READY', graphResult: null };`
- L6580: `return { finalText: askNum, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: false, graphResult: null };`
- L6596: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6605: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6608: `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso; };`

### 6648-6897

- L6651: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6668: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6690: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6699: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L6815: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L6852: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L6865: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L6868: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L6873: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L6885: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L6889: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`

### 6898-7147

- L6902: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L6920: `return {`
- L6965: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7008: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7027: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7099: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7111: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`

### 7148-7397

- L7151: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7175: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7184: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7258: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7297: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7325: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L7341: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7391: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 7398-7647

- L7408: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7456: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7471: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7489: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L7494: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L7507: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7532: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7544: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7586: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 7648-7897

- L7717: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7723: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7743: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7774: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7780: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7786: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7792: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7814: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7835: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7849: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7853: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7859: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7879: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7893: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7897: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 7898-8147

- L7903: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7908: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7929: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7943: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7949: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L7957: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L8006: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8014: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8024: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8052: `return {`
- L8066: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8101: `return {`
- L8116: `return { finalText, nextCategory: "availability_inquiry", nextSlots, needsSupervision, graphResult };`
- L8140: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L8145: `return {`

### 8148-8397

- L8200: `return {`
- L8250: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8280: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision: needsSupervision \|\| readyCreateResult.needsHandoff, graphResult };`
- L8296: `return { finalText, nextCategory: "reservation", nextSlots: pausedDraft, needsSupervision, graphResult };`
- L8301: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8310: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8336: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L8339: `if (typeof startWeekday !== "number" \|\| typeof endWeekday !== "number") return {};`
- L8343: `return checkIn && checkOut ? { checkIn, checkOut } : {};`

### 8398-8647

- L8405: `return {`
- L8419: `return {`
- L8434: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8464: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L8485: `return {`
- L8515: `return {`
- L8533: `return {`
- L8570: `return { finalText: buildAskGuestName(pre.lang), nextCategory, nextSlots, needsSupervision, graphResult };`
- L8584: `return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };`
- L8587: `if (!iso) return iso;`
- L8588: `const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L8617: `return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };`
- L8634: `return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`

### 8648-8897

- L8655: `return { finalText: ask, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L8658: `if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L8685: `return { finalText: ok, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L8701: `return { finalText: fail, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };`
- L8760: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8772: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8781: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8816: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8828: `return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };`
- L8881: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L8893: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`

### 8898-9147

- L8903: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L8938: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L8950: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L8995: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9007: `return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };`
- L9069: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9115: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9128: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`

### 9148-9397

- L9163: `return { finalText, nextCategory: "cancel_reservation", nextSlots: {}, needsSupervision, graphResult };`
- L9168: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9179: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9199: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9244: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9257: `return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };`
- L9284: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9292: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9304: `return {`
- L9322: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9337: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9349: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9355: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9358: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9378: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L9394: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 9398-9647

- L9428: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9441: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L9444: `return { finalText, nextCategory: "modify_reservation", nextSlots: updatedPreviewSnapshot, needsSupervision, graphResult };`
- L9449: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L9461: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L9465: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L9478: `return { finalText, nextCategory: "modify_reservation", nextSlots: currentPreviewSnapshot, needsSupervision, graphResult };`
- L9514: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9537: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9542: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9545: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9551: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9556: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9561: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9585: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L9589: `return { finalText, nextCategory: "modify_reservation", nextSlots: snapshot, needsSupervision, graphResult };`
- L9602: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L9614: `return {`
- L9627: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9632: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9637: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`

### 9648-9897

- L9718: `return {`
- L9732: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L9743: `return toBodyLLMResult(state);`
- L9777: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9786: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9836: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9841: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9851: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9871: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`
- L9879: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };`

### 9898-10147

- L9898: `return keys.some((k) => hay.includes(k));`
- L9997: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10022: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10050: `debugLog("[KB] fastpath return", { ok: kb.ok, safeCat, hasText: Boolean(text) });`
- L10102: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10130: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`

### 10148-10397

- sin returns detectados

### 10398-10647

- L10443: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10483: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10495: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10516: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L10542: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`

### 10648-10897

- L10712: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10721: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10747: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10755: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };`
- L10870: `if (!iso) return iso \|\| '';`
- L10872: `return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`

### 10898-11147

- L10911: `const [dd, mm, yyyy] = d.split(/[\/\-]/); return '${yyyy}-${mm}-${dd}';`
- L10962: `return {`
- L10976: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10985: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L10996: `return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };`
- L11063: `return {`
- L11098: `return {`
- L11112: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`
- L11119: `return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };`

### 11148-11397

- L11318: `return { finalText, nextCategory, nextSlots, needsSupervision, graphResult, rich };`
- L11323: `if (!raw) return raw;`
- L11342: `return out;`
- L11347: `if (!raw) return raw;`
- L11369: `return out;`
- L11383: `if (!asksAcceptance) return answer;`
- L11392: `if (!hit) return answer;`

### 11398-11647

- L11407: `if (!isNegative) return answer;`
- L11408: `return lang === "es"`
- L11416: `return lang === "es"`
- L11422: `return answer;`
- L11428: `if (!out) return out;`
- L11430: `if (hasQuestion) return out;`
- L11437: `return '${out}\n\n${followup}';`
- L11470: `return accepted`
- L11474: `if (asksCurrency) return 'Moedas habilitadas hoje: ${currencies.join(", ") \|\| "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e comprovantes?';`
- L11475: `if (asksInvoices) return 'Emitimos fatura: ${issuesInvoices ? "sim" : "por enquanto não"}.\nComprovantes: ${docs.join(", ") \|\| "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e moedas?';`
- L11476: `return 'Meios de pagamento habilitados: ${methods.join(", ") \|\| "(a confirmar)"}.\nMoedas habilitadas: ${currencies.join(", ") \|\| "(a confirmar)"}.\nGarantia com cartão: ${requiresCard ? "sim" : "não"`
- L11480: `return accepted`
- L11484: `if (asksCurrency) return 'Enabled currencies today: ${currencies.join(", ") \|\| "(to be confirmed)"}.\n\nDo you want details on payment methods and invoices?';`
- L11485: `if (asksInvoices) return 'Invoices issued: ${issuesInvoices ? "yes" : "currently disabled"}.\nInvoice documents: ${docs.join(", ") \|\| "(to be confirmed)"}.\n\nDo you want details on payment methods an`
- L11486: `return 'Enabled payment methods: ${methods.join(", ") \|\| "(to be confirmed)"}.\nEnabled currencies: ${currencies.join(", ") \|\| "(to be confirmed)"}.\nCard required for guarantee: ${requiresCard ? "yes`
- L11490: `return accepted`
- L11494: `if (asksCurrency) return 'Monedas habilitadas hoy: ${currencies.join(", ") \|\| "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y comprobantes?';`
- L11495: `if (asksInvoices) return 'Emitimos factura: ${issuesInvoices ? "sí" : "por el momento no"}.\nComprobantes: ${docs.join(", ") \|\| "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y monedas?';`
- L11496: `return 'Medios de pago habilitados: ${methods.join(", ") \|\| "(a confirmar)"}.\nMonedas habilitadas: ${currencies.join(", ") \|\| "(a confirmar)"}.\nTarjeta para garantía: ${requiresCard ? "sí" : "no"}.\`
- L11498: `if (lang === "pt") return "Posso te ajudar com pagamentos e faturamento. Quer que eu detalhe meios, moedas ou comprovantes?";`
- L11499: `if (lang === "en") return "I can help with payments and billing. Do you want details on methods, currencies, or invoices?";`
- L11500: `return "Puedo ayudarte con pagos y facturación. ¿Querés que te detalle medios, monedas o comprobantes?";`
- L11506: `if (!out) return out;`
- L11538: `return out;`
- L11543: `if (!out) return out;`

### 11648-11813

- L11648: `if (asksBeforePrice) return "Which booking would you like me to remind you of the price for?";`
- L11649: `if (asksConditionalAvailability) return "What change would you like to check? Tell me the room, dates, or number of guests so I can review availability.";`
- L11650: `return "Yes, you can modify an active booking. Tell me what change you want to check or which booking you want to review.";`
- L11675: `return [`
- L11688: `return [`
- L11700: `return [`
- L11714: `if (!target?.reservationId) return "";`
- L11725: `return [`
- L11732: `return [`
- L11738: `return [`
- L11749: `if (!t) return true;`
- L11755: `return re.test(t) \|\| hotelDemo.test(t);`
- L11765: `return normalized;`
- L11767: `return undefined;`
- L11771: `return candidates[0]?.toUpperCase();`
- L11774: `return lang === "es" ? "¿Me compartís el *código de reserva*?"`
- L11782: `return {`
- L11799: `return { matched: true, mode: 'explicit', inlinePhone: phoneInline?.[1] };`
- L11807: `return { matched: true, mode: 'light', inlinePhone: phoneInline?.[1] };`
- L11810: `return { matched: false };`


---

## 4. Awaits por bucket

### 5148-5397

- L5162: `const stableIntent = await runStableIntentsGuard({`
- L5228: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5259: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`

### 5398-5647

- L5454: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5473: `finalText: await persistModifyPreviewContext(pre, resolvedModifyTarget0, snapshot),`
- L5482: `await persistAvailabilityInquiry(pre, fastPathSlots);`
- L5502: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, dr0.checkIn, dr0.checkOut, {`
- L5511: `await persistAvailabilityInquiry(pre, nextSlots);`
- L5533: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L5544: `await persistCreateDraft(pre, fastPathSlots);`
- L5557: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L5575: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5613: `const supportedDrFastRaw = await extractSupportedTemporalDateRange(userTxtFast, pre.lang);`

### 5648-5897

- L5658: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L5669: `const readyCreateResult = await runAvailabilityCheck(`
- L5681: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5836: `await persistCreateDraftSnapshot(pre, sanitizedCreateSlots);`
- L5849: `await persistAvailabilityInquiry(pre, normalizedFastPathSlots);`
- L5870: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, ciISO, coISO, {`
- L5879: `await persistAvailabilityInquiry(pre, nextSlots);`

### 5898-6147

- L5908: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L5918: `await persistCreateDraft(pre, normalizedFastPathSlots);`
- L5929: `const readyCreateResult = await runAvailabilityCheck(`
- L5939: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L5970: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L5988: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6022: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6067: `await persistCreateDraftSnapshot(pre, sanitizedCreateSlots);`
- L6113: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L6124: `await persistCreateDraft(pre, fastPathSlots);`
- L6134: `const readyCreateResult = await runAvailabilityCheck(`
- L6144: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 6148-6397

- L6174: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, fastPathSlots);`
- L6192: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6213: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6263: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6315: `const userDatesFast = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L6367: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6386: `finalText: await persistModifyPreviewContext(pre, resolvedFastReservationTarget, snapshot),`

### 6398-6647

- L6406: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6455: `await persistModifyExecutionContext(pre, resolvedFastReservationTarget.reservationId, {`
- L6508: `await updateConversationState(pre.msg.hotelId, pre.conversationId, modifyMenuPatch as any);`
- L6528: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L6529: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L6530: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L6541: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L6543: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L6546: `const { redis } = await import('@/lib/services/redis');`
- L6549: `const ack = await redis.get('wa:ack:${requestId}');`
- L6551: `await new Promise(r => setTimeout(r, 120));`
- L6590: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { supervised: true, desiredAction: 'notify_reception', updatedBy: 'ai' } as any);`
- L6610: `const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');`
- L6625: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: lastEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L6633: `const { classifyEmailError } = await import('@/lib/email/classifyEmailError');`
- L6641: `if (attempt < 2 && !sent) await new Promise(r => setTimeout(r, 150));`
- L6645: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { lastEmailCopyAttempt: { to: lastEmail, failures: 0, updatedAt: new Date().toISOString(), lastErrorType: undefined }, lastCategory: `

### 6648-6897

- L6654: `const { classifyEmailError } = await import('@/lib/email/classifyEmailError');`
- L6662: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { supervised: true, desiredAction: 'notify_reception', lastEmailCopyAttempt: { to: lastEmail, failures: prevFailures, updatedAt: new `
- L6670: `await updateConversationState(pre.msg.hotelId, pre.conversationId, { lastEmailCopyAttempt: { to: lastEmail, failures: prevFailures, updatedAt: new Date().toISOString(), lastError: rawMsg, lastErrorTyp`
- L6759: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6809: `await persistModifyExecutionContext(pre, pendingModifyPatchEarly.reservationId, {`
- L6828: `const correctionDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L6845: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L6858: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L6867: `finalText = await persistModifyPreviewContext(pre, pendingTarget, updatedPreviewSnapshot);`
- L6878: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L6888: `finalText = await executeModifyReservationWithSnapshot(pre, pendingTarget.reservationId, currentPreviewSnapshot);`
- L6892: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 6898-7147

- L6944: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L6973: `const earlyModifyDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L6991: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7012: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7041: `const createDraftTemporalDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7126: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 7148-7397

- L7155: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7252: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7262: `const reservationListSource = await resolveReservationListSource(pre);`
- L7285: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7310: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7333: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7366: `const directModifyUserDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7395: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 7398-7647

- L7416: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7447: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7479: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7493: `finalText = await persistModifyPreviewContext(pre, target, snapshot);`
- L7497: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7520: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7554: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7628: `? await extractSupportedTemporalDateRange(userTxtRaw, pre.lang)`

### 7648-7897

- L7701: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7719: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, ingestedSlots);`
- L7758: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7776: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, correctedSlots);`
- L7799: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7824: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7851: `finalText = await persistModifyPreviewContext(pre, previewTarget, snapshot);`
- L7868: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7895: `finalText = await persistModifyPreviewContext(pre, previewTarget, snapshot);`

### 7898-8147

- L7918: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L7945: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, snapshot);`
- L7979: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8026: `const availabilityResult = await runAvailabilityCheck(`
- L8035: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8089: `await persistAvailabilityInquiry(pre, availabilityInquirySlots);`
- L8118: `const availabilityResult = await runAvailabilityCheck(availabilityPre, availabilityInquirySlots, inquiryCheckIn, inquiryCheckOut, {`
- L8127: `await persistAvailabilityInquiry(pre, nextSlots);`
- L8144: `await persistAvailabilityInquiry(pre, availabilityInquirySlots);`

### 8148-8397

- L8198: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L8252: `const readyCreateResult = await runAvailabilityCheck(`
- L8262: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8294: `await persistCreateDraft(pre, pausedDraft);`
- L8345: `const quotedTurnSupportedDates = await extractSupportedTemporalDateRange(trimmedQuotedReply, pre.lang);`

### 8398-8647

- L8403: `await persistCreateDraftSnapshot(pre, quotedDraftConsistency.sanitizedSlots);`
- L8415: `await persistCreateDraft(pre, quotedDraftConsistency.sanitizedSlots);`
- L8436: `const requoteResult = await runAvailabilityCheck(`
- L8446: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8467: `await persistCreateDraft(pre, quotedDraftConsistency.sanitizedSlots);`
- L8483: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L8513: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L8531: `await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);`
- L8552: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L8590: `const { sendReservationCopy } = await import("@/lib/email/sendReservationCopy");`
- L8605: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: email, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8608: `lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150));`

### 8648-8897

- L8660: `const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');`
- L8675: `await sendReservationCopy({ hotelId: pre.msg.hotelId, to: explicitEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8677: `} catch (err) { lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150)); }`
- L8726: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L8727: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8728: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8739: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jidInline, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8741: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jidInline, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L8745: `const { redis } = await import('@/lib/services/redis');`
- L8748: `const ack = await redis.get('wa:ack:${requestId}');`
- L8750: `await new Promise(r => setTimeout(r, 120));`
- L8784: `const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');`
- L8785: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8786: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8797: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8799: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L8802: `const { redis } = await import('@/lib/services/redis');`
- L8805: `const ack = await redis.get('wa:ack:${requestId}');`
- L8807: `await new Promise(r => setTimeout(r, 120));`
- L8848: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L8849: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8850: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8861: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jidInline, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8863: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jidInline, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L8866: `const { redis } = await import('@/lib/services/redis');`

### 8898-9147

- L8906: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L8907: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8908: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8919: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8921: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L8924: `const { redis } = await import('@/lib/services/redis');`
- L8927: `const ack = await redis.get('wa:ack:${requestId}');`
- L8929: `await new Promise(r => setTimeout(r, 120));`
- L8962: `const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");`
- L8963: `const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');`
- L8964: `const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');`
- L8975: `await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });`
- L8977: `const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });`
- L8980: `const { redis } = await import('@/lib/services/redis');`
- L8983: `const ack = await redis.get('wa:ack:${requestId}');`
- L8985: `await new Promise(r => setTimeout(r, 120));`
- L9056: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9073: `const { cancelReservation } = await import("@/lib/agents/reservations");`
- L9074: `const r = await cancelReservation(pre.msg.hotelId, pendingCancellation.reservationId);`
- L9081: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9118: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9146: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`

### 9148-9397

- L9170: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9182: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9202: `const { cancelReservation } = await import("@/lib/agents/reservations");`
- L9203: `const r = await cancelReservation(pre.msg.hotelId, resolvedCancelCode);`
- L9210: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9247: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9265: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L9302: `await persistCreateDraft(pre, createDraftSlots);`
- L9340: `await persistCreateDraft(pre, createDraftSlots);`
- L9353: `await persistCreateDraft(pre, createDraftSlots);`
- L9362: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9388: `await persistModifyExecutionContext(pre, pendingModifyPatch.reservationId, {`

### 9398-9647

- L9421: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L9434: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L9443: `finalText = await persistModifyPreviewContext(pre, pendingTarget, updatedPreviewSnapshot);`
- L9454: `await persistModifyExecutionContext(pre, pendingTarget.reservationId, {`
- L9464: `finalText = await executeModifyReservationWithSnapshot(pre, pendingTarget.reservationId, currentPreviewSnapshot);`
- L9468: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9516: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9574: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9588: `finalText = await persistModifyPreviewContext(pre, genericModifyTarget, snapshot);`
- L9592: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9612: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L9625: `await persistCreateDraft(pre, snapshot as ReservationSlotsStrict);`
- L9640: `const { confirmAndCreate } = await import("@/lib/agents/reservations");`
- L9641: `const result = await confirmAndCreate(pre.msg.hotelId, snapshot as any, pre.msg.channel);`

### 9648-9897

- L9673: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L9742: `if (await tryConversationalGuestNameCapture(pre, state)) {`
- L9844: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L9855: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`

### 9898-10147

- L9958: `const kbForced = await answerWithKnowledge({`
- L9967: `finalText = await harmonizeBillingCurrencyAnswer(finalText, kbUserText, pre.msg.hotelId, pre.lang);`
- L9973: `finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);`
- L10003: `finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);`
- L10031: `const kb = await answerWithKnowledge({`
- L10079: `await persistCreateLateralCategoryIfNeeded(pre, kbUserText, dominantTurnDomain, nextCategory);`
- L10114: `await persistCreateLateralCategoryIfNeeded(pre, kbUserText, dominantTurnDomain, nextCategory);`
- L10146: `graphResult = await withTimeout(`

### 10148-10397

- L10216: `const rbState = await retrievalBased({`
- L10247: `await tryBodyLLMStructuredEnrichment(pre, state);`
- L10263: `await tryBodyLLMStructuredFallback(pre, state);`
- L10298: `await persistCreateDraft(pre, createGatingSlots);`
- L10310: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10342: `await persistCreateLateralCategoryIfNeeded(pre, rawTurnText, dominantTurnDomain, nextCategory);`

### 10398-10647

- L10398: `const temporalUserDates = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L10427: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10467: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10491: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, previewTarget, ingestedSlots);`
- L10518: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10580: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10596: `const userDates = await extractSupportedTemporalDateRange(String(pre.msg.content \|\| ""), pre.lang);`

### 10648-10897

- L10714: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L10729: `const hotel = await getHotelConfigSafe(pre.msg.hotelId);`
- L10786: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L10819: `const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({`

### 10898-11147

- L10960: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L10974: `await persistCreateDraft(pre, createQuoteSlots);`
- L11006: `const previewResult = await buildModifyDatesPreviewWithAvailability(pre, modifyTarget, modifySnapshot);`
- L11019: `const res = await runAvailabilityCheck(availabilityPre, nextSlots, ciISO!, coISO!);`
- L11029: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11096: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L11110: `await persistCreateDraft(pre, createQuoteSlots);`
- L11121: `const res = await runAvailabilityCheck(availabilityPre, { ...nextSlots }, ciISO, coISO);`
- L11126: `await persistModifyExecutionContext(pre, modifyReservationId, {`

### 11148-11397

- L11174: `finalText = await harmonizeBillingCurrencyAnswer(`
- L11219: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11242: `await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);`
- L11248: `await persistCreateDraft(pre, quotedReservationSnapshot as ReservationSlotsStrict);`
- L11274: `await updateConversationState(pre.msg.hotelId, pre.conversationId, {`
- L11395: `const cfg = await getHotelConfig(hotelId);`

### 11398-11647

- L11446: `const cfg = await getHotelConfig(hotelId);`

### 11648-11813

- sin awaits detectados


---

## 5. Decisiones por bucket

### 5148-5397

- L5183: `if (stableIntent.matched && stableIntent.response && !shouldSuppressStableIntent) {`
- L5206: `if (`
- L5214: `if (continuation) finalText = '${String(finalText \|\| "").trim()} ${continuation}'.trim();`
- L5216: `if (shouldClearSelectedReservationTargetForCategory(nextCategory, null)) {`
- L5227: `if (!shouldPreserveModifyTarget) {`
- L5252: `if (`
- L5279: `if (rawCreateDateIssue) {`
- L5292: `if (!isNonReservationFollowup && rawCreateSubFlow === "create" && rawCreateIntent.kind !== "modify" && rawCreateIntent.kind !== "cancel" && hasExplicitCreateContext) {`
- L5302: `if (dominantTurnDomain.dominant === "pricing" && !dominantTurnDomain.hasReservation) {`
- L5323: `if (vagueWeekendReservationIntent) {`
- L5333: `// Fast-path 0: if the user provides an explicit full date range in the same message, confirm immediately`
- L5391: `if (dr0.checkIn && dr0.checkOut && !isEventLikeMessage && !hasCompleteRichCreatePayloadInTurn0) {`
- L5397: `if (dr0Coherence && !dr0Coherence.ok) {`

### 5398-5647

- L5433: `if (shouldBypassRichCreateFastPath \|\| shouldBypassRichModifyFastPath) {`
- L5437: `if (`
- L5452: `if (!fastModifyValidation.ok) {`
- L5453: `if (fastModifyValidation.nextField) {`
- L5480: `if (availabilityInquiryPolicy0) {`
- L5483: `if (inquiryMissingField) {`
- L5507: `if (!availabilityResult.needsHandoff) {`
- L5530: `if (fastPathSubFlow === "create") {`
- L5532: `if (!createDraftConsistency.valid) {`
- L5543: `if (missingField) {`
- L5554: `if (fastPathSubFlow === "modify") {`
- L5556: `if (previewTarget?.reservationId) {`
- L5574: `if (fastPathSubFlow === "modify") {`
- L5604: `if (ambiguousQuotedProposalConfirmationFast) {`
- L5638: `if (fastPathSubFlow === "create" && !explicitTurnSlotsFast.guestName) {`
- L5640: `if (safeLeadGuestName) explicitTurnSlotsFast.guestName = safeLeadGuestName;`

### 5648-5897

- L5652: `if (currentTurnReadyCreateFast) {`
- L5657: `if (!createDraftConsistency.valid) {`
- L5774: `if (hasOneDateOnly && hasContext && !shouldDeferSingleDateFastPath) {`
- L5775: `if (singleFastISO && reservationContextualMissingSideFast) {`
- L5785: `if (`
- L5793: `if (!normalizedFastPathSlots.numGuests) {`
- L5795: `if (explicitGuestCount) normalizedFastPathSlots.numGuests = explicitGuestCount;`
- L5798: `if (`
- L5810: `if (inheritedCheckOutCoherence && !inheritedCheckOutCoherence.ok) {`
- L5816: `if (`
- L5824: `if (isPastReservationDateISO(coISO) \|\| (checkOutCoherence && !checkOutCoherence.ok)) {`
- L5830: `if (!sanitizedCreateSlots.numGuests) {`
- L5832: `if (explicitGuestCount) sanitizedCreateSlots.numGuests = explicitGuestCount;`
- L5847: `if (availabilityInquiryPolicyFast) {`
- L5850: `if (inquiryMissingField) {`
- L5869: `if (ciISO && coISO) {`
- L5875: `if (!availabilityResult.needsHandoff) {`

### 5898-6147

- L5899: `if (fastPathSubFlow === "create") {`
- L5907: `if (!createDraftConsistency.valid) {`
- L5919: `if (missingField) {`
- L5928: `if (canAutoQuoteCreateFast && isCreateStateReadyForQuote(normalizedFastPathSlots) && ciISO && coISO) {`
- L5966: `if (ciISO && coISO) {`
- L5967: `if (fastPathSubFlow === "modify") {`
- L5969: `if (previewTarget?.reservationId) {`
- L5987: `if (fastPathSubFlow === "modify") {`
- L6011: `if (singleFastISO && fastPathSubFlow === "modify" && fastTemporalSideIntent) {`
- L6047: `if (`
- L6060: `if (`
- L6077: `if (drFast.checkIn && !explicitCheckOutFast && !isConfirmedBooking && isPastReservationCheckInISO(drFast.checkIn)) {`
- L6086: `if (last instanceof HumanMessage) {`
- L6088: `if (lastTxt.trim() === userTxtFast.trim()) hist.pop();`
- L6093: `if (prevISO && currISO) {`
- L6104: `if (fastPathSubFlow === "create") {`
- L6112: `if (!createDraftConsistency.valid) {`
- L6123: `if (missingField) {`
- L6133: `if (canAutoQuoteCreateFast) {`

### 6148-6397

- L6171: `if (fastPathSubFlow === "modify") {`
- L6173: `if (previewTarget?.reservationId) {`
- L6191: `if (fastPathSubFlow === "modify") {`
- L6212: `if (modifyContextActiveFast) {`
- L6242: `if (`
- L6259: `if (hasValueForQueuedField) {`
- L6262: `if (nextQueuedModifyState) {`
- L6337: `if (genericModify && (resolutionFast.status === "ambiguous" \|\| resolutionFast.status === "out_of_range")) {`
- L6349: `if (`
- L6365: `if (!fastInlineValidation.ok) {`
- L6366: `if (fastInlineValidation.nextField) {`
- L6393: `if (`

### 6398-6647

- L6405: `if (activeFieldFast) {`
- L6438: `if (`
- L6477: `if (canOpenModifyMenu) {`
- L6500: `if (resolvedFastReservationTarget?.reservationId) {`
- L6514: `if (pre.prevCategory === 'send_email_copy') {`
- L6518: `if (wantsWhatsApp) {`
- L6521: `if (phoneMatchWA) {`
- L6524: `if (norm.normalized) {`
- L6540: `if (isWhatsAppReady()) {`
- L6544: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L6545: `if (requestId) {`
- L6550: `if (ack) break;`
- L6588: `if (wantsEscalate) {`
- L6598: `if (emailInMsg \|\| wantsRetry) {`
- L6599: `if (!lastEmail) {`
- L6608: `const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso; };`
- L6620: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L6621: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L6636: `if (cLoop.isNotConfigured \|\| cLoop.isQuota) {`
- L6641: `if (attempt < 2 && !sent) await new Promise(r => setTimeout(r, 150));`
- L6644: `if (sent) {`

### 6648-6897

- L6660: `if (prevFailures >= escalationThreshold) {`
- L6671: `if (isNotConfigured) {`
- L6677: `} else if (isQuota) {`
- L6758: `if (looksNonReservationDomainTurn && pre.st?.selectedReservationTarget && !shouldPreserveReservationSelectionForOverride) {`
- L6806: `if (awaitingModifyPreviewConfirmationEarly && pendingModifyPatchEarly?.reservationId) {`
- L6808: `if (!pendingTarget?.reservationId \|\| pendingTarget.reservationStatus === "cancelled" \|\| pendingTarget.reservationStatus === "error") {`
- L6844: `if (previewReject) {`
- L6855: `if (hasPreviewCorrections && !previewConfirm) {`
- L6857: `if (!previewValidation.ok) {`
- L6871: `if (!previewConfirm) {`
- L6877: `if (!previewValidation.ok) {`

### 6898-7147

- L6913: `if (`
- L6928: `if (`
- L6967: `if (`
- L6975: `if (`
- L7011: `if (explicitModifyExit) {`
- L7090: `if (`
- L7101: `if (`
- L7114: `if (`
- L7145: `if (`

### 7148-7397

- L7153: `if (ambiguousReservationAction) {`
- L7154: `if (ambiguousReservationAction === "modify") {`
- L7177: `if (`
- L7221: `if (`
- L7236: `if (targetId && target) {`
- L7261: `if (effectiveSnapshotQueryKind === "list") {`
- L7299: `if (effectiveSnapshotQueryKind && resolvedSnapshotTarget) {`
- L7331: `if (modifyFocusActiveEarly && explicitReservationCode && !explicitIdReservationTarget && !explicitOrdinalReservationTarget) {`
- L7384: `if (`
- L7389: `if (!target?.reservationId) {`
- L7393: `if (target.reservationStatus === "cancelled" \|\| target.reservationStatus === "error") {`

### 7398-7647

- L7439: `if (!hasImmediateModifyValue && hasExplicitModifyFieldRequest && hasExplicitModifyTarget) {`
- L7446: `if (activeField) {`
- L7459: `if (hasImmediateModifyValue && hasExplicitModifyTarget && target.reservationId && directImmediateModifyFields.length > 0) {`
- L7469: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L7476: `if (nextRoomTypeForCapacity && hasValidGuestCount) {`
- L7478: `if (capacity > 0 && nextGuestCountNumber > capacity) {`
- L7510: `if (!hasImmediateModifyValue && hasTemporalModifySignal) {`
- L7534: `if (!hasImmediateModifyValue) {`
- L7547: `if (`
- L7588: `if (`

### 7648-7897

- L7679: `if (`
- L7715: `if (!previewTarget?.reservationId) {`
- L7726: `if (activeModifyField === "dates" && hasModifyDateCorrection) {`
- L7736: `if (correctedTemporalISO) {`
- L7741: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L7772: `if (!previewTarget?.reservationId) {`
- L7784: `if (!hasTurnLevelModifyValue && !awaitingModifyExecutionContinuation) {`
- L7789: `if (activeModifyField === "guests" && nextGuestCount) {`
- L7790: `if (!codeFromModifySubstate) {`
- L7796: `if (baseRoomType && hasValidGuestCount) {`
- L7798: `if (capacity > 0 && nextGuestCountNumber > capacity) {`
- L7818: `if (queuedModifyState) {`
- L7847: `if (!previewTarget?.reservationId) {`
- L7856: `if (activeModifyField === "roomType" && nextRoomType && String(nextRoomType) !== String(pre.st?.reservationSlots?.roomType \|\| "")) {`
- L7857: `if (!codeFromModifySubstate) {`
- L7862: `if (queuedModifyState) {`
- L7891: `if (!previewTarget?.reservationId) {`

### 7898-8147

- L7900: `if (activeModifyField === "dates" && hasExplicitDateRange && nextCheckIn && nextCheckOut) {`
- L7901: `if (!codeFromModifySubstate) {`
- L7906: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L7911: `if (queuedModifyState) {`
- L7941: `if (!previewTarget?.reservationId) {`
- L7952: `if (awaitingModifyExecutionContinuation) {`
- L7971: `if (additionalReservationIntent && hasConfirmedBookingContext) {`
- L8000: `if (hasCheckIn && !hasCheckOut) {`
- L8008: `if (!hasCheckIn && hasCheckOut) {`
- L8016: `if (hasCheckIn && hasCheckOut) {`
- L8018: `if (missingField) {`
- L8086: `if (shouldHandleAvailabilityInquiry) {`
- L8088: `if (inquiryMissingField) {`
- L8112: `if (inquiryCheckIn && inquiryCheckOut) {`
- L8114: `if (inquiryDateCoherence && !inquiryDateCoherence.ok) {`
- L8123: `if (!availabilityResult.needsHandoff) {`
- L8143: `if (availabilityInquiryAmbiguousAdvance) {`

### 8148-8397

- L8197: `if (!createDraftConsistency.valid) {`
- L8236: `if (`
- L8248: `if (readyCreateDateCoherence && !readyCreateDateCoherence.ok) {`
- L8282: `if (pendingCreateProposal && !modifyExecutionActive) {`
- L8292: `if (quotedReplyIsNegative) {`
- L8299: `if (!strictQuotedConfirmation && quotedReplyHasConfirmWord) {`
- L8304: `if (!strictQuotedConfirmation && quotedReplyIsBareAffirmative) {`
- L8313: `if (!strictQuotedConfirmation) {`
- L8336: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L8339: `if (typeof startWeekday !== "number" \|\| typeof endWeekday !== "number") return {};`

### 8398-8647

- L8400: `if (hasQuotedProposalCorrection) {`
- L8402: `if (!quotedDraftConsistency.valid) {`
- L8413: `if (!isCreateStateReadyForQuote(quotedDraftConsistency.sanitizedSlots)) {`
- L8430: `if (hasQuotedProposalDateCorrection && requoteCheckIn && requoteCheckOut) {`
- L8432: `if (requoteCoherence && !requoteCoherence.ok) {`
- L8472: `if (`
- L8507: `if (`
- L8523: `if (`
- L8541: `if (`
- L8575: `if (emailAskRE.test(userTxtRaw)) {`
- L8578: `if (!email) {`
- L8587: `if (!iso) return iso;`
- L8600: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L8601: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L8608: `lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150));`
- L8611: `if (sentOK) {`
- L8647: `if (!emailAskRE.test(userTxtRaw) && recentReservationMention && lightVerb && (hasEmailAddr \|\| mentionsEmailWord)) {`

### 8648-8897

- L8649: `if (!explicitEmail) {`
- L8658: `if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? '${m[3]}/${m[2]}/${m[1]}' : iso;`
- L8670: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L8671: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L8677: `} catch (err) { lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150)); }`
- L8679: `if (sentOK) {`
- L8713: `if (!waAskRE.test(userTxtRaw) && waLightAskRE.test(userTxtRaw) && (pre.st?.lastReservation \|\| recentReservationMention)) {`
- L8718: `if (!jid) {`
- L8720: `if (phoneInline) {`
- L8722: `if (attempt.normalized) {`
- L8738: `if (isWhatsAppReady()) {`
- L8742: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L8744: `if (requestId) {`
- L8749: `if (ack) break;`
- L8764: `if (code !== 'WA_NOT_READY') {`
- L8796: `if (isWhatsAppReady()) {`
- L8800: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L8801: `if (requestId) {`
- L8806: `if (ack) break;`
- L8820: `if (code !== 'WA_NOT_READY') {`
- L8833: `if (waAskRE.test(userTxtRaw)) {`
- L8839: `if (!jid) {`
- L8842: `if (phoneInline) {`
- L8844: `if (attempt.normalized) {`
- L8860: `if (isWhatsAppReady()) {`
- L8864: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L8865: `if (requestId) {`
- L8870: `if (ack) break;`
- L8885: `if (code !== 'WA_NOT_READY') {`

### 8898-9147

- L8918: `if (isWhatsAppReady()) {`
- L8922: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L8923: `if (requestId) {`
- L8928: `if (ack) break;`
- L8942: `if (code !== 'WA_NOT_READY') {`
- L8955: `if (pre.prevCategory === "send_whatsapp_copy") {`
- L8957: `if (phoneMatch) {`
- L8959: `if (digits.length >= 6) {`
- L8974: `if (isWhatsAppReady()) {`
- L8978: `if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });`
- L8979: `if (requestId) {`
- L8984: `if (ack) break;`
- L8999: `if (code !== 'WA_NOT_READY') {`
- L9055: `if (inCancelFlow && cancelCodeFromUser && !isPureConfirm(userTxtRaw)) {`
- L9071: `if (pendingCancellation?.reservationId && pendingCancellation.awaitingConfirmation && isPureConfirm(userTxtRaw)) {`
- L9131: `if (wantsCancel) {`
- L9132: `if (`

### 9148-9397

- L9165: `if (!resolvedCancelCode) {`
- L9166: `if (reservationReference.status === "ambiguous" \|\| reservationReference.status === "out_of_range") {`
- L9181: `if (!(isPureConfirm(userTxtRaw) \|\| hasInlineCancelConfirmation)) {`
- L9262: `if (offeredTimeSide && isPureAffirmative(userTxtRaw, pre.lang)) {`
- L9268: `if (time && typeof time === "string") {`
- L9295: `if (`
- L9312: `if (`
- L9324: `if (`
- L9330: `if (!isReservationConfirmable && !modifyExecutionActive && !hasCreateQuoteConfirmationContext) {`
- L9331: `if (reservationFlow === "confirmed") {`
- L9336: `: "There is already a confirmed booking on this conversation. Tell me if you want to modify or cancel it.";`
- L9339: `if (activeCreateFlow && nextCreateMissingField) {`
- L9351: `if (!hasGuests) {`
- L9352: `if (activeCreateFlow && pre.msg.channel === "email" && nextCreateMissingField) {`
- L9360: `if (!hasGuestName) {`
- L9361: `if (!modifyExecutionActive) {`
- L9381: `if (modifyExecutionActive) {`
- L9385: `if (awaitingModifyPreviewConfirmation && pendingModifyPatch?.reservationId) {`
- L9387: `if (!pendingTarget?.reservationId \|\| pendingTarget.reservationStatus === "cancelled" \|\| pendingTarget.reservationStatus === "error") {`

### 9398-9647

- L9420: `if (previewReject) {`
- L9431: `if (hasPreviewCorrections && !previewConfirm) {`
- L9433: `if (!previewValidation.ok) {`
- L9447: `if (!previewConfirm) {`
- L9453: `if (!previewValidation.ok) {`
- L9500: `if (`
- L9508: `if (!hasChanges) {`
- L9539: `if (!codeFromUser) {`
- L9540: `if (reservationReference.status === "ambiguous" \|\| reservationReference.status === "out_of_range") {`
- L9547: `if (!hasChanges) {`
- L9554: `if (modifyDateCoherence && !modifyDateCoherence.ok) {`
- L9559: `if (!genericModifyTarget?.reservationId \|\| genericModifyTarget.reservationStatus === "cancelled" \|\| genericModifyTarget.reservationStatus === "error") {`
- L9572: `if (!genericModifyValidation.ok) {`
- L9573: `if (genericModifyValidation.nextField) {`
- L9605: `if (hasCreateQuoteConfirmationContext) {`
- L9611: `if (!createDraftConsistency.valid) {`
- L9622: `if (!isCreateStateReadyForQuote(snapshot as ReservationSlotsStrict)) {`
- L9624: `if (missingField) {`
- L9630: `if (!snapshot.roomType \|\| !snapshot.checkIn \|\| !snapshot.checkOut) {`
- L9635: `if (createDateCoherence && !createDateCoherence.ok) {`
- L9644: `if (result.ok && hasReservationId) {`

### 9648-9897

- L9694: `if (canonicalRecordForReply) {`
- L9742: `if (await tryConversationalGuestNameCapture(pre, state)) {`
- L9746: `if (!tryBodyLLMTestGreetingFastpath(pre, state)) {`
- L9770: `if (postBookingSnapshotQ && !hasConfirmedBookingContext) {`
- L9779: `if (`
- L9788: `if (`
- L9794: `if (postBookingSnapshotQ === "list") {`
- L9838: `if (postBookingLateCheckoutQ && hasConfirmedBookingContext) {`
- L9843: `if (postBookingEarlyCheckinQ && hasConfirmedBookingContext) {`
- L9853: `if (postBookingTimeQ && hasConfirmedBookingContext) {`

### 9898-10147

- L9951: `if (wantsNearby) {`
- L9954: `if (looksBillingByRule) {`
- L9965: `if (kbForced.ok && forcedText) {`
- L9972: `if (/(actividad\|actividades\|zona\|lugares para visitar\|restaurants? cercanos\|atracciones)/i.test(finalText)) {`
- L10002: `if (!forcedBillingResolved) {`
- L10025: `if (!hasReservationContext && !wantsNearby && !looksEventIntent && !looksTransactionalPricing) {`
- L10027: `if (skipKbFastpath) {`
- L10048: `if (kb.ok && safeCat && text) {`
- L10063: `if (`
- L10075: `if (continuation) {`
- L10108: `if (pureCreateLateralTurn && !pureCreateLateralKbResolved) {`
- L10110: `if (failsafeReply) {`

### 10148-10397

- L10195: `if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {`
- L10213: `if (noContent && isNearby) {`
- L10229: `if (rbRich) explicitRich = rbRich;`
- L10230: `if (rbText) {`
- L10273: `if (!finalText) {`
- L10275: `if (!(pre as any).__orchestratorActive) {`
- L10297: `if (createFlowActive && createMissingField === "guestName" && nextCategory === "reservation") {`
- L10304: `if (reservationLocalFallbackNeeded) {`
- L10309: `if (Object.keys(fallbackSlots).length > 0) {`
- L10344: `if (pre.inModifyMode) {`
- L10346: `if (isContactHotelText(finalText, pre.lang)) {`
- L10357: `if (!ackedVerifyInThisReply && noNewChangeData && isQuoteOrConfirmText(finalText, pre.lang)) {`

### 10398-10647

- L10418: `if (`
- L10445: `if (!activeModifyField && (requestedChangeDates \|\| requestedChangeRoom \|\| requestedChangeGuests \|\| hasImplicitModifyValueFollowup)) {`
- L10446: `if ((pre.inModifyMode \|\| pre.prevCategory === "modify_reservation") && (hasBoundReservationTarget \|\| pre.prevCategory === "modify_reservation")) {`
- L10462: `if (hasImmediateFieldValue) {`
- L10480: `if (pendingRequestedFields.length > 0) {`
- L10485: `if (activeField === "dates" && ingestedSlots.checkIn && ingestedSlots.checkOut) {`
- L10490: `if (previewTarget?.reservationId) {`
- L10526: `if (activeField === "dates") {`
- L10528: `} else if (activeField === "guests") {`
- L10564: `if (pre.inModifyMode && wantsGenericModify(String(pre.msg.content \|\| ""), pre.lang) && (nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.chec`
- L10579: `if (resolvedModifyTarget?.reservationId) {`

### 10648-10897

- L10709: `if (lateCheckoutQ) {`
- L10713: `} else if (earlyCheckinQ) {`
- L10722: `} else if (timeQ) {`
- L10727: `if (hasConfirmedBookingContext) {`
- L10733: `if (time && typeof time === "string") {`
- L10760: `if (!nextCategory) nextCategory = "retrieval_based";`
- L10762: `} else if (triggerDateFlow) {`
- L10776: `if (shouldPersistPartialModifyDate && modifyTemporalSideIntent) {`
- L10803: `if (!hasDateTokenInMsg) {`
- L10805: `if (modifyTemporalSideIntent && (userDates.checkIn \|\| userDates.checkOut)) {`
- L10810: `} else if (sideIntent) {`
- L10812: `if (sideIntent === 'checkIn') preserveAskCheckIn = finalText; // preservar si luego se genera confirmación accidental`
- L10813: `} else if (mentionsNewDates \|\| mentionsDates) {`
- L10831: `if (cons.changed) {`
- L10835: `if (!userModifiesCheckInWithoutDate && (isEmpty \|\| cons.finalText)) {`
- L10837: `if (cons.finalText) finalText = cons.finalText;`
- L10839: `if (cons.preservedPrompt && /anot[eé] nuevas fechas\|anotei as novas datas\|noted the new dates/i.test(finalText \|\| '')) {`
- L10863: `if (newCI && newCO && (newCI !== prevCI \|\| newCO !== prevCO)) {`
- L10868: `if ((!txt \|\| genericAck \|\| !hasDatesMentioned)) {`
- L10870: `if (!iso) return iso \|\| '';`
- L10877: `if (!modifyExecutionActive && !createQuoteReady && !/¿cu[aá]l es la fecha de check\-?out\|what is the check\-?out date\|qual é a data de check\-?out/i.test(txt)) {`
- L10895: `if (hasDuplicateRange) {`

### 10898-11147

- L10902: `if (m instanceof HumanMessage) {`
- L10905: `if (dates.length === 1 && dates[0] !== currentDate) { previousSingle = dates[0]; break; }`
- L10908: `if (previousSingle && currentDate) {`
- L10922: `if (!modifyExecutionActive) {`
- L10940: `if (isVerifyAvailabilityAffirmative) {`
- L10957: `if (quoteGatedCreateFlow) {`
- L10959: `if (!createDraftConsistency.valid) {`
- L10971: `if (quoteGatedCreateFlow && !isCreateStateReadyForQuote(createQuoteSlots)) {`
- L10973: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L10981: `if (ci && co) {`
- L10983: `if (availabilityDateCoherence && !availabilityDateCoherence.ok) {`
- L10989: `if (modifyExecutionActive) {`
- L10994: `if (!modifyTarget?.reservationId) {`
- L11047: `if (availabilityNeedsHandoff) {`
- L11061: `if (missing) finalText = buildAskMissingDate(pre.lang, missing as any, modifyExecutionActive ? "modify" : "create");`
- L11075: `if (isAskAvailabilityStatusQuery(String(pre.msg.content \|\| ""), pre.lang)) {`
- L11093: `if (quoteGatedCreateFlow) {`
- L11095: `if (!createDraftConsistency.valid) {`
- L11107: `if (quoteGatedCreateFlow && !isCreateStateReadyForQuote(createQuoteSlots)) {`
- L11109: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L11115: `if (ciISO && coISO) {`
- L11117: `if (availabilityStatusDateCoherence && !availabilityStatusDateCoherence.ok) {`
- L11124: `if (modifyExecutionActive) {`
- L11141: `if (res.needsHandoff) {`

### 11148-11397

- L11169: `if (isAmenitiesTurn) {`
- L11173: `if (isBillingTurn) {`
- L11183: `if (isSupportTurn) {`
- L11196: `if (`
- L11203: `if (continuation) {`
- L11207: `if (shouldClearSelectedReservationTargetForCategory(nextCategory, promptKeyUsed)) {`
- L11218: `if (!shouldPreserveModifyTarget) {`
- L11234: `if (`
- L11241: `if (!createDraftConsistency.valid) {`
- L11245: `} else if (!isCreateStateReadyForQuote(quotedReservationSnapshot as ReservationSlotsStrict)) {`
- L11247: `if (missingField) {`
- L11254: `if (`
- L11265: `if (`
- L11302: `if (!(graphResult as any)?.meta?.debug?.route_source && finalText) {`
- L11323: `if (!raw) return raw;`
- L11337: `/(?:\n\|\r\n){1,}if you want to explore the area[\s\S]*$/i,`
- L11347: `if (!raw) return raw;`
- L11383: `if (!asksAcceptance) return answer;`
- L11392: `if (!hit) return answer;`

### 11398-11647

- L11405: `if (accepted) {`
- L11407: `if (!isNegative) return answer;`
- L11428: `if (!out) return out;`
- L11430: `if (hasQuestion) return out;`
- L11468: `if (lang === "pt") {`
- L11469: `if (asksAcceptance && hit) {`
- L11474: `if (asksCurrency) return 'Moedas habilitadas hoje: ${currencies.join(", ") \|\| "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e comprovantes?';`
- L11475: `if (asksInvoices) return 'Emitimos fatura: ${issuesInvoices ? "sim" : "por enquanto não"}.\nComprovantes: ${docs.join(", ") \|\| "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e moedas?';`
- L11478: `if (lang === "en") {`
- L11479: `if (asksAcceptance && hit) {`
- L11484: `if (asksCurrency) return 'Enabled currencies today: ${currencies.join(", ") \|\| "(to be confirmed)"}.\n\nDo you want details on payment methods and invoices?';`
- L11485: `if (asksInvoices) return 'Invoices issued: ${issuesInvoices ? "yes" : "currently disabled"}.\nInvoice documents: ${docs.join(", ") \|\| "(to be confirmed)"}.\n\nDo you want details on payment methods an`
- L11489: `if (asksAcceptance && hit) {`
- L11494: `if (asksCurrency) return 'Monedas habilitadas hoy: ${currencies.join(", ") \|\| "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y comprobantes?';`
- L11495: `if (asksInvoices) return 'Emitimos factura: ${issuesInvoices ? "sí" : "por el momento no"}.\nComprobantes: ${docs.join(", ") \|\| "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y monedas?';`
- L11498: `if (lang === "pt") return "Posso te ajudar com pagamentos e faturamento. Quer que eu detalhe meios, moedas ou comprovantes?";`
- L11499: `if (lang === "en") return "I can help with payments and billing. Do you want details on methods, currencies, or invoices?";`
- L11506: `if (!out) return out;`
- L11508: `if (lang === "es") {`
- L11520: `if (hasRestriction && !hasProactive) {`
- L11525: `if (lang === "pt") {`
- L11532: `if (lang === "en") {`
- L11543: `if (!out) return out;`
- L11573: `if (!t) return false;`
- L11590: `if (!t) return false;`
- L11601: `if (!t) return false;`
- L11604: `if (`
- L11605: `/\b(modificar\|cambiar\|alterar\|mudar\|change\|edit\|update)\b.*\b(si\|if\|se)\b.*\b(hay\|have\|tem\|availability\|disponibilidad\|lugar)\b/i.test(normalizedText) \|\|`
- L11606: `/\b(saber\s+si\s+puedo\|know\s+if\s+i\s+can\|se\s+posso)\b.*\b(modificar\|cambiar\|alterar\|mudar\|change\|edit\|update)\b/i.test(normalizedText) \|\|`
- L11611: `if (normalizedReservationIntent.kind === "modify") return true;`

### 11648-11813

- L11648: `if (asksBeforePrice) return "Which booking would you like me to remind you of the price for?";`
- L11649: `if (asksConditionalAvailability) return "What change would you like to check? Tell me the room, dates, or number of guests so I can review availability.";`
- L11671: `if (lang === "es") {`
- L11684: `if (lang === "pt") {`
- L11714: `if (!target?.reservationId) return "";`
- L11724: `if (lang === "pt") {`
- L11731: `if (lang === "en") {`
- L11749: `if (!t) return true;`
- L11763: `if (!/^[A-Z][A-Z0-9-]{4,23}$/.test(normalized)) continue;`
- L11764: `if (!/\d/.test(normalized)) continue;`
- L11797: `if (explicitRe.test(userTxtRaw)) {`
- L11803: `if (lightRe.test(userTxtRaw)) {`
- L11805: `if (hasReservationContext) {`


---

## 6. Líneas relevantes para temporal/checkIn/checkOut/numGuests

### 5148-5397

- L5187: `? "checkout_info"`
- L5189: `? "checkin_info"`
- L5194: `stableTurnSlots.checkIn \|\|`
- L5195: `stableTurnSlots.checkOut \|\|`
- L5197: `stableTurnSlots.numGuests \|\|`
- L5199: `extractRawOrderedDateRange(rawTurnText)?.checkIn`
- L5209: `isLateralTurn: nextCategory === "amenities_info" \|\| nextCategory === "checkin_info" \|\| nextCategory === "checkout_info",`
- L5251: `const earlyCheckinShortcutQ = detectEarlyCheckinQuestion(rawTurnText, pre.lang);`
- L5253: `earlyCheckinShortcutQ &&`
- L5260: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L5261: `finalText = buildEarlyCheckinResponse(pre.lang, guestState, {`
- L5262: `checkInTime: confCheckIn,`
- L5265: `nextCategory = "checkin_info";`
- L5267: `decision_layer: "early_checkin_heuristic",`
- L5268: `route_source: "early_checkin_heuristic",`
- L5269: `route_match: "early_checkin",`
- L5319: `!extractSlotsFromText(rawTurnText, pre.lang).checkIn &&`
- L5320: `!extractSlotsFromText(rawTurnText, pre.lang).checkOut &&`
- L5348: `Boolean(explicitDr0.checkIn && explicitDr0.checkOut) &&`
- L5349: `assessReservationDateCoherence(explicitDr0.checkIn, explicitDr0.checkOut)?.ok === true;`
- L5351: `Boolean(rawDr0?.checkIn && rawDr0?.checkOut) &&`
- L5352: `assessReservationDateCoherence(rawDr0?.checkIn, rawDr0?.checkOut)?.ok === true;`
- L5354: `Boolean(lightDr0.checkIn && lightDr0.checkOut) &&`
- L5355: `assessReservationDateCoherence(lightDr0.checkIn, lightDr0.checkOut)?.ok === true;`
- L5357: `Boolean(relativeWeekendDr0.checkIn && relativeWeekendDr0.checkOut) &&`
- L5358: `assessReservationDateCoherence(relativeWeekendDr0.checkIn, relativeWeekendDr0.checkOut)?.ok === true;`
- L5360: `Boolean(relativeWeekdayRangeDr0.checkIn && relativeWeekdayRangeDr0.checkOut) &&`
- L5361: `assessReservationDateCoherence(relativeWeekdayRangeDr0.checkIn, relativeWeekdayRangeDr0.checkOut)?.ok === true;`
- L5363: `Boolean(anchoredCreateDr0.checkIn && anchoredCreateDr0.checkOut) &&`
- L5364: `assessReservationDateCoherence(anchoredCreateDr0.checkIn, anchoredCreateDr0.checkOut)?.ok === true;`
- L5378: `: explicitDr0.checkIn \|\| explicitDr0.checkOut`
- L5385: `turnCreateSlots0.checkIn &&`
- L5386: `turnCreateSlots0.checkOut &&`
- L5388: `turnCreateSlots0.numGuests &&`
- L5391: `if (dr0.checkIn && dr0.checkOut && !isEventLikeMessage && !hasCompleteRichCreatePayloadInTurn0) {`
- L5395: `assessReservationDateCoherence(rawDr0?.checkIn, rawDr0?.checkOut) \|\|`
- L5396: `assessReservationDateCoherence(dr0.checkIn, dr0.checkOut);`

### 5398-5647

- L5405: `checkIn: dr0.checkIn,`
- L5406: `checkOut: dr0.checkOut,`
- L5420: `fastPathSlots.checkIn &&`
- L5421: `fastPathSlots.checkOut &&`
- L5423: `fastPathSlots.numGuests &&`
- L5431: `Boolean(fastPathTurnSlots.roomType \|\| fastPathTurnSlots.numGuests);`
- L5441: `(fastPathTurnSlots.roomType \|\| fastPathTurnSlots.numGuests)`
- L5446: `numGuests: fastPathSlots.numGuests \|\| resolvedModifyTarget0.numGuests,`
- L5447: `checkIn: fastPathSlots.checkIn \|\| resolvedModifyTarget0.checkIn,`
- L5448: `checkOut: fastPathSlots.checkOut \|\| resolvedModifyTarget0.checkOut,`
- L5502: `const availabilityResult = await runAvailabilityCheck(availabilityPre, fastPathSlots, dr0.checkIn, dr0.checkOut, {`
- L5567: `const ciTxt = isoToDDMMYYYY(dr0.checkIn) \|\| dr0.checkIn;`
- L5568: `const coTxt = isoToDDMMYYYY(dr0.checkOut) \|\| dr0.checkOut;`
- L5613: `const supportedDrFastRaw = await extractSupportedTemporalDateRange(userTxtFast, pre.lang);`
- L5617: `supportedDrFastRaw.checkIn && supportedDrFastRaw.checkOut`
- L5619: `: relativeWeekdayRangeFast.checkIn && relativeWeekdayRangeFast.checkOut`
- L5621: `: supportedDrFastRaw.checkIn \|\| supportedDrFastRaw.checkOut`
- L5639: `const safeLeadGuestName = extractSafeCreateTemporalLeadGuestName(userTxtFast);`

### 5648-5897

- L5667: `const ciISO = createDraftConsistency.sanitizedSlots.checkIn;`
- L5668: `const coISO = createDraftConsistency.sanitizedSlots.checkOut;`
- L5714: `const fastTemporalSideIntent = detectModifyTemporalSideIntent(userTxtFast, drFast);`
- L5715: `const explicitCheckOutFast =`
- L5716: `fastTemporalSideIntent === "checkOut" \|\|`
- L5717: `Boolean(explicitTurnSlotsFast.checkOut && !explicitTurnSlotsFast.checkIn);`
- L5725: `? !inquiryKnownFastSlots.checkIn`
- L5726: `? "checkIn"`
- L5727: `: !inquiryKnownFastSlots.checkOut`
- L5728: `? "checkOut"`
- L5735: `const createCheckOutRepairContextFast =`
- L5737: `explicitCheckOutFast &&`
- L5738: `Boolean(pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn) &&`
- L5739: `!Boolean(pre.st?.reservationSlots?.checkOut);`
- L5742: `(createCheckOutRepairContextFast ? "checkOut" : undefined) \|\|`
- L5744: `(inquiryMissingSideFast === "checkIn" \|\| inquiryMissingSideFast === "checkOut" ? inquiryMissingSideFast : undefined);`
- L5745: `const createCheckInRepairContextFast =`
- L5747: `!explicitCheckOutFast &&`
- L5748: `drFast.checkIn &&`
- L5749: `!drFast.checkOut &&`
- L5750: `!pre.st?.reservationSlots?.checkIn;`
- L5752: `createCheckInRepairContextFast &&`
- L5753: `reservationContextualMissingSideFastRaw === "checkOut"`
- L5754: `? "checkIn"`
- L5756: `const singleFastISO = drFast.checkIn \|\| drFast.checkOut;`
- L5757: `const hasOneDateOnly = Boolean(singleFastISO) && !(drFast.checkIn && drFast.checkOut);`
- L5768: `Boolean((pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn) && (pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut));`
- L5773: `!fastTemporalSideIntent;`
- L5777: `fastPathSubFlow === "create" && explicitCheckOutFast`
- L5778: `? "checkOut"`
- L5780: `const contextualFastDates = createSingleDateSideFast === "checkIn"`
- L5781: `? { checkIn: singleFastISO }`
- L5782: `: { checkOut: singleFastISO };`
- L5787: `createSingleDateSideFast === "checkOut" &&`
- L5788: `explicitCheckOutFast`
- L5790: `const explicitCheckOutSlots = mergeReservationSlots(pre.currSlots, normalizedFastPathSlots);`
- L5791: `Object.assign(normalizedFastPathSlots, explicitCheckOutSlots);`
- L5792: `normalizedFastPathSlots.checkOut = singleFastISO;`
- L5793: `if (!normalizedFastPathSlots.numGuests) {`
- L5795: `if (explicitGuestCount) normalizedFastPathSlots.numGuests = explicitGuestCount;`

### 5898-6147

- L6011: `if (singleFastISO && fastPathSubFlow === "modify" && fastTemporalSideIntent) {`
- L6019: `fastTemporalSideIntent`
- L6036: `fastTemporalSideIntent === "checkIn" ? "checkOut" : "checkIn"`
- L6049: `drFast.checkIn &&`
- L6050: `!explicitCheckOutFast &&`
- L6052: `isPastReservationCheckInISO(drFast.checkIn)`
- L6059: `delete sanitizedCreateSlots.checkOut;`
- L6061: `sanitizedCreateSlots.checkIn &&`
- L6062: `isPastReservationCheckInISO(sanitizedCreateSlots.checkIn)`
- L6064: `delete sanitizedCreateSlots.checkIn;`
- L6068: `finalText = buildPastReservationCheckInPrompt(pre.lang, drFast.checkIn);`
- L6077: `if (drFast.checkIn && !explicitCheckOutFast && !isConfirmedBooking && isPastReservationCheckInISO(drFast.checkIn)) {`
- L6078: `finalText = buildPastReservationCheckInPrompt(pre.lang, drFast.checkIn);`
- L6079: `const { checkIn: _dropInvalidCheckIn, ...restNextSlots } = nextSlots;`
- L6091: `const prevISO = prevSingle.checkIn \|\| prevSingle.checkOut;`
- L6092: `const currISO = drFast.checkIn \|\| drFast.checkOut;`
- L6100: `checkIn: ciISO,`
- L6101: `checkOut: coISO,`

### 6148-6397

- L6210: `const missingSide = drFast.checkIn ? "checkOut" : "checkIn";`
- L6224: `fastTemporalSideIntent`
- L6257: `(activeQueuedModifyField === "guests" && Boolean(queuedTurnSlots.numGuests)) \|\|`
- L6258: `(activeQueuedModifyField === "dates" && Boolean(queuedDateRange?.checkIn && queuedDateRange?.checkOut));`
- L6315: `const userDatesFast = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L6316: `const sideIntentFast = detectModifyTemporalSideIntent(userTxt, userDatesFast);`
- L6319: `const isDateTopicFast = Boolean(sideIntentFast \|\| userDatesFast.checkIn \|\| userDatesFast.checkOut \|\| hasAnyDateTokenFast \|\| mentionsDatesFast);`
- L6323: `const mentionsGuestsFieldFast = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxtFast);`
- L6326: `inlineModifyTurnSlotsFast.numGuests \|\|`
- L6327: `(inlineModifyDateRangeFast?.checkIn && inlineModifyDateRangeFast?.checkOut)`
- L6359: `numGuests: inlineModifyTurnSlotsFast.numGuests \|\| resolvedFastReservationTarget.numGuests,`
- L6360: `checkIn: inlineModifyDateRangeFast?.checkIn \|\| resolvedFastReservationTarget.checkIn,`
- L6361: `checkOut: inlineModifyDateRangeFast?.checkOut \|\| resolvedFastReservationTarget.checkOut,`

### 6398-6647

- L6411: `numGuests: resolvedFastReservationTarget.numGuests,`
- L6412: `checkIn: resolvedFastReservationTarget.checkIn,`
- L6413: `checkOut: resolvedFastReservationTarget.checkOut,`
- L6444: `!inlineModifyTurnSlotsFast.numGuests &&`
- L6445: `!(inlineModifyDateRangeFast?.checkIn && inlineModifyDateRangeFast?.checkOut)`
- L6450: `numGuests: resolvedFastReservationTarget.numGuests \|\| pre.st?.reservationSlots?.numGuests,`
- L6451: `checkIn: resolvedFastReservationTarget.checkIn \|\| pre.st?.reservationSlots?.checkIn,`
- L6452: `checkOut: resolvedFastReservationTarget.checkOut \|\| pre.st?.reservationSlots?.checkOut,`
- L6485: `numGuests: resolvedFastReservationTarget.numGuests,`
- L6486: `checkIn: resolvedFastReservationTarget.checkIn,`
- L6487: `checkOut: resolvedFastReservationTarget.checkOut,`
- L6534: `checkIn: pre.st?.reservationSlots?.checkIn \|\| pre.currSlots.checkIn,`
- L6535: `checkOut: pre.st?.reservationSlots?.checkOut \|\| pre.currSlots.checkOut,`
- L6536: `numGuests: pre.st?.reservationSlots?.numGuests \|\| pre.currSlots.numGuests,`
- L6614: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L6615: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L6616: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L6620: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L6621: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`

### 6648-6897

- L6828: `const correctionDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L6832: `numGuests: correctionTurnSlots.numGuests \|\| correctionGuestCount \|\| currentPreviewSnapshot.numGuests,`
- L6833: `checkIn: correctionDates.checkIn \|\| currentPreviewSnapshot.checkIn,`
- L6834: `checkOut: correctionDates.checkOut \|\| currentPreviewSnapshot.checkOut,`
- L6840: `String(updatedPreviewSnapshot.numGuests \|\| "") !== String(currentPreviewSnapshot.numGuests \|\| "") \|\|`
- L6841: `String(updatedPreviewSnapshot.checkIn \|\| "") !== String(currentPreviewSnapshot.checkIn \|\| "") \|\|`
- L6842: `String(updatedPreviewSnapshot.checkOut \|\| "") !== String(currentPreviewSnapshot.checkOut \|\| "");`

### 6898-7147

- L6973: `const earlyModifyDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L6974: `const earlyModifySideIntent = detectModifyTemporalSideIntent(userTxtRaw, earlyModifyDates);`
- L6977: `(earlyModifyDates.checkIn \|\| earlyModifyDates.checkOut) &&`
- L7005: `earlyModifySideIntent === "checkIn" ? "checkOut" : "checkIn"`
- L7032: `const reservationCheckIn = nextSlots.checkIn \|\| pre.currSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L7033: `const reservationCheckOut = nextSlots.checkOut \|\| pre.currSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L7034: `const reservationGuests = nextSlots.numGuests \|\| pre.currSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests;`
- L7041: `const createDraftTemporalDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7046: `turnCreateSlots.checkIn \|\|`
- L7047: `turnCreateSlots.checkOut \|\|`
- L7049: `turnCreateSlots.numGuests \|\|`
- L7051: `createDraftTemporalDates.checkIn \|\|`
- L7052: `createDraftTemporalDates.checkOut \|\|`
- L7053: `createDraftRawOrderedDates?.checkIn \|\|`
- L7054: `createDraftRawOrderedDates?.checkOut \|\|`
- L7055: `createDraftRelativeWeekendRange.checkIn \|\|`
- L7056: `createDraftRelativeWeekendRange.checkOut`
- L7058: `const createDraftCheckIn =`
- L7059: `reservationCheckIn \|\|`
- L7060: `createDraftTemporalDates.checkIn \|\|`
- L7061: `createDraftRawOrderedDates?.checkIn \|\|`
- L7062: `createDraftRelativeWeekendRange.checkIn;`
- L7063: `const createDraftCheckOut =`
- L7064: `reservationCheckOut \|\|`
- L7065: `createDraftTemporalDates.checkOut \|\|`
- L7066: `createDraftRawOrderedDates?.checkOut \|\|`
- L7067: `createDraftRelativeWeekendRange.checkOut;`
- L7071: `Boolean(turnCreateSlots.checkIn && turnCreateSlots.checkOut) &&`
- L7072: `Boolean(turnCreateSlots.roomType \|\| turnCreateSlots.numGuests \|\| isSafeGuestName(turnCreateSlots.guestName \|\| ""));`
- L7075: `const explicitTurnDateCoherence = assessReservationDateCoherence(rawOrderedDateRange?.checkIn, rawOrderedDateRange?.checkOut);`
- L7076: `const reservationDateCoherence = assessReservationDateCoherence(reservationCheckIn, reservationCheckOut);`
- L7078: `pre.currSlots.checkIn !== pre.prevSlotsStrict?.checkIn \|\|`
- L7079: `pre.currSlots.checkOut !== pre.prevSlotsStrict?.checkOut \|\|`
- L7080: `Boolean(extractDateRangeFromText(userTxtRaw).checkIn \|\| extractDateRangeFromText(userTxtRaw).checkOut);`
- L7120: `reservationCheckIn &&`
- L7121: `reservationCheckOut &&`
- L7130: `checkIn: reservationCheckIn,`
- L7131: `checkOut: reservationCheckOut,`
- L7132: `numGuests: String(reservationGuests),`

### 7148-7397

- L7205: `numGuests: confirmedSnapshotFallback.slots.numGuests,`
- L7206: `checkIn: confirmedSnapshotFallback.slots.checkIn,`
- L7207: `checkOut: confirmedSnapshotFallback.slots.checkOut,`
- L7245: `numGuests: target.numGuests,`
- L7246: `checkIn: target.checkIn,`
- L7247: `checkOut: target.checkOut,`
- L7276: `checkIn: item.checkIn,`
- L7277: `checkOut: item.checkOut,`
- L7278: `numGuests: item.numGuests,`
- L7306: `numGuests: target.numGuests,`
- L7307: `checkIn: target.checkIn,`
- L7308: `checkOut: target.checkOut,`
- L7344: `const mentionsModifyDatesField = /\b(fechas\|fecha\|dates\|date\|datas\|data\|check-in\|check out\|check-out\|entrada\|salida\|ingreso)\b/i.test(normalizedUserTxtForModify);`
- L7346: `const mentionsModifyGuestsField = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxtForModify);`
- L7363: `Boolean(rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut) \|\|`
- L7364: `Boolean(directModifyTurnSlots.numGuests) \|\|`
- L7366: `const directModifyUserDates = await extractSupportedTemporalDateRange(userTxtRaw, pre.lang);`
- L7367: `const directModifySideIntent = detectModifyTemporalSideIntent(userTxtRaw, directModifyUserDates);`
- L7368: `const hasTemporalModifySignal = hasModifyDatesEntrySignal(`
- L7381: `(hasExplicitModifyFieldRequest \|\| hasImmediateModifyValue \|\| hasTemporalModifySignal \|\| Boolean(explicitReservationCode))`

### 7398-7647

- L7412: `rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut ? "dates" : null,`
- L7413: `directModifyTurnSlots.numGuests ? "guests" : null,`
- L7421: `numGuests: pre.currSlots.numGuests \|\| nextSlots.numGuests \|\| target.numGuests,`
- L7422: `checkIn: pre.currSlots.checkIn \|\| nextSlots.checkIn \|\| target.checkIn,`
- L7423: `checkOut: pre.currSlots.checkOut \|\| nextSlots.checkOut \|\| target.checkOut,`
- L7463: `numGuests: directModifyTurnSlots.numGuests \|\| (reservationGuests ? String(reservationGuests) : undefined) \|\| target.numGuests,`
- L7464: `checkIn: rawOrderedDateRange?.checkIn \|\| reservationCheckIn \|\| target.checkIn,`
- L7465: `checkOut: rawOrderedDateRange?.checkOut \|\| reservationCheckOut \|\| target.checkOut,`
- L7468: `const modifyDateCoherence = assessReservationDateCoherence(snapshot.checkIn, snapshot.checkOut);`
- L7473: `const nextGuestCountNumber = Number.parseInt(String(snapshot.numGuests \|\| ""), 10);`
- L7510: `if (!hasImmediateModifyValue && hasTemporalModifySignal) {`
- L7515: `numGuests: reservationGuests \|\| target.numGuests,`
- L7516: `checkIn: reservationCheckIn \|\| target.checkIn,`
- L7517: `checkOut: reservationCheckOut \|\| target.checkOut,`
- L7530: `? buildAskMissingDate(pre.lang, directModifySideIntent === "checkIn" ? "checkOut" : "checkIn")`
- L7539: `numGuests: reservationGuests \|\| target.numGuests,`
- L7540: `checkIn: reservationCheckIn \|\| target.checkIn,`
- L7541: `checkOut: reservationCheckOut \|\| target.checkOut,`
- L7559: `numGuests: target?.numGuests,`
- L7560: `checkIn: target?.checkIn,`
- L7561: `checkOut: target?.checkOut,`
- L7581: `numGuests: target?.numGuests,`
- L7582: `checkIn: target?.checkIn,`
- L7583: `checkOut: target?.checkOut,`
- L7606: `const rawGuestCount = extractSlotsFromText(userTxtRaw, pre.lang).numGuests \|\| extractGuests(userTxtRaw);`
- L7615: `const hasExplicitDateRange = Boolean(rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut);`
- L7619: `const baseGuests = reservationGuests \|\| baseModifyTarget?.numGuests;`
- L7620: `const baseCheckIn = baseModifyTarget?.checkIn \|\| reservationCheckIn;`
- L7621: `const baseCheckOut = baseModifyTarget?.checkOut \|\| reservationCheckOut;`
- L7622: `const currentModifyCheckIn = nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn \|\| baseCheckIn;`
- L7623: `const currentModifyCheckOut = nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut \|\| baseCheckOut;`
- L7624: `const nextCheckIn = hasExplicitDateRange ? rawOrderedDateRange?.checkIn : baseCheckIn;`
- L7625: `const nextCheckOut = hasExplicitDateRange ? rawOrderedDateRange?.checkOut : baseCheckOut;`
- L7626: `const modifyTemporalDatesRaw =`
- L7628: `? await extractSupportedTemporalDateRange(userTxtRaw, pre.lang)`
- L7630: `const modifyTemporalDates =`
- L7632: `? anchorModifyRelativeDateToContext(pre, userTxtRaw, modifyTemporalDatesRaw, nextSlots)`
- L7633: `: modifyTemporalDatesRaw;`
- L7639: `checkIn: nextCheckIn,`
- L7640: `checkOut: nextCheckOut,`

### 7648-7897

- L7649: `Boolean(modifySingleTemporalISO) &&`
- L7654: `Boolean(modifySingleTemporalISO) &&`
- L7655: `!(modifyTemporalDates.checkIn && modifyTemporalDates.checkOut);`
- L7682: `modifySingleTemporalISO &&`
- L7685: `const contextualDateSlots = contextualMissingModifySide === "checkIn"`
- L7686: `? { checkIn: modifySingleTemporalISO }`
- L7687: `: { checkOut: modifySingleTemporalISO };`
- L7693: `numGuests: baseGuests,`
- L7694: `checkIn: baseCheckIn,`
- L7695: `checkOut: baseCheckOut,`
- L7727: `const correctionSideIntent = detectModifyTemporalSideIntent(userTxtRaw, modifyTemporalDates) \|\| "checkOut";`
- L7728: `const correctionTemporalDates =`
- L7729: `correctionSideIntent === "checkOut"`
- L7730: `? anchorRelativeWeekdayToCheckOutAfterCheckIn(userTxtRaw, modifyTemporalDates, currentModifyCheckIn)`
- L7731: `: modifyTemporalDates;`
- L7732: `const correctedTemporalISO =`
- L7733: `correctionSideIntent === "checkIn"`
- L7734: `? (correctionTemporalDates.checkIn \|\| correctionTemporalDates.checkOut)`
- L7735: `: (correctionTemporalDates.checkOut \|\| correctionTemporalDates.checkIn);`
- L7736: `if (correctedTemporalISO) {`
- L7737: `const correctedDates = correctionSideIntent === "checkIn"`
- L7738: `? { checkIn: correctedTemporalISO, checkOut: currentModifyCheckOut }`
- L7739: `: { checkIn: currentModifyCheckIn, checkOut: correctedTemporalISO };`
- L7740: `const modifyDateCoherence = assessReservationDateCoherence(correctedDates.checkIn, correctedDates.checkOut);`
- L7750: `numGuests: baseGuests,`
- L7751: `checkIn: currentModifyCheckIn,`
- L7752: `checkOut: currentModifyCheckOut,`
- L7803: `numGuests: String(nextGuestCountNumber),`
- L7821: `numGuests: nextGuestCount,`
- L7840: `numGuests: nextGuestCount,`
- L7841: `checkIn: nextCheckIn,`
- L7842: `checkOut: nextCheckOut,`
- L7852: `nextSlots = { ...nextSlots, numGuests: nextGuestCount } as ReservationSlotsStrict;`
- L7884: `numGuests: baseGuests,`
- L7885: `checkIn: baseCheckIn,`
- L7886: `checkOut: baseCheckOut,`

### 7898-8147

- L7900: `if (activeModifyField === "dates" && hasExplicitDateRange && nextCheckIn && nextCheckOut) {`
- L7905: `const modifyDateCoherence = assessReservationDateCoherence(nextCheckIn, nextCheckOut);`
- L7914: `checkIn: nextCheckIn,`
- L7915: `checkOut: nextCheckOut,`
- L7934: `numGuests: baseGuests,`
- L7935: `checkIn: nextCheckIn,`
- L7936: `checkOut: nextCheckOut,`
- L7966: `checkIn: createDraftCheckIn,`
- L7967: `checkOut: createDraftCheckOut,`
- L7968: `numGuests: reservationGuests ? String(reservationGuests) : undefined,`
- L7998: `const hasCheckIn = Boolean(additionalReservationDraft.checkIn);`
- L7999: `const hasCheckOut = Boolean(additionalReservationDraft.checkOut);`
- L8000: `if (hasCheckIn && !hasCheckOut) {`
- L8002: `? 'Perfecto, mantenemos la reserva anterior y abrimos una nueva. ${buildAskMissingDate(pre.lang, "checkOut", "create")}'`
- L8004: `? 'Perfeito, mantemos a reserva anterior e abrimos uma nova. ${buildAskMissingDate(pre.lang, "checkOut", "create")}'`
- L8005: `: 'Perfect, we will keep the previous booking and open a new one. ${buildAskMissingDate(pre.lang, "checkOut", "create")}';`
- L8008: `if (!hasCheckIn && hasCheckOut) {`
- L8010: `? 'Perfecto, mantenemos la reserva anterior y abrimos una nueva. ${buildAskMissingDate(pre.lang, "checkIn", "create")}'`
- L8012: `? 'Perfeito, mantemos a reserva anterior e abrimos uma nova. ${buildAskMissingDate(pre.lang, "checkIn", "create")}'`
- L8013: `: 'Perfect, we will keep the previous booking and open a new one. ${buildAskMissingDate(pre.lang, "checkIn", "create")}';`
- L8016: `if (hasCheckIn && hasCheckOut) {`
- L8029: `additionalReservationDraft.checkIn!,`
- L8030: `additionalReservationDraft.checkOut!,`
- L8082: `checkIn: reservationCheckIn,`
- L8083: `checkOut: reservationCheckOut,`
- L8084: `numGuests: reservationGuests ? String(reservationGuests) : undefined,`
- L8110: `const inquiryCheckIn = availabilityInquirySlots.checkIn;`
- L8111: `const inquiryCheckOut = availabilityInquirySlots.checkOut;`
- L8112: `if (inquiryCheckIn && inquiryCheckOut) {`
- L8113: `const inquiryDateCoherence = assessReservationDateCoherence(inquiryCheckIn, inquiryCheckOut);`
- L8118: `const availabilityResult = await runAvailabilityCheck(availabilityPre, availabilityInquirySlots, inquiryCheckIn, inquiryCheckOut, {`

### 8148-8397

- L8213: `createDraftTemporalDates.checkIn \|\|`
- L8214: `createDraftTemporalDates.checkOut \|\|`
- L8215: `createDraftRawOrderedDates?.checkIn \|\|`
- L8216: `createDraftRawOrderedDates?.checkOut \|\|`
- L8217: `createDraftRelativeWeekendRange.checkIn \|\|`
- L8218: `createDraftRelativeWeekendRange.checkOut \|\|`
- L8219: `(pre.currSlots.checkIn && pre.currSlots.checkIn !== pre.prevSlotsStrict?.checkIn) \|\|`
- L8220: `(pre.currSlots.checkOut && pre.currSlots.checkOut !== pre.prevSlotsStrict?.checkOut)`
- L8223: `createDraftConsistency.sanitizedSlots.checkIn &&`
- L8224: `createDraftConsistency.sanitizedSlots.checkOut &&`
- L8226: `createDraftConsistency.sanitizedSlots.numGuests &&`
- L8245: `const readyCreateCheckIn = createDraftConsistency.sanitizedSlots.checkIn;`
- L8246: `const readyCreateCheckOut = createDraftConsistency.sanitizedSlots.checkOut;`
- L8247: `const readyCreateDateCoherence = assessReservationDateCoherence(readyCreateCheckIn, readyCreateCheckOut);`
- L8255: `readyCreateCheckIn!,`
- L8256: `readyCreateCheckOut!`
- L8336: `if (!quotedTurnDirectWeekdayMatch) return {} as { checkIn?: string; checkOut?: string };`
- L8341: `const checkIn = firstWeekdayOnOrAfter(baseIso, startWeekday);`
- L8342: `const checkOut = checkIn ? firstWeekdayStrictlyAfter(checkIn, endWeekday) : undefined;`
- L8343: `return checkIn && checkOut ? { checkIn, checkOut } : {};`
- L8345: `const quotedTurnSupportedDates = await extractSupportedTemporalDateRange(trimmedQuotedReply, pre.lang);`
- L8350: `quotedTurnSupportedDates.checkIn && quotedTurnSupportedDates.checkOut`
- L8352: `: quotedTurnRelativeWeekendRange.checkIn && quotedTurnRelativeWeekendRange.checkOut`
- L8354: `: quotedTurnDirectWeekdayRange.checkIn && quotedTurnDirectWeekdayRange.checkOut`
- L8356: `: quotedTurnRelativeWeekdayRange.checkIn && quotedTurnRelativeWeekdayRange.checkOut`
- L8358: `: quotedTurnSupportedDates.checkIn \|\| quotedTurnSupportedDates.checkOut`
- L8375: `quotedTurnSlots.numGuests \|\|`
- L8376: `quotedTurnSupportedDates.checkIn \|\|`
- L8377: `quotedTurnSupportedDates.checkOut \|\|`
- L8378: `quotedTurnRelativeWeekendRange.checkIn \|\|`
- L8379: `quotedTurnRelativeWeekendRange.checkOut \|\|`
- L8380: `quotedTurnDirectWeekdayRange.checkIn \|\|`
- L8381: `quotedTurnDirectWeekdayRange.checkOut \|\|`
- L8382: `quotedTurnRelativeWeekdayRange.checkIn \|\|`
- L8383: `quotedTurnRelativeWeekdayRange.checkOut \|\|`
- L8384: `quotedTurnSingleRelativeDate.checkIn \|\|`
- L8385: `quotedTurnSingleRelativeDate.checkOut`
- L8388: `quotedTurnSupportedDates.checkIn \|\|`
- L8389: `quotedTurnSupportedDates.checkOut \|\|`
- L8390: `quotedTurnRelativeWeekendRange.checkIn \|\|`

### 8398-8647

- L8428: `const requoteCheckIn = quotedDraftConsistency.sanitizedSlots.checkIn;`
- L8429: `const requoteCheckOut = quotedDraftConsistency.sanitizedSlots.checkOut;`
- L8430: `if (hasQuotedProposalDateCorrection && requoteCheckIn && requoteCheckOut) {`
- L8431: `const requoteCoherence = assessReservationDateCoherence(requoteCheckIn, requoteCheckOut);`
- L8439: `requoteCheckIn,`
- L8440: `requoteCheckOut`
- L8477: `createDraftConsistency.sanitizedSlots.checkIn \|\|`
- L8478: `createDraftConsistency.sanitizedSlots.checkOut \|\|`
- L8479: `createDraftConsistency.sanitizedSlots.numGuests \|\|`
- L8495: `turnExtractedCreateSlots.checkIn \|\|`
- L8496: `turnExtractedCreateSlots.checkOut \|\|`
- L8498: `turnExtractedCreateSlots.numGuests \|\|`
- L8547: `reservationCheckIn &&`
- L8548: `reservationCheckOut &&`
- L8556: `checkIn: reservationCheckIn,`
- L8557: `checkOut: reservationCheckOut,`
- L8558: `numGuests: String(reservationGuests),`
- L8594: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8595: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8596: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8600: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L8601: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`

### 8648-8897

- L8664: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8665: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8666: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8670: `if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);`
- L8671: `if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);`
- L8732: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8733: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8734: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8790: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8791: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8792: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8854: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8855: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8856: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`

### 8898-9147

- L8912: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8913: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8914: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L8968: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L8969: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L8970: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L9014: `const hasGuests = Boolean(pre.currSlots?.numGuests \|\| pre.st?.reservationSlots?.numGuests);`
- L9020: `(pre.currSlots?.checkIn \|\| pre.st?.reservationSlots?.checkIn) &&`
- L9021: `(pre.currSlots?.checkOut \|\| pre.st?.reservationSlots?.checkOut) &&`
- L9022: `(pre.currSlots?.numGuests \|\| pre.st?.reservationSlots?.numGuests) &&`
- L9025: `const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } \| undefined;`
- L9086: `checkIn: cancelledReservation.checkIn,`
- L9087: `checkOut: cancelledReservation.checkOut,`
- L9088: `numGuests: cancelledReservation.numGuests,`

### 9148-9397

- L9215: `checkIn: cancelledReservation.checkIn,`
- L9216: `checkOut: cancelledReservation.checkOut,`
- L9217: `numGuests: cancelledReservation.numGuests,`
- L9266: `const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);`
- L9267: `const time = offeredTimeSide === "checkin" ? confCheckIn : confCheckOut;`
- L9270: `? (offeredTimeSide === "checkin" ? 'El check-in comienza a las ${time}.' : 'El check-out es hasta las ${time}.')`
- L9272: `? (offeredTimeSide === "checkin" ? 'O check-in começa às ${time}.' : 'O check-out vai até ${time}.')`
- L9273: `: (offeredTimeSide === "checkin" ? 'Check-in starts at ${time}.' : 'Check-out is until ${time}.');`
- L9274: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`
- L9282: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`
- L9291: `nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";`

### 9398-9647

- L9408: `numGuests: nextSlots.numGuests \|\| currentPreviewSnapshot.numGuests,`
- L9409: `checkIn: nextSlots.checkIn \|\| currentPreviewSnapshot.checkIn,`
- L9410: `checkOut: nextSlots.checkOut \|\| currentPreviewSnapshot.checkOut,`
- L9416: `String(updatedPreviewSnapshot.numGuests \|\| "") !== String(currentPreviewSnapshot.numGuests \|\| "") \|\|`
- L9417: `String(updatedPreviewSnapshot.checkIn \|\| "") !== String(currentPreviewSnapshot.checkIn \|\| "") \|\|`
- L9418: `String(updatedPreviewSnapshot.checkOut \|\| "") !== String(currentPreviewSnapshot.checkOut \|\| "");`
- L9495: `const ci = nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L9496: `const co = nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L9498: `const ng = nextSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests;`
- L9520: `numGuests: ng,`
- L9521: `checkIn: ci,`
- L9522: `checkOut: co,`
- L9566: `numGuests: ng,`
- L9567: `checkIn: ci,`
- L9568: `checkOut: co,`
- L9630: `if (!snapshot.roomType \|\| !snapshot.checkIn \|\| !snapshot.checkOut) {`
- L9631: `finalText = buildAskMissingDate(pre.lang, !snapshot.checkIn ? "checkIn" : "checkOut");`
- L9634: `const createDateCoherence = assessReservationDateCoherence(snapshot.checkIn, snapshot.checkOut);`

### 9648-9897

- L9652: `checkIn: snapshot.checkIn,`
- L9653: `checkOut: snapshot.checkOut,`
- L9654: `numGuests: snapshot.numGuests,`
- L9677: `checkIn: snapshot.checkIn,`
- L9678: `checkOut: snapshot.checkOut,`
- L9679: `numGuests: snapshot.numGuests,`
- L9698: `checkIn: canonicalRecordForReply.checkIn,`
- L9699: `checkOut: canonicalRecordForReply.checkOut,`
- L9700: `numGuests: canonicalRecordForReply.numGuests,`
- L9707: `? '✅ ¡Reserva confirmada! Código **${result.reservationId ?? "pendiente"}**.\nHabitación **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Fechas **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySn`
- L9709: `? '✅ Reserva confirmada! Código **${result.reservationId ?? "pendente"}**.\nQuarto **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Datas **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySnapshot.`
- L9710: `: '✅ Booking confirmed! Code **${result.reservationId ?? "pending"}**.\nRoom **${localizeRoomType(replySnapshot.roomType, pre.lang)}**, Dates **${replySnapshot.checkIn} → ${replySnapshot.checkOut}**${replySnapshot.numGue`
- L9760: `const postBookingLateCheckoutQ = detectLateCheckoutQuestion(kbUserText, pre.lang);`
- L9761: `const postBookingEarlyCheckinQ = detectEarlyCheckinQuestion(kbUserText, pre.lang);`
- L9762: `const postBookingTimeQ = detectCheckinOrCheckoutTimeQuestion(kbUserText, pre.lang);`
- L9807: `checkIn: canonicalRecord.checkIn,`
- L9808: `checkOut: canonicalRecord.checkOut,`
- L9809: `numGuests: canonicalRecord.numGuests,`
- L9819: `checkIn: canonicalSlots.checkIn \|\| supplementalSlots.checkIn,`
- L9820: `checkOut: canonicalSlots.checkOut \|\| supplementalSlots.checkOut,`
- L9821: `numGuests: canonicalSlots.numGuests \|\| supplementalSlots.numGuests,`
- L9838: `if (postBookingLateCheckoutQ && hasConfirmedBookingContext) {`
- L9839: `finalText = buildLateCheckoutResponse(pre.lang, kbGuestState);`
- L9840: `nextCategory = "checkout_info";`
- L9843: `if (postBookingEarlyCheckinQ && hasConfirmedBookingContext) {`
- L9845: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L9846: `finalText = buildEarlyCheckinResponse(pre.lang, kbGuestState, {`
- L9847: `checkInTime: confCheckIn,`
- L9850: `nextCategory = "checkin_info";`
- L9856: `const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);`
- L9857: `const asksCheckOut = detectDateSideFromText(kbUserText) === "checkOut" \|\| /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(kbUserText);`
- L9858: `const time = asksCheckOut ? confCheckOut : confCheckIn;`
- L9861: `? (asksCheckOut ? 'El check-out es hasta las ${time}.' : 'El check-in comienza a las ${time}.')`
- L9863: `? (asksCheckOut ? 'O check-out vai até ${time}.' : 'O check-in começa às ${time}.')`
- L9864: `: (asksCheckOut ? 'Check-out is until ${time}.' : 'Check-in starts at ${time}.'))`
- L9870: `nextCategory = asksCheckOut ? "checkout_info" : "checkin_info";`
- L9878: `nextCategory = /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(kbUserText) ? "checkout_info" : "checkin_info";`

### 9898-10147

- L10056: `extractSlotsFromText(kbUserText, pre.lang).checkIn \|\|`
- L10057: `extractSlotsFromText(kbUserText, pre.lang).checkOut \|\|`
- L10059: `extractSlotsFromText(kbUserText, pre.lang).numGuests \|\|`
- L10061: `extractRawOrderedDateRange(kbUserText)?.checkIn`
- L10067: `nextCategory === "checkin_info" \|\|`
- L10068: `nextCategory === "checkout_info" \|\|`

### 10148-10397

- L10195: `if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {`
- L10196: `merged.numGuests = String((merged as any).numGuests);`
- L10356: `const noNewChangeData = !userDatesNow.checkIn && !userDatesNow.checkOut && !userMentionedSide && !userAffirmAfterVerify;`
- L10366: `const mentionsChangeDates = /\b(fechas\|fecha\|dates\|date\|datas\|data\|check-in\|check out\|check-out\|entrada\|salida\|ingreso)\b/i.test(normalizedUserTxt);`
- L10368: `const mentionsChangeGuests = /\b(cantidad de huespedes\|cantidad de huéspedes\|huespedes\|huéspedes\|personas\|guests\|pessoas)\b/i.test(normalizedUserTxt);`
- L10395: `const hasImmediateDateValue = Boolean(immediateDateRange?.checkIn && immediateDateRange?.checkOut);`
- L10396: `const hasImmediateGuestValue = Boolean(immediateTurnSlots.numGuests);`

### 10398-10647

- L10398: `const temporalUserDates = await extractSupportedTemporalDateRange(userTxt, pre.lang);`
- L10399: `const temporalSideIntent = detectModifyTemporalSideIntent(userTxt, temporalUserDates);`
- L10400: `const hasTemporalModifySignal = hasModifyDatesEntrySignal(`
- L10401: `temporalSideIntent,`
- L10402: `temporalUserDates,`
- L10422: `hasTemporalModifySignal &&`
- L10426: `const partialModifySlots = buildModifyPartialDateSlots(knownSlots, temporalUserDates, temporalSideIntent);`
- L10439: `finalText = temporalSideIntent`
- L10440: `? buildAskMissingDate(pre.lang, temporalSideIntent === "checkIn" ? "checkOut" : "checkIn")`
- L10485: `if (activeField === "dates" && ingestedSlots.checkIn && ingestedSlots.checkOut) {`
- L10553: `const guestsFromText = extractSlotsFromText(String(pre.msg.content \|\| ""), pre.lang).numGuests;`
- L10557: `const prevGuestsVal = pre.prevSlotsStrict?.numGuests \|\| pre.st?.reservationSlots?.numGuests \|\| "";`
- L10559: `const haveDatesNow = Boolean((nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut));`
- L10564: `if (pre.inModifyMode && wantsGenericModify(String(pre.msg.content \|\| ""), pre.lang) && (nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut)) {`
- L10573: `numGuests: resolvedModifyTarget.numGuests,`
- L10574: `checkIn: resolvedModifyTarget.checkIn,`
- L10575: `checkOut: resolvedModifyTarget.checkOut,`
- L10596: `const userDates = await extractSupportedTemporalDateRange(String(pre.msg.content \|\| ""), pre.lang);`
- L10608: `const lateCheckoutQ = detectLateCheckoutQuestion(String(pre.msg.content \|\| ""), pre.lang);`
- L10609: `const earlyCheckinQ = detectEarlyCheckinQuestion(String(pre.msg.content \|\| ""), pre.lang);`
- L10611: `const timeQ = detectCheckinOrCheckoutTimeQuestion(String(pre.msg.content \|\| ""), pre.lang);`
- L10625: `const currentTurnCreateSlots = attributeSingleWordDateToPendingCreateCheckout(`
- L10632: `const shouldMergeCreateTemporalDates =`
- L10637: `const currentTurnCreateTemporalSlots = shouldMergeCreateTemporalDates`
- L10641: `checkIn: currentTurnCreateTemporalSlots.checkIn,`
- L10642: `checkOut: currentTurnCreateTemporalSlots.checkOut,`
- L10643: `roomType: currentTurnCreateTemporalSlots.roomType,`
- L10644: `numGuests: currentTurnCreateTemporalSlots.numGuests,`
- L10645: `guestName: currentTurnCreateTemporalSlots.guestName,`

### 10648-10897

- L10650: `currentTurnCreateTemporalSlots.checkIn &&`
- L10651: `currentTurnCreateTemporalSlots.checkOut &&`
- L10652: `currentTurnCreateTemporalSlots.roomType &&`
- L10653: `currentTurnCreateTemporalSlots.numGuests &&`
- L10654: `isSafeGuestName(currentTurnCreateTemporalSlots.guestName \|\| "")`
- L10658: `userDates.checkIn \|\|`
- L10659: `userDates.checkOut \|\|`
- L10660: `currentTurnCreateTemporalSlots.checkIn \|\|`
- L10661: `currentTurnCreateTemporalSlots.checkOut \|\|`
- L10662: `currentTurnRelativeWeekendRange.checkIn \|\|`
- L10663: `currentTurnRelativeWeekendRange.checkOut`
- L10677: `Boolean(currentTurnRelativeWeekendRange.checkIn && currentTurnRelativeWeekendRange.checkOut) \|\|`
- L10684: `currentTurnCreateTemporalSlots.checkIn &&`
- L10685: `currentTurnCreateTemporalSlots.checkOut &&`
- L10686: `currentTurnCreateTemporalSlots.roomType &&`
- L10687: `currentTurnCreateTemporalSlots.numGuests &&`
- L10688: `isSafeGuestName(currentTurnCreateTemporalSlots.guestName \|\| "")`
- L10693: `checkIn: currentTurnCreateTemporalSlots.checkIn,`
- L10694: `checkOut: currentTurnCreateTemporalSlots.checkOut,`
- L10695: `roomType: currentTurnCreateTemporalSlots.roomType,`
- L10696: `numGuests: currentTurnCreateTemporalSlots.numGuests,`
- L10697: `guestName: currentTurnCreateTemporalSlots.guestName,`
- L10705: `!lateCheckoutQ &&`
- L10706: `!earlyCheckinQ &&`
- L10707: `(pre.inModifyMode \|\| mentionsDates \|\| hasAnyDateToken \|\| Boolean(userDates.checkIn \|\| userDates.checkOut));`
- L10709: `if (lateCheckoutQ) {`
- L10710: `finalText = buildLateCheckoutResponse(pre.lang, guestState);`
- L10711: `nextCategory = "checkout_info";`
- L10713: `} else if (earlyCheckinQ) {`
- L10715: `const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);`
- L10716: `finalText = buildEarlyCheckinResponse(pre.lang, guestState, {`
- L10717: `checkInTime: confCheckIn,`
- L10720: `nextCategory = "checkin_info";`
- L10730: `const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);`
- L10731: `const asksCheckOut = detectDateSideFromText(String(pre.msg.content \|\| "")) === "checkOut" \|\| /check\s*-?out\|salida\|egreso\|retirada\|partida\|sa[ií]da/i.test(String(pre.msg.content \|\| ""));`
- L10732: `const time = asksCheckOut ? confCheckOut : confCheckIn;`
- L10735: `? (asksCheckOut ? 'El check-out es hasta las ${time}.' : 'El check-in comienza a las ${time}.')`
- L10737: `? (asksCheckOut ? 'O check-out vai até ${time}.' : 'O check-in começa às ${time}.')`
- L10738: `: (asksCheckOut ? 'Check-out is until ${time}.' : 'Check-in starts at ${time}.');`
- L10746: `nextCategory = asksCheckOut ? "checkout_info" : "checkin_info";`

### 10898-11147

- L10921: `nextSlots.checkIn = ciISO; nextSlots.checkOut = coISO;`
- L10942: `const ciISO = pendingAvailabilityVerification?.checkIn \|\| proposed.checkIn \|\| nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L10943: `const coISO = pendingAvailabilityVerification?.checkOut \|\| proposed.checkOut \|\| nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L10945: `checkIn: ciISO,`
- L10946: `checkOut: coISO,`
- L10951: `checkIn: createQuoteSlots.checkIn,`
- L10952: `checkOut: createQuoteSlots.checkOut,`
- L10954: `numGuests: createQuoteSlots.numGuests,`
- L10973: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L11001: `numGuests: modifyTarget.numGuests \|\| nextSlots.numGuests \|\| pre.st?.reservationSlots?.numGuests,`
- L11002: `checkIn: ciISO,`
- L11003: `checkOut: coISO,`
- L11024: `checkIn: ciISO,`
- L11025: `checkOut: coISO,`
- L11060: `const missing = !ciISO ? "checkIn" : !coISO ? "checkOut" : undefined;`
- L11078: `const ciISO = proposed.checkIn \|\| nextSlots.checkIn \|\| pre.st?.reservationSlots?.checkIn;`
- L11079: `const coISO = proposed.checkOut \|\| nextSlots.checkOut \|\| pre.st?.reservationSlots?.checkOut;`
- L11081: `checkIn: ciISO,`
- L11082: `checkOut: coISO,`
- L11087: `checkIn: createQuoteSlots.checkIn,`
- L11088: `checkOut: createQuoteSlots.checkOut,`
- L11090: `numGuests: createQuoteSlots.numGuests,`
- L11109: `if (missingField && (pre.msg.channel === "email" \|\| missingField === "checkIn" \|\| missingField === "checkOut" \|\| missingField === "roomType")) {`
- L11146: `const missing = !ciISO ? "checkIn" : "checkOut";`

### 11148-11397

- L11155: `: "I had an issue checking availability. Could you try again?";`
- L11189: `focusTurnExtractedSlots.checkIn \|\|`
- L11190: `focusTurnExtractedSlots.checkOut \|\|`
- L11192: `focusTurnExtractedSlots.numGuests \|\|`
- L11194: `extractRawOrderedDateRange(String(pre.msg.content \|\| ""))?.checkIn`
- L11258: `quotedReservationSnapshot.checkIn &&`
- L11259: `quotedReservationSnapshot.checkOut &&`
- L11260: `quotedReservationSnapshot.numGuests &&`
- L11269: `quotedReservationSnapshot.checkIn &&`
- L11270: `quotedReservationSnapshot.checkOut &&`
- L11271: `quotedReservationSnapshot.numGuests &&`

### 11398-11647

- L11558: `const hasDates = Boolean(slots.checkIn && slots.checkOut);`
- L11585: `const RE_CHANGE_GUESTS = /(cambiar\|modificar\|alterar\|change)\s+(hu[eé]spedes\|huespedes\|personas\|guests\|pessoas)/i;`

### 11648-11813

- L11658: `const hasDates = Boolean(slots.checkIn && slots.checkOut);`
- L11665: `numGuests: slots.numGuests,`
- L11666: `checkIn: slots.checkIn,`
- L11667: `checkOut: slots.checkOut,`
- L11716: `const checkIn = isoToDDMMYYYY(target.checkIn) \|\| target.checkIn \|\| (lang === "pt" ? "sem data" : lang === "en" ? "no date" : "sin fecha");`
- L11717: `const checkOut = isoToDDMMYYYY(target.checkOut) \|\| target.checkOut \|\| (lang === "pt" ? "sem data" : lang === "en" ? "no date" : "sin fecha");`
- L11727: `'${target.reservationId} · ${statusLabel}${target.guestName ? ' · em nome de ${target.guestName}' : ""}${roomType ? ' · quarto: ${roomType}' : ""} · ${checkIn} → ${checkOut}${target.numGuests ? ' · hóspedes: ${target.num`
- L11734: `'${target.reservationId} · ${statusLabel}${target.guestName ? ' · under ${target.guestName}' : ""}${roomType ? ' · room: ${roomType}' : ""} · ${checkIn} → ${checkOut}${target.numGuests ? ' · guests: ${target.numGuests}' `
- L11740: `'${target.reservationId} · ${statusLabel}${target.guestName ? ' · a nombre de ${target.guestName}' : ""}${roomType ? ' · habitación: ${roomType}' : ""} · ${checkIn} → ${checkOut}${target.numGuests ? ' · huéspedes: ${targ`
- L11785: `checkIn: pre.st?.reservationSlots?.checkIn \|\| nextSlots.checkIn,`
- L11786: `checkOut: pre.st?.reservationSlots?.checkOut \|\| nextSlots.checkOut,`
- L11787: `numGuests: pre.st?.reservationSlots?.numGuests \|\| nextSlots.numGuests,`
- L11804: `const hasReservationContext = Boolean(pre?.st?.lastReservation \|\| pre?.st?.reservationSlots?.checkIn \|\| pre?.st?.reservationSlots?.reservationId);`

