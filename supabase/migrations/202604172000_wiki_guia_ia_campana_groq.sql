-- Guía wiki (support bot / búsqueda): alinear con Groq para pulir, campana animada y WhatsApp.

UPDATE public.wiki_articles
SET
  title = 'Cómo pulir textos con IA en un ticket (Groq)',
  content = 'En la ficha del ticket puedes mejorar la redacción sin que la IA invente datos técnicos: en el bloque de diagnóstico/comentarios de reparación usa el botón «Mejorar con IA»; en los comentarios (internos o al cliente) verás «Pulir con IA». Después de aplicar la sugerencia aparece «Deshacer» para volver al texto anterior. Esa mejora usa el servicio Groq en la infraestructura de JC ONE FIX (no pegas claves en el panel). Si aparece un aviso de límite de uso, espera un minuto y vuelve a intentar. El pitido de avisos nuevos se activa o silencia desde el pie del desplegable de la campana.'
WHERE title = 'Cómo usar el Asistente IA Gemini en un ticket';

UPDATE public.wiki_articles
SET content =
 'Con el ticket abierto, pulsa el botón de WhatsApp (icono verde). Se abrirá WhatsApp con un mensaje predefinido que incluye el número de ticket, el dispositivo, el presupuesto y el estado. En el mismo cuadro puedes usar «Pulir con IA» para que el texto quede más claro y cordial antes de enviar. Revisa el mensaje y pulsa enviar. El número de teléfono se toma del cliente registrado en el ticket.'
WHERE title = 'Cómo enviar el presupuesto al cliente por WhatsApp';

UPDATE public.wiki_articles
SET
  title = 'Cómo funciona la IA de texto en el panel',
  content = 'Los botones «Mejorar con IA» / «Pulir con IA» en la ficha del ticket y «Pulir con IA» en el envío rápido de WhatsApp usan el motor Groq en los servidores del servicio. La generación automática del texto de presupuesto para WhatsApp (cuando exista ese botón) puede usar Google Gemini en la infraestructura de JC ONE FIX. Los técnicos no configuran la clave Groq desde el panel; si ves un mensaje de límite de uso, espera y reintenta o contacta a soporte.'
WHERE title = 'Cómo configurar la clave de API de Gemini IA';

UPDATE public.wiki_articles
SET content =
 'Dentro del ticket, en el campo de diagnóstico o comentarios de reparación, escribe el resultado de la inspección. Puedes usar «Mejorar con IA» para que se redacte en tono de taller listo para el cliente u orden; luego puedes deshacer si no te convence. El diagnóstico queda guardado en el historial y puede mostrarse en la hoja de trabajo imprimible según la configuración del portal.'
WHERE title = 'Cómo registrar el diagnóstico técnico en un ticket';
