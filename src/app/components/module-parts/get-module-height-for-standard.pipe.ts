import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { MinimalModule } from 'src/app/models/module';
import { Standard } from '../../models/standard';


/**
 * Output in REM
 */
export const VISUAL_3U_MODULE_HEIGHT_REM = 25.4;
export const VISUAL_1U_MODULE_HEIGHT_REM = 7.6;

export function getModuleHeightForStandard(standard: Standard | undefined): number {
  return (standard?.id === 0) || (standard?.id === 1000) ? VISUAL_3U_MODULE_HEIGHT_REM : VISUAL_1U_MODULE_HEIGHT_REM;
}

export function getModulePanelAspectRatio(module: Pick<MinimalModule, 'hp' | 'standard'> | undefined): number {
  const widthRem = Math.max(module?.hp ?? 1, 1);
  const heightRem = getModuleHeightForStandard(module?.standard);
  return widthRem / heightRem;
}

@Pipe({
  name: 'getModuleHeightForStandard',
  standalone: false
})
export class GetModuleHeightForStandardPipe implements PipeTransform {
  
  transform(standard: Standard): number {
    return getModuleHeightForStandard(standard);
  }
}
