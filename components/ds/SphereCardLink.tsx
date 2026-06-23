'use client';

import { useRouter } from 'next/navigation';
import { SphereCard } from '@/components/ds/SphereCard';

interface Props {
  id: string;
  name: string;
  icon: string;
  accent: string;
  soft: string;
  activeCount: number;
  doneCount: number;
  totalCount: number;
}

export function SphereCardLink({ id, name, icon, accent, soft, activeCount, doneCount, totalCount }: Props) {
  const router = useRouter();
  return (
    <SphereCard
      name={name}
      icon={icon}
      accent={accent}
      soft={soft}
      activeCount={activeCount}
      doneCount={doneCount}
      totalCount={totalCount}
      onClick={() => router.push(`/spheres/${id}`)}
    />
  );
}
