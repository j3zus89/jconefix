-- Actualiza los artículos más consultados con respuestas detalladas paso a paso
-- Ejecuta en Supabase → SQL Editor → Run

UPDATE public.wiki_articles SET content = 
'Paso 1: En el menú de la izquierda, haz clic en "Tickets". 
Paso 2: Pulsa el botón verde "+ Nuevo ticket" que aparece arriba a la derecha.
Paso 3: Rellena los campos obligatorios: nombre del cliente (o búscalo si ya existe), su teléfono, el dispositivo (marca y modelo, por ejemplo "iPhone 14") y una descripción del problema (por ejemplo "pantalla rota", "no enciende").
Paso 4: Asigna el ticket a un técnico usando el desplegable "Técnico asignado".
Paso 5: Pulsa "Guardar". El sistema genera automáticamente un número de ticket (por ejemplo #0042).
Listo — el ticket aparece en el listado y puedes abrirlo en cualquier momento para añadir piezas, cambiar el estado o generar la factura.'
WHERE title = 'Cómo crear un ticket de reparación';

UPDATE public.wiki_articles SET content = 
'Paso 1: Abre el ticket desde el listado (clic en el número de ticket).
Paso 2: Busca el campo "Estado" en la parte superior del ticket — verás un desplegable o botones con los estados disponibles.
Paso 3: Los estados son: 
  • Pendiente: recién recibido, aún sin revisar.
  • En proceso: el técnico está trabajando en él.
  • Esperando piezas: se pidió un recambio y hay que esperar.
  • Listo para recoger: la reparación terminó, avisar al cliente.
  • Entregado: el cliente recogió el dispositivo y pagó.
Paso 4: Selecciona el nuevo estado y el sistema lo guarda automáticamente con la fecha y hora del cambio.
Consejo: Cuando pases a "Listo para recoger", el sistema puede enviar un aviso al cliente por WhatsApp si tienes el número guardado.'
WHERE title = 'Cómo cambiar el estado de un ticket';

UPDATE public.wiki_articles SET content = 
'Paso 1: Abre el ticket y baja hasta la sección "Líneas de trabajo" o "Materiales y servicios".
Paso 2: Pulsa "+ Añadir línea".
Paso 3: En el buscador escribe el nombre de la pieza o su código SKU (por ejemplo "pantalla iphone 14" o "SCR-IP14"). El sistema busca en tu inventario.
Paso 4: Si la pieza está en el inventario, selecciónala y la cantidad se descuenta automáticamente del stock.
Paso 5: Para añadir mano de obra, escribe directamente "Mano de obra" en el campo de descripción con el precio que cobras.
Paso 6: Puedes añadir tantas líneas como necesites (piezas + servicios).
El total con IVA se calcula solo. Cuando termines, este total será el importe de la factura.'
WHERE title = 'Cómo añadir piezas y mano de obra a un ticket';

UPDATE public.wiki_articles SET content = 
'Paso 1: En el menú izquierdo haz clic en "Punto de Venta" o "TPV".
Paso 2: Verás una pantalla con un buscador arriba. Escribe el nombre del producto o su código SKU para buscarlo.
Paso 3: Haz clic en el producto para añadirlo al carrito de la derecha. Puedes cambiar la cantidad pulsando en el número.
Paso 4: Si quieres aplicar un descuento, haz clic en la línea del producto en el carrito y escribe el porcentaje de descuento.
Paso 5: Cuando el carrito esté listo, pulsa el botón "Cobrar".
Paso 6: Elige el método de pago (Efectivo, Tarjeta o Transferencia). Si es efectivo, introduce el importe recibido y el sistema calcula el cambio.
Paso 7: Pulsa "Confirmar pago". Se genera el recibo automáticamente y puedes imprimirlo o enviarlo por WhatsApp al cliente.'
WHERE title = 'Cómo hacer una venta en el Punto de Venta';

UPDATE public.wiki_articles SET content = 
'Paso 1: Abre el ticket que ya está terminado (estado "Listo para recoger" o "Entregado").
Paso 2: Busca el botón "Generar factura" o "Facturar" en la parte superior del ticket.
Paso 3: Se abre una vista previa con todos los datos: cliente, líneas de trabajo, subtotal e IVA.
Paso 4: Si el cliente tiene NIF o CUIT registrado en su ficha, aparecerá automáticamente en la factura.
Paso 5: Pulsa "Crear factura". El sistema la guarda con número correlativo automático y genera un PDF.
Paso 6: Desde esa misma pantalla puedes descargar el PDF, enviarlo por email o compartirlo por WhatsApp.
Todas las facturas quedan guardadas en "Facturación → Facturas emitidas" para que puedas consultarlas cuando quieras.'
WHERE title = 'Cómo generar una factura desde un ticket';

UPDATE public.wiki_articles SET content = 
'Paso 1: En el menú izquierdo haz clic en "Inventario" y luego en "Productos".
Paso 2: Pulsa el botón "+ Nuevo producto" arriba a la derecha.
Paso 3: Rellena los campos: 
  • Nombre: cómo se llama la pieza (ej: "Pantalla iPhone 14 Original").
  • SKU: un código único que tú eliges (ej: "SCR-IP14"). Sirve para buscarlo rápido en el TPV.
  • Categoría: agrúpalo (ej: "Pantallas", "Baterías").
  • Precio de coste: lo que te costó a ti.
  • Precio de venta: lo que cobras al cliente.
  • Stock inicial: cuántas unidades tienes ahora mismo.
Paso 4: Pulsa "Guardar". El producto aparece al instante en el TPV y en el buscador de tickets.
Consejo: Si pones un "Stock mínimo", el sistema te avisará cuando queden pocas unidades.'
WHERE title = 'Cómo añadir un producto al inventario';

UPDATE public.wiki_articles SET content = 
'Paso 1: En el menú izquierdo haz clic en "Configuración".
Paso 2: Busca la sección "Empleados" o "Usuarios".
Paso 3: Pulsa "+ Nuevo empleado".
Paso 4: Rellena: nombre completo, email de trabajo y rol:
  • Técnico: puede ver y gestionar tickets asignados.
  • Recepcionista: puede crear clientes, tickets y cobrar en el TPV.
  • Administrador: acceso completo al panel.
Paso 5: Pulsa "Invitar". El empleado recibirá un email con un enlace para crear su contraseña y acceder al panel.
Paso 6: Una vez acepte la invitación, aparecerá en el desplegable "Técnico asignado" al crear tickets.
Nota: Cada empleado tiene su propio usuario — así sabes quién hizo qué y en qué momento.'
WHERE title = 'Cómo añadir un técnico o empleado';

UPDATE public.wiki_articles SET content = 
'JC ONE FIX incluye 15 días de prueba gratuita sin tarjeta. Durante ese tiempo tienes acceso completo a tickets, inventario, TPV, facturación, informes y asistente IA.
Unos días antes del fin verás un aviso en el panel con enlace para renovar con Mercado Pago.
Si la prueba vence sin pago, el acceso al panel se pausa (no es modo solo lectura: debes pagar en el checkout para volver a entrar). Tus datos se conservan.
Para contratar: jconefix.vercel.app/checkout/ar con tu usuario del panel. Dudas sobre planes: escríbenos y el equipo te atiende.'
WHERE title = 'Cómo funciona el período de prueba gratuito';

UPDATE public.wiki_articles SET content = 
'Paso 1: Con el ticket abierto, busca el botón con el icono de WhatsApp (verde) en la parte superior.
Paso 2: Al pulsarlo se abrirá WhatsApp (en el móvil la app, en el ordenador WhatsApp Web) con un mensaje ya redactado que incluye: número del ticket, dispositivo, estado actual y presupuesto si lo has añadido.
Paso 3: Revisa el mensaje, puedes editarlo si quieres, y pulsa enviar.
Si el número del cliente no está guardado en su ficha, el sistema te pedirá que lo introduzcas antes de abrir WhatsApp.
Consejo: Usa esto para avisar al cliente cuando el dispositivo esté listo para recoger — es mucho más rápido que llamar.'
WHERE title = 'Cómo enviar el presupuesto al cliente por WhatsApp';

UPDATE public.wiki_articles SET content = 
'Comprueba email y contraseña (mayúsculas y espacios). Si olvidaste la clave: en el login usa "¿Olvidaste tu contraseña?", introduce tu email y revisa spam.
Si ves "Acceso pausado" o que la prueba o licencia vencieron, no es error de contraseña: renueva en /checkout/ar con Mercado Pago usando el mismo usuario del panel.
Si el acceso no vuelve tras un pago aprobado, escríbenos con tu email y el payment_id de Mercado Pago.'
WHERE title = 'No puedo iniciar sesión en el panel';

UPDATE public.wiki_articles SET content =
'Para contratar o renovar (Argentina / pesos): entra a /checkout/ar desde el aviso del panel o desde la pantalla de acceso pausado, inicia sesión con tu email del panel y paga con Mercado Pago (mensual o anual).
Para cambiar de plan, datos de facturación o cancelar renovaciones, escribe a soporte con tu email.'
WHERE title = 'Cómo cambiar o cancelar mi suscripción';

UPDATE public.wiki_articles SET content =
'Si Mercado Pago rechazó el pago, revisa medio, límites y fondos. Si figura aprobado y el panel no se reactiva en minutos, escríbenos con email y payment_id.
Para cargos duplicados u otros temas, detalla el caso.'
WHERE title = 'Problema con el cobro o pago de la suscripción';

INSERT INTO public.wiki_articles (title, content, category)
SELECT 'Cómo pagar o renovar la licencia con Mercado Pago',
'En cuentas en pesos argentinos la suscripción se paga con Mercado Pago. Abre jconefix.vercel.app/checkout/ar o el botón Renovar del aviso del panel (unos días antes del vencimiento). Inicia sesión, elige mensual o anual y completa el pago; el acceso se actualiza en minutos. Si venció la prueba o licencia, la pantalla de acceso pausado enlaza al mismo checkout. Datos conservados al menos 12 meses.',
'pagos'
WHERE NOT EXISTS (SELECT 1 FROM public.wiki_articles w WHERE w.title = 'Cómo pagar o renovar la licencia con Mercado Pago');

INSERT INTO public.wiki_articles (title, content, category)
SELECT 'Cómo usar el modo de panel sencillo o completo',
'Configuración → Configuración general → sección Experiencia del panel: elige modo sencillo (menos menús) o completo. Se guarda al instante. Más info en Configuración → Guía de usuario, Primeros pasos.',
'configuración'
WHERE NOT EXISTS (SELECT 1 FROM public.wiki_articles w WHERE w.title = 'Cómo usar el modo de panel sencillo o completo');

INSERT INTO public.wiki_articles (title, content, category)
SELECT 'Dónde encontrar la guía de usuario del panel',
'Configuración (barra superior) → Guía de usuario: manual integrado con temas, pasos y modo sencillo vs completo. Es la referencia más completa además del chat de soporte.',
'general'
WHERE NOT EXISTS (SELECT 1 FROM public.wiki_articles w WHERE w.title = 'Dónde encontrar la guía de usuario del panel');
