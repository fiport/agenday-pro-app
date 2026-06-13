import { useEffect, useState } from 'react';

import { useColorScheme as useThemeColorScheme } from '@/context/theme-context';

export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useThemeColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light' as const;
}
