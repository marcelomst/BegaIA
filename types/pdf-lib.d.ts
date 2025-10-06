declare module 'pdf-lib' {
    export const StandardFonts: { Helvetica: string };
    export class PDFDocument {
        static create(): Promise<PDFDocument>;
        addPage(): any;
        embedFont(name: string): Promise<any>;
        save(): Promise<Uint8Array>;
    }
}
