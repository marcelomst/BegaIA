# HITO 1 — Auditoría técnica de todas las plantillas KB

```json
{
  "support/channel_manager": {
    "missingFromHotelConfig": [
      "channelConfigs.channelManager.enabled",
      "channelConfigs.channelManager.username",
      "channelConfigs.channelManager.lastSync",
      "channelConfigs.channelManager.provider"
    ],
    "unusedConfigFields": ["channelConfigs.web", "channelConfigs.whatsapp"],
    "tokensMissingInDBVersion": [
      "channelConfigs.channelManager.enabled",
      "channelConfigs.channelManager.username",
      "channelConfigs.channelManager.lastSync",
      "channelConfigs.channelManager.provider"
    ],
    "differencesSeedVsDB": ["No plantilla correspondiente en hotel_content"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "retrieval_based/kb_general": {
    "missingFromHotelConfig": [
      "hotel.name",
      "hotel.address",
      "hotel.website",
      "hotel.notes"
    ],
    "unusedConfigFields": [
      "hotelId",
      "hotelName",
      "defaultLanguage",
      "timezone",
      "users",
      "channelConfigs",
      "emailSettings",
      "verification",
      "lastUpdated"
    ],
    "tokensMissingInDBVersion": [
      "hotel.name",
      "hotel.address",
      "hotel.website",
      "hotel.notes"
    ],
    "differencesSeedVsDB": [
      "Seed usa tokens, plantilla DB es solo texto descriptivo"
    ],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "retrieval_based/room_info": {
    "missingFromHotelConfig": [
      "rooms[].name",
      "rooms[].capacity",
      "rooms[].beds",
      "rooms[].images"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "rooms[].name",
      "rooms[].capacity",
      "rooms[].beds",
      "rooms[].images"
    ],
    "differencesSeedVsDB": [
      "Seed usa [[each: rooms]] y tokens, plantilla DB es solo texto"
    ],
    "invalidEachBlocks": [
      "rooms (no existe rooms en hotel_config de hotel999)"
    ],
    "invalidJoinBlocks": [
      "images (no existe rooms[].images en hotel_config de hotel999)"
    ],
    "summary": "ISSUES"
  },
  "retrieval_based/room_info_img": {
    "missingFromHotelConfig": [
      "rooms[].name",
      "rooms[].icon",
      "rooms[].capacity",
      "rooms[].bed",
      "rooms[].view",
      "rooms[].images"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "rooms[].name",
      "rooms[].icon",
      "rooms[].capacity",
      "rooms[].bed",
      "rooms[].view",
      "rooms[].images"
    ],
    "differencesSeedVsDB": [
      "Seed usa [[each: rooms]] y tokens, plantilla DB es solo texto"
    ],
    "invalidEachBlocks": [
      "rooms (no existe rooms en hotel_config de hotel999)"
    ],
    "invalidJoinBlocks": [
      "images (no existe rooms[].images en hotel_config de hotel999)"
    ],
    "summary": "ISSUES"
  },
  "retrieval_based/arrivals_transport": {
    "missingFromHotelConfig": [
      "transport.airports[].code",
      "transport.airports[].name",
      "transport.airports[].distanceKm",
      "transport.airports[].driveTime",
      "transport.privateTransfer.available",
      "transport.privateTransfer.notes",
      "transport.taxi.notes",
      "transport.bus.notes"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "transport.airports[].code",
      "transport.airports[].name",
      "transport.airports[].distanceKm",
      "transport.airports[].driveTime",
      "transport.privateTransfer.available",
      "transport.privateTransfer.notes",
      "transport.taxi.notes",
      "transport.bus.notes"
    ],
    "differencesSeedVsDB": ["No plantilla correspondiente en hotel_content"],
    "invalidEachBlocks": [
      "transport.airports (no existe en hotel_config de hotel999)"
    ],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "amenities/amenities_list": {
    "missingFromHotelConfig": [
      "schedules.breakfast",
      "amenities.poolSchedule",
      "amenities.gymSchedule",
      "amenities.spaSchedule",
      "amenities.parkingNotes",
      "policies.pets"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "schedules.breakfast",
      "amenities.poolSchedule",
      "amenities.gymSchedule",
      "amenities.spaSchedule",
      "amenities.parkingNotes",
      "policies.pets"
    ],
    "differencesSeedVsDB": ["No plantilla correspondiente en hotel_content"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "billing/payments_and_billing": {
    "missingFromHotelConfig": [
      "payments.methods",
      "payments.currencies",
      "payments.currency",
      "payments.notes",
      "payments.requiresCardForBooking",
      "billing.issuesInvoices",
      "billing.invoiceNotes"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "payments.methods",
      "payments.currencies",
      "payments.currency",
      "payments.notes",
      "payments.requiresCardForBooking",
      "billing.issuesInvoices",
      "billing.invoiceNotes"
    ],
    "differencesSeedVsDB": ["No plantilla correspondiente en hotel_content"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": ["payments.methods", "payments.currencies"],
    "summary": "ISSUES"
  },
  "billing/invoice_receipts": {
    "missingFromHotelConfig": [
      "billing.documentTypes",
      "billing.requirements",
      "billing.issuingTime",
      "billing.delivery"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "billing.documentTypes",
      "billing.requirements",
      "billing.issuingTime",
      "billing.delivery"
    ],
    "differencesSeedVsDB": ["No plantilla correspondiente en hotel_content"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": ["billing.documentTypes"],
    "summary": "ISSUES"
  },
  "support/contact_support": {
    "missingFromHotelConfig": [
      "contacts.phone",
      "contacts.whatsapp",
      "contacts.email",
      "contacts.website",
      "contacts.hours",
      "channelConfigs.web.enabled",
      "channelConfigs.whatsapp.enabled",
      "channelConfigs.email.enabled"
    ],
    "unusedConfigFields": ["channelConfigs.web", "channelConfigs.whatsapp"],
    "tokensMissingInDBVersion": [
      "contacts.phone",
      "contacts.whatsapp",
      "contacts.email",
      "contacts.website",
      "contacts.hours",
      "channelConfigs.web.enabled",
      "channelConfigs.whatsapp.enabled",
      "channelConfigs.email.enabled"
    ],
    "differencesSeedVsDB": ["No plantilla correspondiente en hotel_content"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "cancel_reservation/cancellation_policy": {
    "missingFromHotelConfig": [
      "policies.cancellation.flexible",
      "policies.cancellation.nonRefundable",
      "policies.cancellation.channels",
      "policies.cancellation.noShow"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "policies.cancellation.flexible",
      "policies.cancellation.nonRefundable",
      "policies.cancellation.channels",
      "policies.cancellation.noShow"
    ],
    "differencesSeedVsDB": ["No plantilla correspondiente en hotel_content"],
    "invalidEachBlocks": ["policies.cancellation.channels"],
    "invalidJoinBlocks": ["policies.cancellation.channels"],
    "summary": "ISSUES"
  },
  "reservation/reservation_flow": {
    "missingFromHotelConfig": [
      "reservation.required.dates",
      "reservation.required.guests",
      "reservation.required.room",
      "reservation.required.contact",
      "reservation.required.guarantee",
      "reservation.required.policies"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "reservation.required.dates",
      "reservation.required.guests",
      "reservation.required.room",
      "reservation.required.contact",
      "reservation.required.guarantee",
      "reservation.required.policies"
    ],
    "differencesSeedVsDB": ["Seed usa tokens, plantilla DB es solo texto"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "reservation/modify_reservation": {
    "missingFromHotelConfig": [
      "reservation.modify.locateBy",
      "reservation.modify.fields",
      "reservation.modify.newValue",
      "reservation.modify.rules",
      "reservation.modify.confirmation"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "reservation.modify.locateBy",
      "reservation.modify.fields",
      "reservation.modify.newValue",
      "reservation.modify.rules",
      "reservation.modify.confirmation"
    ],
    "differencesSeedVsDB": ["Seed usa tokens, plantilla DB es solo texto"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "reservation_snapshot/reservation_snapshot": {
    "missingFromHotelConfig": [
      "reservation.snapshot.code",
      "reservation.snapshot.name",
      "reservation.snapshot.dates",
      "reservation.snapshot.room",
      "reservation.snapshot.total",
      "reservation.snapshot.status"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "reservation.snapshot.code",
      "reservation.snapshot.name",
      "reservation.snapshot.dates",
      "reservation.snapshot.room",
      "reservation.snapshot.total",
      "reservation.snapshot.status"
    ],
    "differencesSeedVsDB": ["Seed usa tokens, plantilla DB es solo texto"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "reservation_verify/reservation_verify": {
    "missingFromHotelConfig": [
      "reservation.verify.availability",
      "reservation.verify.priceCurrency",
      "reservation.verify.guestData",
      "reservation.verify.guarantee",
      "reservation.verify.policies"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "reservation.verify.availability",
      "reservation.verify.priceCurrency",
      "reservation.verify.guestData",
      "reservation.verify.guarantee",
      "reservation.verify.policies"
    ],
    "differencesSeedVsDB": ["Seed usa tokens, plantilla DB es solo texto"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  },
  "amenities/ev_charging": {
    "missingFromHotelConfig": [
      "amenities.evCharging.location",
      "amenities.evCharging.connectorType",
      "amenities.evCharging.power",
      "amenities.evCharging.cost",
      "amenities.evCharging.hours",
      "amenities.evCharging.requirements",
      "amenities.evCharging.nearbyAlternatives"
    ],
    "unusedConfigFields": [],
    "tokensMissingInDBVersion": [
      "amenities.evCharging.location",
      "amenities.evCharging.connectorType",
      "amenities.evCharging.power",
      "amenities.evCharging.cost",
      "amenities.evCharging.hours",
      "amenities.evCharging.requirements",
      "amenities.evCharging.nearbyAlternatives"
    ],
    "differencesSeedVsDB": ["No plantilla correspondiente en hotel_content"],
    "invalidEachBlocks": [],
    "invalidJoinBlocks": [],
    "summary": "ISSUES"
  }
}
```
