// test-bcrypt.ts
import * as bcrypt from "bcryptjs";

const password = "nuevaClaveSuperSegura";
const hash = "$2b$10$IRCViVGrE4wq7VFl5dlVtO4lDVurp6kVm0LeVJOKKgqwUiQDlKO.q"; // Copia tu hash real aquí

(async () => {
  const match = await bcrypt.compare(password, hash);
  console.log("¿Password coincide?", match);
})();
