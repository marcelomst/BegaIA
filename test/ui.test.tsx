import { test, expect } from "vitest";
import "@testing-library/jest-dom"; // 👈 Agregar esto

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it} from "vitest";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

describe("ReactMarkdown", () => {
  it("Renderiza un enlace en ReactMarkdown", () => {
    render(
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
        {"[Reserva aquí](https://booking.bedzzle.com/desktop/?&apikey=123&lang=es)"}
      </ReactMarkdown>
    );

    const linkElement = screen.getByText("Reserva aquí");
    expect(linkElement).toBeInTheDocument(); // ✅ Ahora funcionará
  });
});
