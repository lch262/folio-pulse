import {
  Aperture,
  Building2,
  ChartNoAxesCombined,
  Gem,
  Landmark,
  Orbit,
  Sparkles,
  Telescope,
  type LucideIcon,
} from "lucide-react";

const managerIcons: Record<string, LucideIcon> = {
  berkshire: Landmark,
  ark: Sparkles,
  "hh-international": Gem,
  bridgewater: Orbit,
  scion: Aperture,
  "pershing-square": Building2,
  appaloosa: ChartNoAxesCombined,
  duquesne: Telescope,
};

export default function ManagerIcon({ slug, size = 22 }: { slug: string; size?: number }) {
  const Icon = managerIcons[slug] ?? Building2;
  return <Icon aria-hidden="true" size={size} strokeWidth={1.7} />;
}
