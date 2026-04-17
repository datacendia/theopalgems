import { useEffect } from 'react';

export default function usePageTitle(title) {
  useEffect(() => {
    const baseTitle = 'Opal Gems';
    document.title = title ? `${title} | ${baseTitle}` : `${baseTitle} | Fine Diamond Jewelry in Florida Resort Boutiques`;
  }, [title]);
}
