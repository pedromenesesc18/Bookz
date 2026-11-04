import { renderReadView } from './read-view.js';
import { renderReadingView, renderShelfView, renderWantView } from './tab-views.js';

export const TABS = Object.freeze([
  { id: 'lidos', label: 'Lidos', render: renderReadView },
  { id: 'lendo', label: 'Lendo', render: renderReadingView },
  { id: 'quero', label: 'Quero ler', render: renderWantView },
  { id: 'estante', label: 'Estante', render: renderShelfView },
]);

export const DEFAULT_TAB = 'lidos';
export const isTab = (id) => TABS.some((t) => t.id === id);

export const renderTab = (state) => (TABS.find((t) => t.id === state.tab) ?? TABS[0]).render(state);
