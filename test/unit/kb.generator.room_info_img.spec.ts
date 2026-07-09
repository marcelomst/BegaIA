import { describe, expect, it } from "vitest";
import { generateKbFilesFromTemplates } from "@/lib/kb/generator";

describe("generateKbFilesFromTemplates room_info_img", () => {
  it("publishes renderable Images from room image objects", () => {
    const files = generateKbFilesFromTemplates({
      defaultLanguage: "es",
      hotelConfig: {
        hotelId: "hotel999",
        defaultLanguage: "es",
        rooms: [
          {
            name: "Doble",
            type: "double",
            capacity: 2,
            bed: "Queen",
            view: "mar",
            images: [
              { url: "https://cdn.example.com/doble-1.jpg", alt: "Doble" },
              "https://cdn.example.com/doble-2.jpg",
              "/home/marcelo/begasist/public/hotel999/rooms/double/double.jpg",
              { url: "/local-only.jpg" },
            ],
          },
        ],
      },
    });

    const body = files["retrieval_based/room_info_img.es.txt"];
    expect(body).toContain("Tipo: Doble");
    expect(body).toContain("Images:");
    expect(body).toContain("https://cdn.example.com/doble-1.jpg");
    expect(body).toContain("https://cdn.example.com/doble-2.jpg");
    expect(body).toContain("/hotel999/rooms/double/double.jpg");
    expect(body).not.toContain("[object Object]");
    expect(body).not.toContain("/local-only.jpg");
  });
});
