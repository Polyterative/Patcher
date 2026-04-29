import {
  Pipe,
  PipeTransform
} from '@angular/core';
import { MinimalModule } from 'src/app/models/module';
import { Standard } from '../../models/standard';
import {
  getModuleFormatGeometry,
  MODULE_FORMAT_GEOMETRY
} from './module-format-geometry.constants';


/**
 * Output in REM
 */
export const VISUAL_3U_MODULE_HEIGHT_REM = MODULE_FORMAT_GEOMETRY.EURORACK_3U.heightRem;
export const VISUAL_1U_MODULE_HEIGHT_REM = MODULE_FORMAT_GEOMETRY.INTELLIJEL_1U.heightRem;

export function getModuleHeightForStandard(standard: Standard | undefined): number {
  return getModuleFormatGeometry(standard).heightRem;
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
