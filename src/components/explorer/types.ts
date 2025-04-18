import { icons } from 'lucide-react';
import { TColorName } from './item-views/item-colors';

export interface IExplorerItem {
  id: string;
  name: string;
  subName?: string;
  icon: keyof typeof icons;
  type?: string;
  color?: TColorName;
}

export interface ICollection extends IExplorerItem {
  type: 'collection';
  singularName: string;
  pluralName: string;
}
