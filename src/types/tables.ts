export interface TableColumn {
  name: string;
  displayName: string;
  type: string;
  hidden: boolean;
  icon: string;
}

export interface TableDetails {
  singularName: string;
  pluralName: string;
  icon: string;
  columns: TableColumn[];
}

export interface Table {
  name: string;
  details: TableDetails;
}
