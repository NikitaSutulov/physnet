import { useEffect, useState } from 'react';

type Status = 'loading' | 'loaded' | 'failed';

export function useImage(src: string | undefined): [HTMLImageElement | undefined, Status] {
  const [state, setState] = useState<{
    src?: string;
    image?: HTMLImageElement;
    status: Status;
  }>({ status: 'loading' });

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setState({ src, image: img, status: 'loaded' });
    img.onerror = () => setState({ src, status: 'failed' });
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  if (!src) return [undefined, 'loading'];
  if (state.src === src) return [state.image, state.status];
  if (state.image && state.src && objectPath(state.src) === objectPath(src)) {
    return [state.image, 'loaded'];
  }
  return [undefined, 'loading'];
}

function objectPath(url: string): string {
  return url.split('?')[0];
}
