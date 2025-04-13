import { icons } from 'lucide-react';

export interface IExplorerItem {
  id: string;
  name: string;
  subName?: string;
  icon: keyof typeof icons;
  type?: string;
}

export interface ICollection extends IExplorerItem {
  type: 'collection';
  pluralName: string;
}
