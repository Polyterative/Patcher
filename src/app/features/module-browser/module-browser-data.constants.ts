import {
  HpConditionOption,
  IdNumberOption,
  ModuleOrderOption
} from './module-browser-data.models';


export const DEFAULT_HP_CONDITION: HpConditionOption = {id: '=', name: 'exactly'};
export const DEFAULT_STANDARD: IdNumberOption = {id: undefined, name: 'All'};
export const OWNED_MODE_DEFAULT_ORDER: ModuleOrderOption = {id: 'hp', name: 'HP ↑'};

export const MODULE_ORDER_OPTIONS: ModuleOrderOption[] = [
  {id: 'name', name: 'Name ↑'},
  {id: 'name', name: 'Name ↓'},
  {id: 'hp', name: 'HP ↑'},
  {id: 'hp', name: 'HP ↓'},
  {id: 'manufacturerId', name: 'Manufacturer ↑'},
  {id: 'manufacturerId', name: 'Manufacturer ↓'},
  {id: 'created', name: 'Created ↑'},
  {id: 'created', name: 'Created ↓'},
  {id: 'updated', name: 'Updated ↑'},
  {id: 'updated', name: 'Updated ↓'},
  {id: 'isComplete', name: 'Data Complete ↓'},
];
