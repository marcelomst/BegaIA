import PDFDocument from 'pdfkit';
import fs from 'fs';
async function generatePDF() {
    try {
        // Crear un nuevo documento PDF
        const doc = new PDFDocument({ margin: 50 });

        // Guardar el PDF en un archivo
        const outputFile = 'Hotel_Demo_Extendido.pdf';
        const stream = fs.createWriteStream(outputFile);
        doc.pipe(stream);

        // Configuración de fuente
        doc.font('Helvetica').fontSize(12);

        // Contenido del PDF
        const content = `
Hotel Demo - Punta del Este (4 Estrellas)

Ubicación:
Hotel Demo Punta del Este
Avenida Gorlero 1234, Punta del Este, Maldonado, Uruguay
Teléfono: +598 4244 5678
Email: contacto@hoteldemo.com
Web: www.hoteldemo.com

Horarios de Atención:
- Check-in: 14:00 hrs
- Check-out: 11:00 hrs
- Recepción 24/7
- Desayuno buffet: 07:00 - 10:30 hrs
- Piscina y spa: 08:00 - 22:00 hrs
- Restaurante Gourmet: 12:00 - 23:00 hrs
- Bar Lounge: 17:00 - 01:00 hrs
- Gimnasio: 06:00 - 22:00 hrs

Servicios del Hotel:
- Wi-Fi gratuito en todas las instalaciones
- Servicio de habitaciones 24/7
- Piscina climatizada y spa
- Restaurante gourmet con vista al mar
- Gimnasio equipado
- Sala de conferencias y eventos
- Servicio de lavandería y tintorería
- Traslado al aeropuerto (con costo adicional)
- Alquiler de bicicletas y autos
- Servicio de concierge para reservas y recomendaciones
- Atención personalizada en español, inglés y portugués

Disponibilidad de Habitaciones:
- Habitación estándar: 10 disponibles
- Habitación superior: 5 disponibles
- Suite de lujo: 3 disponibles
- Suite presidencial: 1 disponible

Reglas del Hotel:
1. No fumar en las habitaciones y áreas comunes interiores.
2. Mascotas permitidas (con tarifa adicional y reserva previa).
3. Silencio en pasillos y zonas comunes después de las 22:00 hrs.
4. Uso exclusivo de la piscina y spa para huéspedes.
5. No se permite el ingreso de personas no registradas a las habitaciones.
6. El hotel no se hace responsable por objetos de valor no depositados en la caja fuerte.
7. Servicio de cancelación y reembolso según política de reservas.

Gestión de Reservas:
- Consultas y reservas a través de WhatsApp, Email y Redes Sociales (Facebook, Instagram, X)
- Confirmaciones y cancelaciones en línea
- Ofertas especiales para reservas directas desde la web

Atracciones Cercanas:
- Playa Brava y La Mano de Punta del Este (a 5 min)
- Puerto de Punta del Este (a 10 min)
- Casapueblo (Museo y Galería de Arte) (a 15 min)
- Isla Gorriti (acceso en barco)
- Punta Ballena y mirador panorámico
- Casino Conrad Enjoy Punta del Este
- Centro comercial Punta Shopping
- Feria de Artesanos en Plaza Artigas

Información Adicional:
- Promociones especiales para reservas directas en nuestra web.
- Descuentos exclusivos para estadías prolongadas.
- Asistencia para excursiones y tours por la ciudad y alrededores.
- Contacto rápido a través de WhatsApp para información y reservas.
`;

        // Agregar contenido al PDF línea por línea
        content.split('\n').forEach(line => {
            doc.text(line, { align: 'left' });
        });

        // Manejo de errores del stream
        stream.on('error', (err) => {
            console.error('❌ Error al escribir el PDF:', err);
        });

        // Manejo del evento de finalización
        stream.on('finish', () => {
            console.log(`✅ PDF generado con éxito: ${outputFile}`);
        });

        // Finalizar y guardar el PDF
        doc.end();

    } catch (error) {
        console.error("❌ Error al generar el PDF:", error);
    }
}

// Ejecutar la función
generatePDF();
