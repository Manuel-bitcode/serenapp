import { IonIcon } from '@ionic/react';
import type { EntryType } from '../../data/types';
import { ENTRY_VISUAL } from './entry-visual';

interface EntryIconProps {
  type: EntryType;
  /** Clase extra (p. ej. para márgenes/tamaños específicos de la pantalla). */
  className?: string;
}

/**
 * Aro de ícono coloreado según el tipo de entrada (touch=lavanda, photo=menta,
 * text=cálido). Se usa en Home (tiles), Historial (lista), EntryDetail (cabecera)
 * y Captura (hint inicial). Centraliza el lenguaje visual de los 3 módulos.
 */
const EntryIcon: React.FC<EntryIconProps> = ({ type, className }) => {
  const v = ENTRY_VISUAL[type];
  return (
    <span className={`sa-ic sa-ic--${v.color}${className ? ` ${className}` : ''}`}>
      <IonIcon aria-hidden="true" icon={v.icon} />
    </span>
  );
};

export default EntryIcon;
