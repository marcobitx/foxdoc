// frontend/src/lib/modelStorage.ts
// Shared localStorage helpers for user model list management
// Used by ModelPanel and SettingsView

import type { ModelInfo } from './api';

export const CUSTOM_MODELS_KEY = 'foxdoc:custom-models';
export const HIDDEN_MODELS_KEY = 'foxdoc:hidden-models';
export const FAVORITE_MODELS_KEY = 'foxdoc:favorite-models';

export function loadCustomModels(): ModelInfo[] {
    try {
        const raw = localStorage.getItem(CUSTOM_MODELS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function saveCustomModels(models: ModelInfo[]) {
    localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(models));
}

export function loadHiddenIds(): Set<string> {
    try {
        const raw = localStorage.getItem(HIDDEN_MODELS_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
}

export function saveHiddenIds(ids: Set<string>) {
    localStorage.setItem(HIDDEN_MODELS_KEY, JSON.stringify([...ids]));
}

export function loadFavoriteIds(): Set<string> {
    try {
        const raw = localStorage.getItem(FAVORITE_MODELS_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
}

export function saveFavoriteIds(ids: Set<string>) {
    localStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify([...ids]));
}

/** Build the visible user model list from API models, custom models, and hidden IDs */
export function buildVisibleModels(
    apiModels: ModelInfo[],
    customModels: ModelInfo[],
    hiddenIds: Set<string>,
): ModelInfo[] {
    const visibleApi = apiModels.filter(m => !hiddenIds.has(m.id));
    const visibleCustom = customModels.filter(
        c => !hiddenIds.has(c.id) && !apiModels.some(a => a.id === c.id)
    );
    return [...visibleApi, ...visibleCustom];
}
