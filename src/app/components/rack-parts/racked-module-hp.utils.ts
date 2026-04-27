import {
  DbModule,
  RackedModule,
} from '../../models/module';


export function getEffectiveRackedModuleHp(rackedModule: Pick<RackedModule, 'module' | 'rackingData'>): number {
  return rackedModule.module.hp;
}

export function buildEffectiveRackedModule(rackedModule: RackedModule): DbModule {
  return rackedModule.module;
}
