// Placeholder route for the central "Vendre" tab button. The tab's press is
// intercepted in (tabs)/_layout.tsx and opens /post-item as a stack screen.
import { Redirect } from 'expo-router';

export default function SellTab() {
  return <Redirect href="/post-item" />;
}
