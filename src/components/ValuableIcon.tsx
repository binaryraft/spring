
import type { Valuable } from "@/types";
import { Gem, Circle, Award, Droplet, Leaf, Zap, Package } from "lucide-react"; // Added more icons
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
    case 'ruby':
      return <Gem className={className} style={{ color: color || 'crimson' }} />;
    case 'emerald':
      return <Gem className={className} style={{ color: color || 'mediumseagreen' }} />;
    case 'sapphire':
      return <Gem className={className} style={{ color: color || 'royalblue' }} />;
    case 'pearl':
      return <Circle className={className} style={{ fill: color || '#F0F0F0', stroke: color ? 'transparent' : '#cccccc' }} />;
    case 'platinum':
      return <Award className={className} style={{ color: color || 'slategray' }} />; // Lucide's Award icon
    case 'custom-gem':
      return <Gem className={className} style={{ color: color || 'gray' }} />; // Generic gem, color can be set
    case 'other':
      return <Package className={className} style={{ color: color || 'gray' }} />;
    default:
      // Attempt to map unrecognized types to a generic icon or fallback
      const iconKey = valuableType as string;
      if (iconKey.includes('water') || iconKey.includes('liquid')) return <Droplet className={className} style={{ color: color || 'blue' }}/>;
      if (iconKey.includes('plant') || iconKey.includes('leaf')) return <Leaf className={className} style={{ color: color || 'green' }}/>;
      if (iconKey.includes('energy') || iconKey.includes('power')) return <Zap className={className} style={{ color: color || 'orange' }}/>;
      return <Package className={className} style={{ color: color || 'gray' }} />; // Default fallback
  }
};

export default ValuableIcon;
