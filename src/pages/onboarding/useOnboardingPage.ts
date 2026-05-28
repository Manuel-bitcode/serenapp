import { useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { completeOnboarding } from '../../services/profile';

const STEP_COUNT = 3;

/** Lógica de Onboarding: paso actual, nombre, navegación y cierre. */
export function useOnboardingPage() {
  const router = useIonRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const isNameStep = step === STEP_COUNT;

  const finish = async () => {
    await completeOnboarding(name);
    router.push('/tabs/home', 'root', 'replace');
  };

  const next = () => {
    if (isNameStep) {
      void finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => setStep(STEP_COUNT);

  return { step, name, setName, isNameStep, next, skip, finish };
}
