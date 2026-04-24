'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Trash2, Video, VideoOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_DEFAULT = 3;
const JPEG_QUALITY = 0.88;

function usePreviewUrls(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => {
      next.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  return urls;
}

async function listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === 'videoinput' && d.deviceId);
}

type Props = {
  value: File[];
  onChange: (files: File[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  className?: string;
  /** Oculta el bloque de título/descripción (cuando el padre ya pone la cabecera de sección). */
  hideSectionHeader?: boolean;
  /** Vista más compacta (panel de ticket / microscopio). */
  compact?: boolean;
  /** Prefijo del nombre de archivo JPEG capturado. */
  captureNamePrefix?: string;
  /** Muestra selector de cámara si hay más de un dispositivo de video. */
  showCameraSelector?: boolean;
};

export function TicketIntakeWebcam({
  value,
  onChange,
  maxPhotos = MAX_DEFAULT,
  disabled = false,
  className,
  hideSectionHeader = false,
  compact = false,
  captureNamePrefix = 'ingreso-',
  showCameraSelector = true,
}: Props) {
  const uid = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  /** Vacío = dejar que el navegador elija (facingMode / default). Si hay valor, se usa deviceId exact. */
  const [cameraDeviceId, setCameraDeviceId] = useState('');
  const previewUrls = usePreviewUrls(value);

  const refreshVideoDevices = useCallback(async () => {
    try {
      const list = await listVideoInputDevices();
      setVideoDevices(list);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshVideoDevices();
    const md = navigator.mediaDevices;
    if (!md?.addEventListener) return;
    const onDeviceChange = () => void refreshVideoDevices();
    md.addEventListener('devicechange', onDeviceChange);
    return () => md.removeEventListener('devicechange', onDeviceChange);
  }, [refreshVideoDevices]);

  const stopStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const applyStream = useCallback(
    async (stream: MediaStream) => {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      const list = await listVideoInputDevices();
      setVideoDevices(list);
      const id = stream.getVideoTracks()[0]?.getSettings?.()?.deviceId;
      if (showCameraSelector && id) setCameraDeviceId(id);
    },
    [showCameraSelector],
  );

  const classifyGetUserMediaError = useCallback((e: unknown) => {
    const dom = e instanceof DOMException ? e : null;
    const err = e instanceof Error ? e : null;
    const name = dom?.name ?? err?.name ?? 'Unknown';
    const message = err?.message ?? dom?.message ?? String(e);
    const hint =
      name === 'SecurityError'
        ? 'Suele ser Permissions-Policy, CSP, contexto inseguro o iframe.'
        : name === 'NotAllowedError'
          ? 'Usuario denegó, política del documento, o sin gesto de usuario.'
          : undefined;
    if (process.env.NODE_ENV === 'development') {
      console.log('[TicketIntakeWebcam] getUserMedia error', { name, message, hint });
    }
    console.warn('[TicketIntakeWebcam] getUserMedia error', { name, message, hint });

    if (name === 'SecurityError') {
      setError(
        'El navegador bloqueó la cámara por política de seguridad (p. ej. cabecera Permissions-Policy). Si acabás de cambiar next.config.js, redeploy y probá en ventana privada.',
      );
    } else if (name === 'NotAllowedError' || /Permission|denied/i.test(message)) {
      setError('Permiso de cámara denegado. Revisá el ícono de candado/cámara en la barra del navegador y volvé a intentar.');
    } else if (name === 'NotFoundError' || /NotFound|No camera|DevicesNotFound/i.test(message)) {
      setError('No se detectó ninguna cámara. Conectá una webcam o probá otro navegador.');
    } else if (name === 'NotReadableError' || /Could not start video source|TrackStartError/i.test(message)) {
      setError('La cámara está en uso por otra app o no se pudo acceder al hardware.');
    } else {
      setError('No se pudo abrir la cámara. ' + message);
    }
  }, []);

  const openStreamWithDeviceId = useCallback(
    async (deviceId: string) => {
      return navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    },
    [],
  );

  const openStreamDefault = useCallback(async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (firstErr: unknown) {
      const fn =
        firstErr instanceof DOMException ? firstErr.name : firstErr instanceof Error ? firstErr.name : undefined;
      const fm = firstErr instanceof Error ? firstErr.message : String(firstErr);
      if (process.env.NODE_ENV === 'development') {
        console.log('[TicketIntakeWebcam] primer getUserMedia falló (reintento sin facingMode)', { name: fn, message: fm });
      }
      console.warn('[TicketIntakeWebcam] primer getUserMedia falló, reintento sin facingMode', { name: fn, message: fm });
      return navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    }
  }, []);

  const startCamera = async () => {
    if (disabled || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no permite acceso a la cámara desde aquí.');
      return;
    }
    setError(null);
    setStarting(true);
    try {
      stopStream();
      let stream: MediaStream | null = null;
      if (cameraDeviceId) {
        try {
          stream = await openStreamWithDeviceId(cameraDeviceId);
        } catch {
          stream = await openStreamDefault();
        }
      } else {
        stream = await openStreamDefault();
      }
      await applyStream(stream);
    } catch (e: unknown) {
      classifyGetUserMediaError(e);
    } finally {
      setStarting(false);
    }
  };

  const restartWithDevice = async (deviceId: string) => {
    if (disabled || !deviceId || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    setError(null);
    setStarting(true);
    try {
      stopStream();
      const stream = await openStreamWithDeviceId(deviceId);
      await applyStream(stream);
    } catch (e: unknown) {
      classifyGetUserMediaError(e);
    } finally {
      setStarting(false);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || value.length >= maxPhotos) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${captureNamePrefix}${Date.now()}.jpg`, { type: 'image/jpeg' });
        onChange([...value, file].slice(0, maxPhotos));
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const selectId = `${uid}-camera-select`;
  const showPicker = showCameraSelector && videoDevices.length > 1;

  return (
    <div className={cn('w-full space-y-2', className)}>
      {!hideSectionHeader ? (
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Fotos del equipo al ingreso
            </h3>
            <p className="text-[11px] leading-snug text-gray-500 mt-0.5">
              Hasta {maxPhotos} fotos como prueba del estado del equipo (rayones, golpes, etc.). Quedan guardadas en el
              ticket.
            </p>
          </div>
        </div>
      ) : (
        <p className={cn('leading-snug text-gray-600', compact ? 'text-[10px]' : 'text-[11px]')}>
          Hasta {maxPhotos} fotos con la cámara como constancia del estado del equipo (rayones, golpes, etc.). Se guardan
          en el ticket.
        </p>
      )}

      {showPicker ? (
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={selectId} className={cn('font-medium text-gray-700', compact ? 'text-[10px]' : 'text-xs')}>
            Cámara a usar
          </label>
          <select
            id={selectId}
            className={cn(
              'w-full max-w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              compact ? 'py-1 pl-2 pr-6 text-[11px]' : 'py-1.5 pl-2 pr-8 text-sm',
            )}
            disabled={disabled || starting}
            value={cameraDeviceId}
            onChange={(e) => {
              const next = e.target.value;
              setCameraDeviceId(next);
              if (!active) return;
              if (next) void restartWithDevice(next);
              else stopStream();
            }}
          >
            <option value="">Predeterminada del sistema</option>
            {videoDevices.map((d, idx) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label?.trim() || `Cámara ${idx + 1}`}
              </option>
            ))}
          </select>
          <p className={cn('text-gray-500', compact ? 'text-[9px] leading-tight' : 'text-[10px]')}>
            Si no ves nombres, activá la cámara una vez: el navegador suele ocultarlos hasta otorgar permiso.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-gray-50/80 overflow-hidden">
        <div
          className={cn(
            'relative aspect-video bg-black/90',
            compact ? 'max-h-[120px] sm:max-h-[132px]' : 'max-h-[220px]',
          )}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            playsInline
            muted
            autoPlay
            aria-label="Vista previa de la cámara"
          />
          {!active && (
            <div
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-1 text-gray-400 px-3 text-center',
                compact ? 'text-[10px]' : 'gap-2 text-sm',
              )}
            >
              <Camera className={cn('opacity-50', compact ? 'h-6 w-6' : 'h-10 w-10')} />
              <span>Activá la cámara para capturar</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white',
            compact ? 'gap-1.5 p-1.5' : 'gap-2 p-2',
          )}
        >
          <Button
            type="button"
            variant={active ? 'outline' : 'default'}
            size="sm"
            className={cn(!active && 'bg-primary hover:bg-primary/90 text-white')}
            disabled={disabled || starting}
            onClick={() => void (active ? stopStream() : startCamera())}
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : active ? (
              <VideoOff className="h-4 w-4 mr-1.5" />
            ) : (
              <Video className="h-4 w-4 mr-1.5" />
            )}
            {active ? 'Detener cámara' : 'Activar cámara'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={disabled || !active || value.length >= maxPhotos || starting}
            onClick={capture}
          >
            <Camera className="h-4 w-4 mr-1.5" />
            Capturar foto ({value.length}/{maxPhotos})
          </Button>
        </div>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {value.length > 0 ? (
        <div className={cn('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>
          {value.map((file, i) => (
            <div
              key={`${uid}-${i}-${file.name}-${file.size}`}
              className={cn(
                'relative rounded-md border border-gray-200 overflow-hidden bg-gray-100 shrink-0 group',
                compact ? 'h-14 w-14' : 'h-20 w-20',
              )}
            >
              {previewUrls[i] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previewUrls[i]} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="h-full w-full animate-pulse bg-gray-200" />
              )}
              <button
                type="button"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAt(i)}
                aria-label={`Quitar foto ${i + 1}`}
              >
                <Trash2 className="h-5 w-5 text-white" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-[10px] text-white text-center py-0.5">
                {i + 1}/{maxPhotos}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
