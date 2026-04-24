'use client';

const MESSAGES = [
  { id: 1, from: 'laura',  color: '#e05fa0', text: 'Hola! ya llegó el cliente',       time: '09:14', me: false },
  { id: 2, from: 'jesus',  color: '#0d9488', text: 'Sí, dime',                         time: '09:15', me: true  },
  { id: 3, from: 'laura',  color: '#e05fa0', text: 'Trae el iPhone con pantalla rota', time: '09:15', me: false },
  { id: 4, from: 'manolo', color: '#7c3aed', text: 'Lo tomo yo 👍',                    time: '09:16', me: false },
  { id: 5, from: 'jesus',  color: '#0d9488', text: 'Ok perfecto gracias',              time: '09:16', me: true  },
];

function initials(name: string) {
  return name[0]!.toUpperCase();
}

/* ── ESTILO 1 — Compacto tipo iMessage/WhatsApp ────────────────────────── */
function Style1() {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      {MESSAGES.map((m) => (
        <div key={m.id} className={`flex items-end gap-1.5 ${m.me ? 'flex-row-reverse' : 'flex-row'}`}>
          {!m.me && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ backgroundColor: m.color }}>
              {initials(m.from)}
            </div>
          )}
          <div className="flex flex-col gap-0.5" style={{ maxWidth: '65%', alignItems: m.me ? 'flex-end' : 'flex-start' }}>
            {!m.me && <span className="text-[10px] font-semibold pl-1" style={{ color: m.color }}>{m.from}</span>}
            <div className="flex items-end gap-1">
              <div
                className="px-3 py-1.5 text-[13px] leading-snug break-words"
                style={{
                  backgroundColor: m.me ? '#0d9488' : '#f0f0f0',
                  color: m.me ? 'white' : '#1a1a1a',
                  borderRadius: m.me ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  wordBreak: 'break-word',
                }}
              >
                {m.text}
                <span className="ml-2 text-[10px] opacity-60">{m.time}</span>
              </div>
            </div>
          </div>
          {m.me && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{ backgroundColor: m.color }}>
              {initials(m.from)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── ESTILO 2 — Minimalista sin avatar ─────────────────────────────────── */
function Style2() {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      {MESSAGES.map((m, i) => {
        const prev = MESSAGES[i - 1];
        const showName = !prev || prev.from !== m.from;
        return (
          <div key={m.id} className={`flex flex-col ${m.me ? 'items-end' : 'items-start'}`}>
            {showName && (
              <span className="text-[10px] font-bold mb-0.5 px-1" style={{ color: m.color }}>
                {m.from}
              </span>
            )}
            <div
              className="px-2.5 py-1 text-[13px] leading-snug max-w-[60%]"
              style={{
                backgroundColor: m.me ? m.color : '#ececec',
                color: m.me ? 'white' : '#222',
                borderRadius: '10px',
                display: 'inline-block',
                wordBreak: 'break-word',
              }}
            >
              {m.text}
              <span className="ml-1.5 text-[10px] opacity-55">{m.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── ESTILO 3 — Burbuja pill compacta con border ───────────────────────── */
function Style3() {
  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      {MESSAGES.map((m) => (
        <div key={m.id} className={`flex items-start gap-2 ${m.me ? 'flex-row-reverse' : 'flex-row'}`}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
            style={{ backgroundColor: m.color }}
          >
            {initials(m.from)}
          </div>
          <div style={{ maxWidth: '62%' }}>
            {!m.me && (
              <div className="text-[10px] font-semibold mb-0.5" style={{ color: m.color }}>{m.from}</div>
            )}
            <div
              className="inline-flex items-end gap-2 px-3 py-1.5 text-[12px] leading-snug"
              style={{
                background: m.me
                  ? `linear-gradient(135deg, ${m.color}cc, ${m.color}99)`
                  : 'white',
                color: m.me ? 'white' : '#333',
                border: m.me ? 'none' : '1px solid #e0e0e0',
                borderRadius: '14px',
                wordBreak: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              }}
            >
              <span>{m.text}</span>
              <span className="text-[9px] opacity-60 shrink-0">{m.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── ESTILO 4 — Flat con color de remitente ────────────────────────────── */
function Style4() {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      {MESSAGES.map((m) => (
        <div key={m.id} className={`flex items-end gap-2 ${m.me ? 'flex-row-reverse' : 'flex-row'}`}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: m.color }}
          >
            {initials(m.from)}
          </div>
          <div style={{ maxWidth: '65%' }}>
            <div
              className="px-3 py-2 text-[13px]"
              style={{
                backgroundColor: m.me ? `${m.color}20` : `${m.color}15`,
                borderLeft: m.me ? 'none' : `3px solid ${m.color}`,
                borderRight: m.me ? `3px solid ${m.color}` : 'none',
                borderRadius: '8px',
                wordBreak: 'break-word',
                color: '#1a1a1a',
              }}
            >
              {!m.me && (
                <div className="text-[10px] font-bold mb-0.5" style={{ color: m.color }}>{m.from}</div>
              )}
              <span>{m.text}</span>
              <span className="ml-2 text-[10px] text-gray-400">{m.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── ESTILO 5 — Moderno tipo Slack/Teams ────────────────────────────────── */
function Style5() {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-3">
      {MESSAGES.map((m, i) => {
        const prev = MESSAGES[i - 1];
        const isGrouped = prev && prev.from === m.from;
        return (
          <div key={m.id} className={`flex items-start gap-2 group ${m.me ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-7 shrink-0">
              {!isGrouped && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ backgroundColor: m.color }}
                >
                  {initials(m.from)}
                </div>
              )}
            </div>
            <div style={{ maxWidth: '68%' }}>
              {!isGrouped && (
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[11px] font-bold" style={{ color: m.color }}>{m.from}</span>
                  <span className="text-[10px] text-gray-400">{m.time}</span>
                </div>
              )}
              <div
                className="px-2.5 py-1.5 text-[13px] rounded-xl hover:bg-opacity-90 transition-colors"
                style={{
                  backgroundColor: m.me ? `${m.color}18` : '#f4f4f5',
                  color: '#1a1a1a',
                  wordBreak: 'break-word',
                  borderRadius: isGrouped
                    ? (m.me ? '12px 4px 12px 12px' : '4px 12px 12px 12px')
                    : '12px',
                }}
              >
                {m.text}
                {isGrouped && (
                  <span className="ml-2 text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{m.time}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STYLES = [
  {
    id: 1, name: 'iMessage / WhatsApp',
    desc: 'Burbujas con cola, tiempo inline, compacto',
    bg: 'bg-white', component: <Style1 />,
  },
  {
    id: 2, name: 'Minimalista pill',
    desc: 'Sin avatar, nombre agrupado, muy compacto',
    bg: 'bg-gray-50', component: <Style2 />,
  },
  {
    id: 3, name: 'Burbuja con borde + gradiente',
    desc: 'Avatar pequeño, gradiente suave, sombra fina',
    bg: 'bg-white', component: <Style3 />,
  },
  {
    id: 4, name: 'Flat con franja de color',
    desc: 'Borde lateral del color del usuario, fondo tenue',
    bg: 'bg-gray-50', component: <Style4 />,
  },
  {
    id: 5, name: 'Tipo Slack / Teams',
    desc: 'Mensajes agrupados, avatar cuadrado, hover revela hora',
    bg: 'bg-white', component: <Style5 />,
  },
];

export default function ChatDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Demo estilos de chat</h1>
        <p className="text-sm text-gray-500 mb-8">
          Elige el número del estilo que más te guste y te lo aplicamos al chat real.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STYLES.map((s) => (
            <div key={s.id} className="rounded-2xl border-2 border-gray-200 bg-white shadow-sm overflow-hidden hover:border-[#0d9488] hover:shadow-md transition-all">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#0d9488]/10 to-transparent">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0d9488] text-white text-sm font-bold shrink-0">
                  {s.id}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{s.name}</div>
                  <div className="text-[11px] text-gray-500">{s.desc}</div>
                </div>
              </div>

              {/* Chat preview */}
              <div className={`${s.bg} min-h-[220px]`}>
                {s.component}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <span className="text-xs font-semibold text-[#0d9488]">Estilo {s.id}</span>
                <span className="mx-2 text-gray-300">·</span>
                <span className="text-xs text-gray-500">Dile al asistente "quiero el estilo {s.id}"</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
