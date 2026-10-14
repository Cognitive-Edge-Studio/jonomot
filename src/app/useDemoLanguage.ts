import { useEffect, useState } from 'react';

export type DemoLanguage = 'en' | 'bn';
const keys = ['jonomot:language', 'jonomot:researcher-admin-locale', 'jonomot:respondent-language'];

export function useDemoLanguage(preferredLanguage?: DemoLanguage) {
  const [language, setLanguage] = useState<DemoLanguage>(() => sessionStorage.getItem(keys[0]) === 'bn' ? 'bn' : sessionStorage.getItem(keys[0]) === 'en' ? 'en' : preferredLanguage ?? 'en');
  useEffect(() => {
    const onLanguage = (event: Event) => {
      const next = (event as CustomEvent<DemoLanguage>).detail;
      if (next === 'en' || next === 'bn') setLanguage(next);
    };
    window.addEventListener('jonomot:language', onLanguage);
    return () => window.removeEventListener('jonomot:language', onLanguage);
  }, []);
  useEffect(() => {
    if (sessionStorage.getItem(keys[0]) === null && preferredLanguage) {
      keys.forEach((key) => sessionStorage.setItem(key, preferredLanguage));
      setLanguage(preferredLanguage);
      window.dispatchEvent(new CustomEvent('jonomot:language', { detail: preferredLanguage }));
    }
  }, [preferredLanguage]);
  const chooseLanguage = (next: DemoLanguage) => {
    keys.forEach((key) => sessionStorage.setItem(key, next));
    setLanguage(next);
    window.dispatchEvent(new CustomEvent('jonomot:language', { detail: next }));
  };
  return { language, chooseLanguage };
}
