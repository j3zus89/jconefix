import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { getSiteCanonicalUrl } from '@/lib/site-canonical';

export const runtime = 'edge';

function parseOgTitleParam(request: NextRequest): string | null {
  const raw = request.nextUrl.searchParams.get('title');
  if (!raw?.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw).trim().replace(/\s+/g, ' ');
    if (!decoded) return null;
    return decoded.length > 110 ? `${decoded.slice(0, 107)}…` : decoded;
  } catch {
    return null;
  }
}

function splitOgTitle(s: string): { line1: string; line2: string | null } {
  if (s.length <= 42) return { line1: s, line2: null };
  const chunk = s.slice(0, 48);
  const sp = chunk.lastIndexOf(' ');
  if (sp > 14) {
    return { line1: s.slice(0, sp).trim(), line2: s.slice(sp + 1).trim() || null };
  }
  return { line1: s.slice(0, 42).trim(), line2: s.slice(42).trim() || null };
}

function toBase64Png(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export async function GET(request: NextRequest) {
  const siteHost = new URL(getSiteCanonicalUrl()).host;
  const customTitle = parseOgTitleParam(request);
  const titleLines = customTitle ? splitOgTitle(customTitle) : null;
  const fsMain = customTitle
    ? customTitle.length > 52
      ? 46
      : customTitle.length > 40
        ? 52
        : 58
    : 72;

  const logoRes = await fetch(new URL('/nuevologo.png', request.url).toString());
  const logoAb = logoRes.ok ? new Uint8Array(await logoRes.arrayBuffer()) : null;
  const logoDataUrl = logoAb?.length ? `data:image/png;base64,${toBase64Png(logoAb)}` : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050a12 0%, #0c1f18 50%, #050a12 100%)',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Blob top-right */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 550,
            height: 550,
            borderRadius: '50%',
            background: 'rgba(18,76,72,0.65)',
            filter: 'blur(100px)',
            display: 'flex',
          }}
        />
        {/* Blob bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 440,
            height: 440,
            borderRadius: '50%',
            background: 'rgba(163,230,53,0.12)',
            filter: 'blur(90px)',
            display: 'flex',
          }}
        />
        {/* Blob center glow */}
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            width: 600,
            height: 300,
            borderRadius: '50%',
            background: 'rgba(163,230,53,0.06)',
            filter: 'blur(80px)',
            display: 'flex',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Logo oficial */}
        <div
          style={{
            width: customTitle ? 96 : 120,
            height: customTitle ? 96 : 120,
            borderRadius: customTitle ? 48 : 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: customTitle ? 28 : 36,
            overflow: 'hidden',
            boxShadow: '0 0 48px rgba(163,230,53,0.25), 0 8px 32px rgba(0,0,0,0.45)',
          }}
        >
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              width={customTitle ? 96 : 120}
              height={customTitle ? 96 : 120}
              alt=""
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <span
              style={{
                fontSize: customTitle ? 38 : 46,
                fontWeight: 800,
                color: '#F5C518',
                letterSpacing: '-2px',
                lineHeight: 1,
              }}
            >
              JC
            </span>
          )}
        </div>

        {titleLines ? (
          <>
            {/* Placa comparativa (WhatsApp / Telegram) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                paddingLeft: 48,
                paddingRight: 48,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  fontSize: fsMain,
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-2px',
                  lineHeight: 1.08,
                  display: 'flex',
                }}
              >
                {titleLines.line1}
              </div>
              {titleLines.line2 ? (
                <div
                  style={{
                    fontSize: Math.max(36, fsMain - 8),
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-1.5px',
                    lineHeight: 1.1,
                    marginTop: 8,
                    display: 'flex',
                  }}
                >
                  {titleLines.line2}
                </div>
              ) : null}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: '#F5C518',
                letterSpacing: '0.5px',
                marginBottom: 28,
                display: 'flex',
                textAlign: 'center',
              }}
            >
              Comparativa para talleres · Argentina · ARCA/AFIP
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 32,
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: 900,
              }}
            >
              {['Menos fricción', 'Órdenes claras', 'Stock', 'WhatsApp', 'Nube'].map((item) => (
                <div
                  key={item}
                  style={{
                    background: 'rgba(163,230,53,0.08)',
                    border: '1px solid rgba(163,230,53,0.25)',
                    borderRadius: 999,
                    padding: '6px 16px',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Título default */}
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-3px',
                lineHeight: 1.05,
                textAlign: 'center',
                marginBottom: 14,
                display: 'flex',
              }}
            >
              JC ONE FIX
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: '#F5C518',
                letterSpacing: '0.2px',
                marginBottom: 30,
                display: 'flex',
              }}
            >
              Software y gestor de taller de reparación
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 36,
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: 820,
              }}
            >
              {['Tickets', 'Inventario', 'TPV', 'ARCA/AFIP', 'Informes', 'Asistente IA'].map((item) => (
                <div
                  key={item}
                  style={{
                    background: 'rgba(163,230,53,0.08)',
                    border: '1px solid rgba(163,230,53,0.25)',
                    borderRadius: 999,
                    padding: '6px 18px',
                    fontSize: 16,
                    color: 'rgba(255,255,255,0.75)',
                    display: 'flex',
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Badge prueba gratis */}
        <div
          style={{
            background: 'rgba(163,230,53,0.15)',
            border: '1px solid rgba(163,230,53,0.4)',
            borderRadius: 999,
            padding: '8px 24px',
            fontSize: 16,
            fontWeight: 600,
            color: '#F5C518',
            display: 'flex',
            marginBottom: 0,
          }}
        >
          ✓ Prueba 30 días gratis · Sin tarjeta
        </div>

        {/* URL badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 999,
            padding: '8px 24px',
          }}
        >
          <span style={{ fontSize: 16, color: 'rgba(163,230,53,0.7)', letterSpacing: '0.5px', fontWeight: 500 }}>
            {siteHost}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
