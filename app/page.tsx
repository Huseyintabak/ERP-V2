import { redirect } from 'next/navigation';

export default function Home() {
  // Ana sayfa otomatik login'e yönlendir
  redirect('/login');
}
