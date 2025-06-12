import type { Valuable } from "@/types";
import { Gem } from "lucide-react";
import GoldCoinIcon from "./icons/GoldCoinIcon";
import SilverCoinIcon from "./icons/SilverCoinIcon";

interface ValuableIconProps {
  valuableType: Valuable['icon'];
  color?: string;
  className?: string;
}

const ValuableIcon: React.FC<ValuableIconProps> = ({ valuableType, color, className = "w-6 h-6" }) => {
  switch (valuableType) {
    case 'gold':
      return <GoldCoinIcon className={className} />;
    case 'silver':
      return <SilverCoinIcon className={className} />;
    case 'diamond':
      return <Gem className={className} style={{ color: color || 'deepskyblue' }} />;
    default:
      return <span className={className}>💎</span>; // Fallback
  }
};

export default ValuableIcon;
