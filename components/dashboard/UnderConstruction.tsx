import Link from 'next/link';
import { Construction, ArrowLeft, HardHat } from 'lucide-react';

interface UnderConstructionProps {
  title: string;
  description?: string;
  parentLink?: string;
  parentLabel?: string;
}

export function UnderConstruction({ 
  title, 
  description = 'Esta sección está en desarrollo. Estará disponible próximamente.',
  parentLink = '/dashboard',
  parentLabel = 'Volver al Dashboard'
}: UnderConstructionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction className="h-10 w-10 text-yellow-600" />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <HardHat className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-medium text-orange-600 uppercase tracking-wide">
            En Construcción
          </span>
          <HardHat className="h-5 w-5 text-orange-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {title}
        </h1>
        
        <p className="text-gray-500 mb-8">
          {description}
        </p>
        
        <Link 
          href={parentLink}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          {parentLabel}
        </Link>
      </div>
    </div>
  );
}
