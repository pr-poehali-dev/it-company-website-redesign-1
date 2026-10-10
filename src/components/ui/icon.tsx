import React from 'react';
import { LucideProps } from 'lucide-react';
import { iconRegistry } from './icon-registry';

interface IconProps extends LucideProps {
  name: string;
  fallback?: string;
}

const Icon: React.FC<IconProps> = ({ name, fallback = 'CircleAlert', ...props }) => {
  const IconComponent = iconRegistry[name] || iconRegistry[fallback];

  if (!IconComponent) {
    return <span className="text-xs text-gray-400">[icon]</span>;
  }

  return <IconComponent {...props} />;
};

export default Icon;
