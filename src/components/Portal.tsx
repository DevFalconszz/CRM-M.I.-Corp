import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Renderiza o conteúdo diretamente em <body>.
 * Garante que overlays position: fixed cubram o viewport inteiro (até o topo),
 * imunes a ancestrais com transform/filter/overflow que prendem o fixed em
 * determinadas páginas.
 */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}