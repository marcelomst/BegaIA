// Path: /root/begasist/lib/db/guests.ts

import type { Guest } from "@/types/channel";
import { getAstraDB } from "@/lib/astra/connection";

const GUESTS_COLLECTION = "guests";

function getGuestsCollection() {
  return getAstraDB().collection<Guest>(GUESTS_COLLECTION);
}

export async function getGuest(hotelId: string, guestId: string): Promise<Guest | null> {
  const collection = getGuestsCollection();
  return await collection.findOne({ hotelId, guestId });
}

export async function createGuest(guest: Guest): Promise<Guest> {
  const collection = getGuestsCollection();
  await collection.insertOne(guest);
  return guest;
}

export async function updateGuest(hotelId: string, guestId: string, changes: Partial<Guest>): Promise<void> {
  const collection = getGuestsCollection();
  await collection.updateOne(
    { hotelId, guestId },
    { $set: { ...changes, updatedAt: new Date().toISOString() } }
  );
}

export async function findGuestsByHotel(hotelId: string): Promise<Guest[]> {
  const collection = getGuestsCollection();
  return await collection.find({ hotelId }).toArray();
}
export async function deleteGuest(hotelId: string, guestId: string): Promise<void> {
  const collection = getGuestsCollection();
  await collection.deleteOne({ hotelId, guestId });
}