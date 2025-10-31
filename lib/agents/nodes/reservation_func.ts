export async function handleReservationNode(state: typeof GS.State) {
    // ...
    debugLog('[Graph] Enter handleReservationNode', { state });
    const {
        detectedLanguage,
        reservationSlots,
        normalizedMessage,
        hotelId,
        conversationId,
        salesStage,
    } = state;
    type ChannelType = "web" | "email" | "whatsapp" | "channelManager";
    const metaChannel = (state.meta as Record<string, unknown> | undefined)?.channel;
    const channel: ChannelType =
        metaChannel === "email" || metaChannel === "whatsapp" || metaChannel === "channelManager"
            ? metaChannel
            : "web";
    const cfg = await getHotelConfig(hotelId).catch((err) => {
        console.error("[graph] Error en getHotelConfig:", err);
        return null;
    });
    const hotelTz =
        cfg?.timezone ||
        (await getHotelConfig(hotelId).catch((err) => {
            console.error("[graph] Error en getHotelConfig (timezone):", err);
            return null;
        }))?.timezone || "UTC";
    const lang2 = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
    const locale = lang2;
    const expectedSlot = inferExpectedSlotFromHistory(state.messages, lang2);

    // Normalizador: fuerza número válido o undefined (evita NaN)
    const toInt = (v: unknown) => {
        if (v === undefined || v === null || v === "") return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };
    // Snapshot persistido  turn
    const st = await getConvState(hotelId, conversationId || "");
    const persistedStr = normalizeSlotsToStrings(normalizeSlots(st?.reservationSlots || {}));
    const turnStr = normalizeSlotsToStrings(normalizeSlots(reservationSlots || {}));
    const merged: SlotMap = { ...persistedStr, ...turnStr };
    const signals = extractSlotsFromText(normalizedMessage, lang2) as Partial<SlotMap>;
    const signalsStr = Object.keys(signals).length
        ? `\n\nSeñales detectadas (no confirmadas): ${JSON.stringify(signals)}`
        : "";

    // ...existing code...
    const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
    if (haveAllNow) {
        const ci = new Date(merged.checkIn!);
        const co = new Date(merged.checkOut!);
        if (
            !(ci instanceof Date && !isNaN(ci.valueOf())) ||
            !(co instanceof Date && !isNaN(co.valueOf())) ||
            ci >= co
        ) {
            const text =
                lang2 === "es"
                    ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
                    : lang2 === "pt"
                        ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
                        : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
            return {
                messages: [new AIMessage(text)],
                reservationSlots: { ...merged },
                category: "reservation",
                salesStage: "qualify",
            };
        }
        const completeSnapshot = { ...merged, locale };
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...completeSnapshot,
                numGuests: toInt((completeSnapshot as any).numGuests),
            },
            updatedBy: "ai",
        });
        try {
            const res = await runAvailabilityCheck(
                {
                    lang: lang2,
                    lcHistory: state.messages as any,
                    st: await getConvState(hotelId, conversationId || ""),
                    msg: { hotelId },
                    conversationId: conversationId || "",
                } as any,
                completeSnapshot as any,
                completeSnapshot.checkIn!,
                completeSnapshot.checkOut!
            );
            const confirmLine =
                lang2 === "es"
                    ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                    : lang2 === "pt"
                        ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                        : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
            return {
                messages: [
                    new AIMessage(res.finalText + (res.finalText.includes("CONFIRMAR") ? "" : confirmLine)),
                ],
                reservationSlots: completeSnapshot,
                category: "reservation",
                salesStage: "quote",
            };
        } catch (err) {
            console.error("[graph] runAvailabilityCheck error", err);
            return {
                messages: [
                    new AIMessage(
                        lang2 === "es"
                            ? "Perdón, tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
                            : lang2 === "pt"
                                ? "Desculpe, tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
                                : "Sorry, I had a problem checking availability. Could you try again?"
                    ),
                ],
                reservationSlots: completeSnapshot,
                category: "reservation",
                salesStage: "followup",
            };
        }
    }
    const augmentedUserText =
        normalizedMessage +
        (Object.keys(merged).length ? `\n\nDatos previos conocidos: ${JSON.stringify(merged)}` : "") +
        signalsStr +
        `\n\nNota: Locale conocido: ${locale}. No lo pidas; usá este valor si fuera necesario.`;

    let filled: any;
    try {
        const prevSlotsForLLM = {
            guestName: merged.guestName,
            roomType: merged.roomType,
            checkIn: merged.checkIn,
            checkOut: merged.checkOut,
            numGuests: merged.numGuests ? parseInt(`${merged.numGuests}`, 10) : undefined,
            locale,
        } as const;
        filled = await fillSlotsWithLLM(augmentedUserText, locale, {
            hotelTz,
            prevSlots: prevSlotsForLLM,
        });
    } catch {
        console.timeLog("fillSlotsWithLLM");
        const missing = REQUIRED_SLOTS.filter((k) => !merged[k]);
        const q = ONE_QUESTION_PER_TURN && missing.length
            ? buildSingleSlotQuestion(missing[0], lang2)
            : buildAggregatedQuestion(missing, lang2);
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...merged,
                numGuests: toInt((merged as any).numGuests),
            },
            salesStage: "qualify",
            updatedBy: "ai",
        });
        return {
            messages: [new AIMessage(q)],
            reservationSlots: merged,
            category: "reservation",
            salesStage: "qualify",
        };
    }
    if (state.salesStage === "close") {
        return await retrievalBased({ ...state, forceVectorSearch: true });
    }
    if (isConfirmIntentLight(normalizedMessage)) {
        // const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
        if (haveAllNow) {
            const toISODateTime = (d: string) => (d && d.length === 10 ? `${d}T00:00:00Z` : d);
            const completeSnapshot = {
                ...merged,
                checkIn: toISODateTime(merged.checkIn!),
                checkOut: toISODateTime(merged.checkOut!),
                locale,
            };
            await upsertConvState(hotelId, conversationId || "", {
                reservationSlots: {
                    ...completeSnapshot,
                    numGuests: toInt((completeSnapshot as any).numGuests),
                },
                updatedBy: "ai",
            });
            const result = await confirmAndCreate(
                hotelId,
                {
                    guestName: completeSnapshot.guestName!,
                    roomType: completeSnapshot.roomType!,
                    numGuests: toInt((completeSnapshot as any).numGuests) ?? 1,
                    checkIn: completeSnapshot.checkIn!,
                    checkOut: completeSnapshot.checkOut!,
                    locale,
                },
                channel
            );
            if (result.ok) {
                await upsertConvState(hotelId, conversationId || "", {
                    lastReservation: {
                        reservationId: result.reservationId || "",
                        status: "created",
                        createdAt: new Date().toISOString(),
                        channel: typeof channel === "string" ? channel : "web",
                    },
                    salesStage: "close",
                    updatedBy: "ai",
                });
            }
            const showRt = localizeRoomType(completeSnapshot.roomType, lang2);
            const guestFirst = firstNameOf(completeSnapshot.guestName);
            let msg;
            if (result.ok) {
                if (lang2 === "es") {
                    msg = `✅ ¡Reserva confirmada! Código **${result.reservationId ?? "pendiente"}**.\nHabitación **${showRt}**, Fechas **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** huésped(es)` : ""}. ¡Gracias, ${guestFirst || completeSnapshot.guestName}!\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`;
                } else if (lang2 === "pt") {
                    msg = `✅ Reserva confirmada! Código **${result.reservationId ?? "pendente"}**.\nQuarto **${showRt}**, Datas **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** hóspede(s)` : ""}. Obrigado, ${guestFirst || completeSnapshot.guestName}!\n\nConfirma a reserva respondendo “CONFIRMAR”.`;
                } else {
                    msg = `✅ Booking confirmed! Code **${result.reservationId ?? "pending"}**.\nRoom **${showRt}**, Dates **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** guest(s)` : ""}. Thank you, ${guestFirst || completeSnapshot.guestName}!\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).`;
                }
            } else {
                msg = result.message;
            }
            return {
                messages: [new AIMessage(msg)],
                reservationSlots: {},
                category: "reservation",
                salesStage: "close",
            };
        }
    }
    // const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
    // ...existing code...
    if (haveAllNow) {
        const ci = new Date(merged.checkIn!);
        const co = new Date(merged.checkOut!);
        if (
            !(ci instanceof Date && !isNaN(ci.valueOf())) ||
            !(co instanceof Date && !isNaN(co.valueOf())) ||
            ci >= co
        ) {
            const text =
                lang2 === "es"
                    ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
                    : lang2 === "pt"
                        ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
                        : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
            return {
                messages: [new AIMessage(text)],
                reservationSlots: { ...merged },
                category: "reservation",
                salesStage: "qualify",
            };
        }
        const completeSnapshot = { ...merged, locale };
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...completeSnapshot,
                numGuests: toInt((completeSnapshot as any).numGuests),
            },
            updatedBy: "ai",
        });
        try {
            const res = await confirmAndCreate(
                hotelId,
                {
                    guestName: completeSnapshot.guestName!,
                    roomType: completeSnapshot.roomType!,
                    numGuests: toInt((completeSnapshot as any).numGuests) ?? 1,
                    checkIn: completeSnapshot.checkIn!,
                    checkOut: completeSnapshot.checkOut!,
                    locale,
                },
                channel
            );
            const confirmLine =
                lang2 === "es"
                    ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                    : lang2 === "pt"
                        ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                        : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
            return {
                messages: [
                    new AIMessage(res.message + (res.message.includes("CONFIRMAR") ? "" : confirmLine)),
                ],
                reservationSlots: completeSnapshot,
                category: "reservation",
                salesStage: "quote",
            };
        } catch (err) {
            console.error("[graph] runAvailabilityCheck error", err);
            return {
                messages: [
                    new AIMessage(
                        lang2 === "es"
                            ? "Tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
                            : lang2 === "pt"
                                ? "Tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
                                : "I had an issue checking availability. Could you try again?"
                    ),
                ],
                reservationSlots: completeSnapshot,
                category: "reservation",
                salesStage: "followup",
            };
        }
    }
    if (filled.need === "question") {
        const partialRaw = filled.partial ?? {};
        const partial = sanitizePartial(normalizeSlots(partialRaw), merged, normalizedMessage);
        const nextSnapshot: Record<string, any> = {
            ...merged,
            ...(partial.guestName ? { guestName: partial.guestName } : {}),
            ...(partial.roomType ? { roomType: partial.roomType } : {}),
            ...(partial.numGuests ? { numGuests: toInt((partial as any).numGuests) } : {}),
            ...(partial.checkIn ? { checkIn: partial.checkIn } : {}),
            ...(partial.checkOut ? { checkOut: partial.checkOut } : {}),
            locale,
        };
        if (!nextSnapshot.numGuests && expectedSlot === "numGuests") {
            const g = extractGuests(normalizedMessage);
            if (g) {
                const n = parseInt(g, 10);
                const cl = clampGuests(n, nextSnapshot.roomType);
                if (typeof cl === "number") {
                    nextSnapshot.numGuests = `${cl}`;
                }
                if (typeof cl === "number") nextSnapshot.numGuests = cl;
            }
        }
        const missingOrder: RequiredSlot[] = [
            "guestName",
            "roomType",
            "checkIn",
            "checkOut",
            "numGuests",
        ];
        const missing = missingOrder.filter((k) => !nextSnapshot[k]);
        const rawQ = (filled.question || "").trim();
        let questionText = stripLocaleRequests(rawQ);
        if (mentionsLocale(rawQ) || questionText.length < 8) questionText = "";
        if (missing.length === 0) {
            const completeSnapshot = { ...nextSnapshot };
            await upsertConvState(hotelId, conversationId || "", {
                reservationSlots: completeSnapshot,
                updatedBy: "ai",
            });
            try {
                const res = await confirmAndCreate(
                    hotelId,
                    {
                        guestName: completeSnapshot.guestName!,
                        roomType: completeSnapshot.roomType!,
                        numGuests: toInt((completeSnapshot as any).numGuests) ?? 1,
                        checkIn: completeSnapshot.checkIn!,
                        checkOut: completeSnapshot.checkOut!,
                        locale,
                    },
                    channel
                );
                const confirmLine =
                    lang2 === "es"
                        ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                        : lang2 === "pt"
                            ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                            : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
                return {
                    messages: [
                        new AIMessage(res.message + (res.message.includes("CONFIRMAR") ? "" : confirmLine)),
                    ],
                    reservationSlots: completeSnapshot,
                    category: "reservation",
                    salesStage: "quote",
                };
            } catch (err) {
                return {
                    messages: [
                        new AIMessage(
                            lang2 === "es"
                                ? "Perdón, tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
                                : lang2 === "pt"
                                    ? "Desculpe, tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
                                    : "Sorry, I had a problem checking availability. Could you try again?"
                        ),
                    ],
                    reservationSlots: completeSnapshot,
                    category: "reservation",
                    salesStage: "followup",
                };
            }
        } else {
            const k = missing[0];
            if (ONE_QUESTION_PER_TURN) {
                const single = buildSingleSlotQuestion(k, lang2);
                if (FORCE_CANONICAL_QUESTION || !questionMentionsSlot(rawQ, k, lang2)) {
                    questionText = single;
                } else if (!questionText) {
                    questionText = single;
                }
            } else if (missing.length === 1) {
                const single = buildSingleSlotQuestion(k, lang2);
                if (FORCE_CANONICAL_QUESTION || !questionText) questionText = single;
            } else {
                questionText = buildAggregatedQuestion(missing, lang2);
            }
        }
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...nextSnapshot,
                numGuests: toInt((nextSnapshot as any).numGuests),
            },
            salesStage: missing.length ? "qualify" : "quote",
            updatedBy: "ai",
        });
        return {
            messages: [new AIMessage(questionText)],
            reservationSlots: nextSnapshot,
            category: "reservation",
            salesStage: missing.length ? "qualify" : "quote",
        };
    }
    const completed = filled.slots;
    const ci = new Date(completed.checkIn);
    const co = new Date(completed.checkOut);
    if (
        !(ci instanceof Date && !isNaN(ci.valueOf())) ||
        !(co instanceof Date && !isNaN(co.valueOf())) ||
        ci >= co
    ) {
        const text =
            lang2 === "es"
                ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
                : lang2 === "pt"
                    ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
                    : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
        return {
            messages: [new AIMessage(text)],
            reservationSlots: { ...merged },
            category: "reservation",
            salesStage: "qualify",
        };
    }
    const completeSnapshot: {
        guestName: string;
        roomType: string;
        checkIn: string;
        checkOut: string;
        numGuests?: number;
        locale: string;
    } = {
        ...merged,
        guestName: completed.guestName,
        roomType: completed.roomType,
        checkIn: completed.checkIn,
        checkOut: completed.checkOut,
        numGuests: toInt((completed as any).guests ?? (completed as any).numGuests),
        locale: completed.locale || locale,
    };
    await upsertConvState(hotelId, conversationId || "", {
        reservationSlots: completeSnapshot,
        updatedBy: "ai",
    });
    try {
        const res = await confirmAndCreate(
            hotelId,
            {
                guestName: completeSnapshot.guestName!,
                roomType: completeSnapshot.roomType!,
                numGuests: toInt((completeSnapshot as any).numGuests) ?? 1,
                checkIn: completeSnapshot.checkIn!,
                checkOut: completeSnapshot.checkOut!,
                locale,
            },
            channel
        );
        const confirmLine =
            lang2 === "es"
                ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                : lang2 === "pt"
                    ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                    : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
        return {
            messages: [
                new AIMessage(res.message + (res.message.includes("CONFIRMAR") ? "" : confirmLine)),
            ],
            reservationSlots: completeSnapshot,
            category: "reservation",
            salesStage: "quote",
        };
    } catch (err) {
        return {
            messages: [
                new AIMessage(
                    lang2 === "es"
                        ? "Perdón, tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
                        : lang2 === "pt"
                            ? "Desculpe, tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
                            : "Sorry, I had a problem checking availability. Could you try again?"
                ),
            ],
            reservationSlots: completeSnapshot,
            category: "reservation",
            salesStage: "followup",
        };
    }
}