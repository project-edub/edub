declare module 'react-crud-icons' {
  import { ComponentType } from 'react';

  interface IconProps {
    name: string;
    tooltip?: string;
    theme?: 'light' | 'dark' | 'none';
    size?: 'tiny' | 'small' | 'medium' | 'large' | 'big' | 'huge';
    onClick?: () => void;
  }

  const Icon: ComponentType<IconProps>;
  export default Icon;
}
