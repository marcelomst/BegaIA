// @vitest-environment jsdom
import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import MessageBubble from "@/components/admin/MessageBubble";
import type { ChatTurnWithMeta } from "@/types/channel";

const pendingMessage: ChatTurnWithMeta = {
  role: "ai",
  text: "¿Cuál es el tipo de habitación?",
  suggestion: "¿Cuál es el tipo de habitación?",
  status: "pending",
  timestamp: "2026-07-02T12:00:00.000Z",
  messageId: "msg-pending-1",
};

function SupervisedEditHarness() {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [sentText, setSentText] = useState("");

  return (
    <>
      <MessageBubble
        msg={pendingMessage}
        idx={0}
        isEmail={false}
        subject=""
        editingIdx={editingIdx}
        editingText={editingText}
        onEdit={(idx, initialText) => {
          setEditingIdx(idx);
          setEditingText(initialText);
        }}
        onChangeEdit={setEditingText}
        onSendEdit={(message) => setSentText(`${message.messageId}|${editingText}`)}
        onCancelEdit={() => setEditingIdx(null)}
        onViewOriginal={() => undefined}
        t={{ channelInbox: {} }}
      />
      <output aria-label="Texto enviado">{sentText}</output>
    </>
  );
}

describe("MessageBubble supervised edit", () => {
  it("precarga la sugerencia pendiente y muestra acciones claras", () => {
    render(<SupervisedEditHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Editar y enviar" }));

    expect(screen.getByRole("textbox")).toHaveValue("¿Cuál es el tipo de habitación?");
    expect(screen.getByRole("button", { name: "Guardar y enviar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeVisible();
  });

  it("cancela sin enviar y restaura la sugerencia pendiente", () => {
    render(<SupervisedEditHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Editar y enviar" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Texto modificado" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("¿Cuál es el tipo de habitación?")).toBeVisible();
    expect(screen.getByRole("status", { name: "Texto enviado" })).toBeEmptyDOMElement();
  });

  it("envía el valor actual del textarea", () => {
    render(<SupervisedEditHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Editar y enviar" }));

    const editor = screen.getByRole("textbox");
    fireEvent.change(editor, { target: { value: "¿Qué tipo de habitación preferís?" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y enviar" }));

    expect(screen.getByRole("status", { name: "Texto enviado" })).toHaveTextContent(
      "msg-pending-1|¿Qué tipo de habitación preferís?",
    );
  });
});
