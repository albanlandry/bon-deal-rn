// app/(tabs)/search.tsx — Rechercher tab (docs/12): large title, field,
// recent searches, "Trouve-moi ça", "Tendances", category tiles. Home's
// search bar opens it with a fresh `focus` param to focus the field; its
// "IA" button adds `ai=1` so the field asks for a need (Trouve-moi ça).
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import SearchPanel from '@/components/organisms/SearchPanel';

export default function SearchTab() {
  const { focus, ai } = useLocalSearchParams<{ focus?: string; ai?: string }>();
  return <SearchPanel mode="tab" focusKey={focus} aiMode={ai === '1'} />;
}
