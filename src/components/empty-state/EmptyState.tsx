import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Ícono o ilustración opcional que aparece encima del título. */
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}

/**
 * Estado vacío estándar (lista sin entradas, "no encontrado", etc.). Usa las
 * clases sa-empty / sa-empty__title del design system.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, children }) => (
  <div className="sa-empty">
    {icon}
    <div className="sa-empty__title sa-serif">{title}</div>
    {children && <p>{children}</p>}
  </div>
);

export default EmptyState;
