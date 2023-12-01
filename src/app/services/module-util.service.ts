import { Injectable } from '@angular/core';
import { Module } from '../models/module.model';

@Injectable({
  providedIn: 'root'
})
export class ModuleUtilService {

  sortModules(modules: Module[], sortBy: string): Module[] {
    return [...modules].sort((a, b) => a[sortBy] > b[sortBy] ? 1 : -1);
  }

  groupModulesByType(modules: Module[]): Record<string, Module[]> {
    return modules.reduce((grouped, module) => {
      (grouped[module.type] = grouped[module.type] || []).push(module);
      return grouped;
    }, {});
  }

  groupByManufacturer(modules: Module[]): Record<string, Module[]> {
    return modules.reduce((grouped, module) => {
      (grouped[module.manufacturer] = grouped[module.manufacturer] || []).push(module);
      return grouped;
    }, {});
  }
}
