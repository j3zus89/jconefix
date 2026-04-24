-- ─────────────────────────────────────────────────────────────────────────────
-- Artículos iniciales de la Wiki del Bot — JC ONE FIX
-- Ejecuta esto en el SQL Editor de Supabase para entrenar al asistente IA.
--
-- Si aparece: invalid input syntax for type json → tus columnas son jsonb.
--   Ejecuta ANTES la migración: migrations/202604040200_fix_wiki_articles_text_columns.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.wiki_articles (title, content, category) VALUES

-- ══════════════════════════════════════════════════════════════════════════════
-- TICKETS
-- ══════════════════════════════════════════════════════════════════════════════
(
  'Cómo crear un ticket de reparación',
  'Para crear un nuevo ticket ve al menú "Tickets" y pulsa el botón "+ Nuevo ticket". Rellena los campos: nombre del cliente, teléfono, dispositivo (marca y modelo), descripción del problema y el técnico asignado. Pulsa "Guardar" para generar el ticket con número automático. El cliente recibirá una notificación si tiene número de WhatsApp registrado.',
  'tickets'
),
(
  'Cómo cambiar el estado de un ticket',
  'Abre el ticket desde el listado y cambia el campo "Estado" en la parte superior. Los estados disponibles son: Pendiente, En proceso, Esperando piezas, Listo para recoger y Entregado. Cada cambio queda registrado en el historial del ticket con fecha y hora.',
  'tickets'
),
(
  'Cómo añadir piezas y mano de obra a un ticket',
  'Dentro del ticket, en la sección "Líneas de trabajo", pulsa "+ Añadir línea". Puedes buscar una pieza del inventario por nombre o SKU, o escribir un servicio manual (p. ej. "Mano de obra"). Indica la cantidad y el precio. El total se calcula automáticamente incluyendo el IVA configurado.',
  'tickets'
),
(
  'Cómo usar el Asistente IA Gemini en un ticket',
  'Dentro de un ticket abierto, busca el botón "Asistente IA" o el icono de chispa. Escribe el síntoma del dispositivo y pulsa "Consultar". Gemini analizará el modelo y el fallo y te devolverá: causa probable, pasos de diagnóstico y lista de piezas candidatas. Para usar esta función el administrador debe haber configurado la clave de API Gemini en Configuración → IA.',
  'tickets'
),
(
  'Cómo enviar el presupuesto al cliente por WhatsApp',
  'Con el ticket abierto, pulsa el botón de WhatsApp (icono verde). Se abrirá WhatsApp con un mensaje predefinido que incluye el número de ticket, el dispositivo, el presupuesto y el estado. Revisa el mensaje y pulsa enviar. El número de teléfono se toma del cliente registrado en el ticket.',
  'tickets'
),
(
  'No encuentro un ticket, cómo buscarlo',
  'En el listado de tickets usa la barra de búsqueda superior para filtrar por número de ticket, nombre del cliente, modelo del dispositivo o IMEI. También puedes filtrar por estado, técnico asignado o rango de fechas usando los filtros de la barra lateral. Si el ticket fue eliminado, no se puede recuperar.',
  'tickets'
),

-- ══════════════════════════════════════════════════════════════════════════════
-- INVENTARIO
-- ══════════════════════════════════════════════════════════════════════════════
(
  'Cómo añadir un producto al inventario',
  'Ve a Inventario → Productos y pulsa "+ Nuevo producto". Rellena: nombre, SKU (código único), categoría, precio de coste, precio de venta y stock inicial. Pulsa "Guardar". El producto aparecerá inmediatamente en el buscador del punto de venta y en los tickets.',
  'inventario'
),
(
  'Cómo ajustar el stock de un producto',
  'En Inventario → Productos, abre el producto y pulsa "Ajustar stock". Introduce la cantidad a añadir (positivo) o restar (negativo) e indica el motivo (p. ej. "Compra proveedor", "Rotura"). El sistema registra cada movimiento con fecha y usuario para trazabilidad.',
  'inventario'
),
(
  'Cómo ver productos con stock bajo',
  'Ve a Inventario y activa el filtro "Stock bajo" o "Bajo mínimo". El sistema compara el stock actual con el mínimo configurado en cada producto. Para establecer el mínimo, edita el producto y rellena el campo "Stock mínimo". Los productos en rojo requieren reposición urgente.',
  'inventario'
),
(
  'Cómo crear categorías de inventario',
  'Ve a Inventario → Categorías y pulsa "+ Nueva categoría". Ponle un nombre descriptivo (p. ej. "Pantallas iPhone", "Baterías Samsung"). Las categorías ayudan a organizar el inventario y a filtrar productos más rápido.',
  'inventario'
),

-- ══════════════════════════════════════════════════════════════════════════════
-- PUNTO DE VENTA (POS)
-- ══════════════════════════════════════════════════════════════════════════════
(
  'Cómo hacer una venta en el Punto de Venta',
  'Ve al menú "Punto de Venta" (TPV). Busca productos por nombre o SKU en la barra superior y pulsa para añadirlos al carrito. Ajusta cantidades si es necesario. Cuando el carrito esté listo, pulsa "Cobrar". Elige el método de pago (efectivo, tarjeta o transferencia), introduce el importe recibido y pulsa "Confirmar pago". El sistema generará el recibo automáticamente.',
  'pos'
),
(
  'El TPV no encuentra un producto por SKU',
  'Verifica que el SKU esté escrito exactamente igual que en el inventario (distingue mayúsculas/minúsculas). También puedes buscar por nombre parcial. Si el producto no aparece, comprueba en Inventario → Productos que esté activo y tenga stock disponible mayor que cero. Si el stock es 0 y la venta de stock negativo está desactivada, el producto no aparecerá en el TPV.',
  'pos'
),
(
  'Cómo aplicar un descuento en el TPV',
  'Con el artículo añadido al carrito, pulsa sobre él para editarlo. Verás un campo "Descuento %" donde puedes introducir el porcentaje de descuento a aplicar en esa línea. El subtotal se recalcula al instante. También puedes aplicar un descuento global a todo el carrito desde el botón "Descuento global" antes de cobrar.',
  'pos'
),
(
  'Cómo imprimir o enviar el recibo de una venta',
  'Tras confirmar el pago, el sistema muestra la pantalla de recibo. Pulsa "Imprimir" para imprimir en impresora térmica o PDF. Pulsa el icono de WhatsApp para enviar el recibo al número del cliente. Si el cliente no tiene teléfono registrado, el sistema pedirá introducirlo manualmente.',
  'pos'
),

-- ══════════════════════════════════════════════════════════════════════════════
-- FACTURACIÓN
-- ══════════════════════════════════════════════════════════════════════════════
(
  'Cómo generar una factura desde un ticket',
  'Con el ticket en estado "Listo para recoger" o "Entregado", pulsa el botón "Generar factura". Revisa las líneas de trabajo y el total. Si el cliente tiene NIF/CUIT registrado se incluirá en la factura. Pulsa "Crear factura" y el sistema generará un PDF descargable y registrará la factura en el historial.',
  'facturación'
),
(
  'Cómo configurar los datos de la empresa en facturas',
  'Ve a Configuración → Datos de empresa. Rellena: nombre comercial, NIF/CUIT, dirección, teléfono, email y logotipo. Estos datos aparecerán en el encabezado de todas las facturas y recibos. Guarda los cambios y el próximo documento generado ya llevará tus datos.',
  'facturación'
),
(
  'Cómo ver y descargar facturas emitidas',
  'Ve al menú "Facturación" → "Facturas emitidas". Usa los filtros de fecha y cliente para encontrar la factura. Pulsa en la factura para ver el detalle y el botón "Descargar PDF" para obtenerla. También puedes reenviarla por email o WhatsApp desde esa misma pantalla.',
  'facturación'
),
(
  'Cómo cambiar el IVA o impuesto en las facturas',
  'Ve a Configuración → Impuestos. Podrás ver el impuesto configurado para tu país (IVA 21% para España, IVA 21% para Argentina). Puedes crear tipos adicionales (p. ej. IVA reducido 10%). Para aplicar un tipo diferente en un producto, edítalo en Inventario y cambia el campo "Tipo de IVA".',
  'facturación'
),

-- ══════════════════════════════════════════════════════════════════════════════
-- CONFIGURACIÓN
-- ══════════════════════════════════════════════════════════════════════════════
(
  'Cómo añadir un técnico o empleado',
  'Ve a Configuración → Empleados y pulsa "+ Nuevo empleado". Rellena nombre, teléfono y rol (Técnico, Recepcionista, Administrador). El sistema creará una invitación al email indicado. Cuando el empleado acepte la invitación, podrá iniciar sesión y tendrá acceso según su rol.',
  'configuración'
),
(
  'Cómo cambiar la contraseña o email de la cuenta',
  'Ve a Configuración → Mi cuenta (o el icono de perfil en la esquina superior derecha). Desde ahí puedes cambiar tu nombre, email y contraseña. Para cambiar la contraseña introduce la actual y luego la nueva dos veces. Si olvidaste tu contraseña, usa la opción "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.',
  'configuración'
),
(
  'Cómo configurar la clave de API de Gemini IA',
  'Ve a Configuración → IA (Asistente Gemini). En el campo "Clave API de Google" pega tu API Key de Google AI Studio (comienza por "AIza..."). Pulsa "Guardar". A partir de ese momento el botón de Asistente IA en los tickets quedará activado para todos los técnicos del taller.',
  'configuración'
),
(
  'Cómo personalizar los textos legales de tickets y facturas',
  'Ve a Configuración → Textos legales. Encontrarás campos para: aviso legal del ticket, condiciones de garantía y pie de factura. Escribe o pega el texto que quieres que aparezca en tus documentos. Los cambios se aplican a los próximos documentos generados, no a los ya emitidos.',
  'configuración'
),
(
  'Cómo usar el modo de panel sencillo o completo',
  'Ve a Configuración → Configuración general y busca la sección "Experiencia del panel". Ahí puedes elegir un modo más simple (menos opciones en el menú) o el modo completo. El cambio se guarda al instante. Más detalle en Configuración → Guía de usuario, sección Primeros pasos.',
  'configuración'
),

-- ══════════════════════════════════════════════════════════════════════════════
-- PAGOS Y SUSCRIPCIÓN
-- ══════════════════════════════════════════════════════════════════════════════
(
  'Cómo cambiar o cancelar mi suscripción',
  'Para contratar o renovar con cuenta asociada a Argentina: entra en la web a /checkout/ar (también enlazado desde el aviso del panel o desde la pantalla de acceso pausado), inicia sesión con el mismo email del panel y completa el pago con Mercado Pago (mensual o anual). Para cambiar de plan, datos de facturación o cancelar renovaciones, escribe a soporte con tu email: el equipo lo registra bien en el sistema.',
  'pagos'
),
(
  'Problema con el cobro o pago de la suscripción',
  'Si Mercado Pago rechazó el pago, revisa medio de pago, límites y fondos. Si en Mercado Pago figura aprobado pero el panel no se reactiva en unos minutos, escríbenos con tu email y el número de operación (payment_id). Para cargos duplicados u otros temas de facturación, detalla el caso y el equipo lo revisa.',
  'pagos'
),
(
  'Cómo pagar o renovar la licencia con Mercado Pago',
  'En cuentas con facturación en pesos argentinos el cobro de la suscripción es vía Mercado Pago. Abre jconefix.vercel.app/checkout/ar (o el botón Renovar del aviso del panel unos días antes del vencimiento). Inicia sesión con tu usuario del panel, elige periodo mensual o anual y paga en Mercado Pago; el acceso se actualiza en minutos. Si ya venció la prueba o la licencia, verás "Acceso pausado" con el mismo enlace al checkout. Tus datos se conservan al menos 12 meses.',
  'pagos'
),
(
  'Cuántos dispositivos o tickets puedo gestionar',
  'JC ONE FIX no tiene límite de tickets, clientes ni dispositivos en ningún plan. Puedes crear tantos tickets como necesites. El límite varía según el número de técnicos/usuarios incluidos en tu plan. Consulta la página de precios en jconefix.vercel.app para ver los detalles de cada plan.',
  'pagos'
),

-- ══════════════════════════════════════════════════════════════════════════════
-- TÉCNICO / DIAGNÓSTICO
-- ══════════════════════════════════════════════════════════════════════════════
(
  'Cómo registrar el diagnóstico técnico en un ticket',
  'Dentro del ticket, en el campo "Diagnóstico técnico", escribe el resultado de la inspección del dispositivo. Puedes usar el Asistente IA (botón chispa) para que Gemini te sugiera el texto basándose en el modelo y el síntoma. El diagnóstico queda guardado en el historial y aparece en la hoja de trabajo imprimible.',
  'técnico'
),
(
  'Cómo marcar una reparación como garantía',
  'Al crear el ticket, activa la casilla "Reparación en garantía". Indica el número del ticket original de referencia. El sistema marcará la reparación como garantía, no generará cobro al cliente y registrará el coste interno para tu control. La duración de garantía por defecto es 90 días desde la entrega.',
  'técnico'
),
(
  'Cómo imprimir la hoja de trabajo de un ticket',
  'Abre el ticket y pulsa el botón "Imprimir hoja de trabajo". Se abrirá una ventana con el formato imprimible que incluye: datos del cliente, descripción del problema, diagnóstico, piezas usadas y firma del cliente. Pulsa Ctrl+P (o Cmd+P en Mac) para imprimir o guardar como PDF.',
  'técnico'
),

-- ══════════════════════════════════════════════════════════════════════════════
-- GENERAL
-- ══════════════════════════════════════════════════════════════════════════════
(
  'Cómo funciona el período de prueba gratuito',
  'JC ONE FIX incluye 15 días de prueba gratuita sin tarjeta. Durante ese tiempo tienes acceso completo. Unos días antes del fin verás un aviso en el panel con enlace para renovar con Mercado Pago. Si la prueba vence sin pago, el acceso al panel se pausa (no es modo solo lectura: debes pagar en el checkout para volver a entrar). Tus datos se conservan.',
  'general'
),
(
  'Dónde encontrar la guía de usuario del panel',
  'El manual está dentro del panel: abre el menú Configuración (barra superior) y elige "Guía de usuario". Ahí hay temas ordenados, pasos y ayuda sobre modo de panel sencillo frente a completo, tickets, inventario y más. Es la referencia más completa además del chat de soporte.',
  'general'
),
(
  'No puedo iniciar sesión en el panel',
  'Comprueba email y contraseña. Si olvidaste la clave, usa "¿Olvidaste tu contraseña?" en el login. Si ves "Acceso pausado" o que la prueba o licencia vencieron, no es un fallo de contraseña: renueva en /checkout/ar con Mercado Pago (mismo usuario). Si algo no encaja, escribe a soporte con tu email.',
  'general'
),
(
  'El panel carga lento o muestra errores en pantalla',
  'Primero recarga la página (Ctrl+R). Si el error persiste, limpia la caché del navegador (Ctrl+Shift+Del) y vuelve a intentarlo. Comprueba tu conexión a internet. Si el problema sigue, indícanos el mensaje de error exacto y en qué sección ocurre para que el equipo lo revise.',
  'general'
),
(
  'Cómo exportar datos o hacer una copia de seguridad',
  'Ve a Configuración → Exportar datos. Puedes exportar tickets, clientes e inventario en formato CSV o Excel. La exportación incluye todos los registros del período seleccionado. Los datos se descargan directamente en tu equipo. Recomendamos hacer una exportación mensual como respaldo adicional.',
  'general'
);
