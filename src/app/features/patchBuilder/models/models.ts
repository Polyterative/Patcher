export interface Module {
    name: string,
    manufacturer: Manufacturer;
    ins: CV[];
    outs: CV[];
}

export interface Manufacturer {
    names: string,
}

export interface CV {
    title: string;
    description?: string;
    min?: number;
    max?: number;
}
