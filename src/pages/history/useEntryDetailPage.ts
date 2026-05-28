import { useState } from 'react';
import { useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { useParams } from 'react-router';
import { deleteEntry, getEntry } from '../../services/entries';
import type { Entry } from '../../data/types';

/** Lógica del detalle de entrada: carga, confirmación y borrado. */
export function useEntryDetailPage() {
  const router = useIonRouter();
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<Entry | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useIonViewWillEnter(() => {
    void (async () => {
      const found = await getEntry(Number(id));
      setEntry(found);
      setLoaded(true);
    })();
  });

  const handleDelete = async () => {
    if (entry?.id !== undefined) {
      await deleteEntry(entry.id);
    }
    router.goBack();
  };

  return {
    entry,
    loaded,
    confirmOpen,
    openConfirm: () => setConfirmOpen(true),
    closeConfirm: () => setConfirmOpen(false),
    handleDelete,
  };
}
