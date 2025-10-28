export type HotelContent = {
    hotelId: string;
    category: string;
    promptKey: string;
    lang: string; // ISO 639-1
    version: string | number;
    type: "playbook" | "standard";
    title?: string;
    body: string;
    createdAt?: string; // ISO timestamp
    updatedAt?: string; // ISO timestamp
    // otros metadatos opcionales
};

export type HotelVersionIndex = {
    hotelId: string;
    category: string;
    promptKey: string;
    lang: string;
    currentVersion: string | number;
    lastVersion?: string | number;
    currentId?: string; // UUID
    lastId?: string;    // UUID
    // otros metadatos opcionales
};
