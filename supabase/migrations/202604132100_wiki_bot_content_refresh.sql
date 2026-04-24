-- Wiki del bot: alinear con checkout Mercado Pago, acceso pausado post-prueba y guía integrada.

UPDATE public.wiki_articles SET content =
'Para contratar o renovar con cuenta asociada a Argentina: entra en la web a /checkout/ar (también enlazado desde el aviso del panel o desde la pantalla de acceso pausado), inicia sesión con el mismo email del panel y completa el pago con Mercado Pago (mensual o anual). Para cambiar de plan, datos de facturación o cancelar renovaciones, escribe a soporte con tu email: el equipo lo registra bien en el sistema.',
updated_at = now()
WHERE title = 'Cómo cambiar o cancelar mi suscripción';

UPDATE public.wiki_articles SET content =
'Si Mercado Pago rechazó el pago, revisa medio de pago, límites y fondos. Si en Mercado Pago figura aprobado pero el panel no se reactiva en unos minutos, escríbenos con tu email y el número de operación (payment_id). Para cargos duplicados u otros temas de facturación, detalla el caso y el equipo lo revisa.',
updated_at = now()
WHERE title = 'Problema con el cobro o pago de la suscripción';

UPDATE public.wiki_articles SET content =
'JC ONE FIX incluye 15 días de prueba gratuita sin tarjeta. Durante ese tiempo tienes acceso completo. Unos días antes del fin verás un aviso en el panel con enlace para renovar con Mercado Pago. Si la prueba vence sin pago, el acceso al panel se pausa (no es modo solo lectura: debes pagar en el checkout para volver a entrar). Tus datos se conservan.',
updated_at = now()
WHERE title = 'Cómo funciona el período de prueba gratuito';

UPDATE public.wiki_articles SET content =
'Comprueba email y contraseña. Si olvidaste la clave, usa "¿Olvidaste tu contraseña?" en el login. Si ves "Acceso pausado" o que la prueba o licencia vencieron, no es un fallo de contraseña: renueva en /checkout/ar con Mercado Pago (mismo usuario). Si algo no encaja, escribe a soporte con tu email.',
updated_at = now()
WHERE title = 'No puedo iniciar sesión en el panel';

INSERT INTO public.wiki_articles (title, content, category)
SELECT 'Cómo pagar o renovar la licencia con Mercado Pago',
'En cuentas con facturación en pesos argentinos el cobro de la suscripción es vía Mercado Pago. Abre jconefix.vercel.app/checkout/ar (o el botón Renovar del aviso del panel unos días antes del vencimiento). Inicia sesión con tu usuario del panel, elige periodo mensual o anual y paga en Mercado Pago; el acceso se actualiza en minutos. Si ya venció la prueba o la licencia, verás "Acceso pausado" con el mismo enlace al checkout. Tus datos se conservan al menos 12 meses.',
'pagos'
WHERE NOT EXISTS (SELECT 1 FROM public.wiki_articles w WHERE w.title = 'Cómo pagar o renovar la licencia con Mercado Pago');

INSERT INTO public.wiki_articles (title, content, category)
SELECT 'Cómo usar el modo de panel sencillo o completo',
'Ve a Configuración → Configuración general y busca la sección "Experiencia del panel". Ahí puedes elegir un modo más simple (menos opciones en el menú) o el modo completo. El cambio se guarda al instante. Más detalle en Configuración → Guía de usuario, sección Primeros pasos.',
'configuración'
WHERE NOT EXISTS (SELECT 1 FROM public.wiki_articles w WHERE w.title = 'Cómo usar el modo de panel sencillo o completo');

INSERT INTO public.wiki_articles (title, content, category)
SELECT 'Dónde encontrar la guía de usuario del panel',
'El manual está dentro del panel: abre el menú Configuración (barra superior) y elige "Guía de usuario". Ahí hay temas ordenados, pasos y ayuda sobre modo de panel sencillo frente a completo, tickets, inventario y más. Es la referencia más completa además del chat de soporte.',
'general'
WHERE NOT EXISTS (SELECT 1 FROM public.wiki_articles w WHERE w.title = 'Dónde encontrar la guía de usuario del panel');
