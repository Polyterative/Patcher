export interface MinimalManufacturer {
  name: string;
  id: number;
  logo?: string;
}

export interface Manufacturer {
  name: string;
  url?: string;
  logo?: string;
  admin?: string;
}

export interface DBManufacturer {
  id: number;
  name: string;
  url?: string;
  logo?: string;
  admin?: string;
}