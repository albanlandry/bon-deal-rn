// app/search.tsx — Recherche as a pushed screen (back button, autofocus).
// Kept for existing links (results "Modifier", saved searches, old builds);
// the main entry is the Rechercher tab, app/(tabs)/search.tsx.
import React from 'react';
import SearchPanel from '@/components/organisms/SearchPanel';

export default function SearchScreen() {
  return <SearchPanel mode="stack" />;
}
