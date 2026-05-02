import { RackedModule } from 'src/app/models/module';

export function hasMissingPowerData(rackedModule: RackedModule): boolean {
  return [rackedModule.module.powerPos12, rackedModule.module.powerNeg12, rackedModule.module.powerPos5]
    .some(value => value == null);
}

export function hasCompletePowerData(rackedModule: RackedModule): boolean {
  return !hasMissingPowerData(rackedModule);
}
