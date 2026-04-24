export default function CheckNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex flex-col items-center justify-center px-4 text-white">
      <div className="text-6xl mb-4 select-none">🔍</div>
      <h1 className="text-2xl font-bold text-[#F5C518] mb-2">Ticket no encontrado</h1>
      <p className="text-sm text-gray-400 text-center max-w-xs leading-relaxed">
        El código QR no corresponde a ningún ticket activo.
        Contacta con el taller para verificar tu número de seguimiento.
      </p>
      <p className="text-xs text-gray-600 mt-6">JC ONE FIX</p>
    </div>
  );
}
