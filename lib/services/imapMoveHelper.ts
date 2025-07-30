// Path: /root/begasist/lib/services/imapMoveHelper.ts

/**
 * Mueve un mensaje a una carpeta destino en IMAP.
 * Si el método .moveMessage no existe, usa copy+delete+expunge como fallback.
 */
export async function moveMessage(connection: any, uid: number, targetBox: string) {
  if (typeof connection.moveMessage === "function") {
    // Método nativo de imap-simple (si lo soporta el backend IMAP)
    await connection.moveMessage(uid, targetBox);
  } else {
    // Fallback: copy + marcar como deleted + expunge
    await connection.copyMessage(uid, targetBox);
    await connection.addFlags(uid, "\\Deleted");
    await connection.imap.expunge(); // asegúrate que expunge está soportado
  }
}
