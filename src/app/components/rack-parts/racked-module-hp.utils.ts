import {
  DbModule,
  RackedModule,
} from '../../models/module';


export function getEffectiveRackedModuleHp(rackedModule: Pick<RackedModule, 'module' | 'rackingData'>): number {
  return rackedModule.rackingData.hpOverride ?? rackedModule.module.hp;
}

export function hasRackedModuleHpOverride(rackedModule: Pick<RackedModule, 'rackingData'>): boolean {
  return rackedModule.rackingData.hpOverride != null;
}

export function buildEffectiveRackedModule(rackedModule: RackedModule): DbModule {
  const effectiveHp = getEffectiveRackedModuleHp(rackedModule);
  return effectiveHp === rackedModule.module.hp
    ? rackedModule.module
    : {...rackedModule.module, hp: effectiveHp};
}
