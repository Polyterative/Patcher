import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  COMMA,
  ENTER
} from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { Subject } from 'rxjs';
import {
  MultiInstanceModuleSummary,
  PatchDetailDataService
} from 'src/app/components/patch-parts/patch-detail-data.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { UrlCreatorService } from 'src/app/features/backend/url-creator.service';
import { PatchConnection, PatchModuleInstance } from 'src/app/models/connection';
import { PatchMinimal } from 'src/app/models/patch';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import {
  PatchMinimalViewConfig,
  defaultPatchMinimalViewConfig
} from './patch-minimal.types';

export type { PatchMinimalViewConfig };
export { defaultPatchMinimalViewConfig };


@Component({
  selector: 'app-patch-minimal',
  templateUrl: './patch-minimal.component.html',
  styleUrls: ['./patch-minimal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchMinimalComponent implements OnInit, OnDestroy {
  @Input() data: PatchMinimal;
  @Input() viewConfig: PatchMinimalViewConfig = defaultPatchMinimalViewConfig;
  
  protected destroyEvent$ = new Subject<void>();
  readonly tagSeparatorKeysCodes: number[] = [ENTER, COMMA];
  readonly formTypes = FormTypes;
  linkedRackHelpOpen = false;
  readonly linkedRackHelpSections = [
    {
      icon: 'bolt',
      title: 'Why it helps',
      body: 'Use a linked rack when seeing the patch inside its real rack helps you patch faster and with less guesswork.'
    },
    {
      icon: 'view_quilt',
      title: 'Best moment to use it',
      body: 'It is especially handy when that rack is already in front of you, because the layout on screen matches what you are looking at physically.'
    },
    {
      icon: 'sync_alt',
      title: 'How it behaves',
      body: 'The rack is optional context only. The patch still works on its own, and if the rack changes later the linked-rack view updates while the patch stays intact.'
    }
  ] as const;
  
  constructor(
    public userManagerService: UserManagementService,
    public dataService: PatchDetailDataService,
    public urlCreatorService: UrlCreatorService,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {}
  
  ngOnInit(): void {
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.dataService.addPatchTag(value);
    }
    event.chipInput?.clear();
  }

  removeTag(tag: string): void {
    this.dataService.removePatchTag(tag);
  }

  openLinkedRackHelp(): void {
    this.linkedRackHelpOpen = true;
  }

  closeLinkedRackHelp(): void {
    this.linkedRackHelpOpen = false;
  }

  onLinkedRackHelpFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget as Node | null;
    const helpRoot = this.elementRef.nativeElement.querySelector('.patch-linked-rack__help');

    if (nextTarget && helpRoot?.contains(nextTarget)) {
      return;
    }

    this.closeLinkedRackHelp();
  }

  copyPatchText(): void {
    this.urlCreatorService.copyTextToClipboard(
      this.buildPatchText(),
      'Patch text copied to clipboard.',
      'Clipboard write failed — copy the patch text manually.'
    );
  }

  buildPatchText(): string {
    const patch = this.dataService.singlePatchData$.value ?? this.data;
    if (!patch) {
      return 'Patch';
    }

    const tags = this.dataService.patchTags$.value ?? patch.tags ?? [];
    const linkedRackState = this.dataService.linkedRackState$.value;
    const connections = this.dataService.patchConnections$.value ?? [];
    const moduleInstances = this.dataService.patchModuleInstances$.value ?? [];
    const lines = [
      `Patch: ${ patch.name }`,
      `Author: ${ patch.author?.username ?? 'Unknown author' }`,
      `Visibility: ${ patch.public ? 'Public' : 'Private' }`
    ];

    if (patch.description?.trim()) {
      lines.push(`Description: ${ patch.description.trim() }`);
    }

    if (tags.length > 0) {
      lines.push(`Tags: ${ tags.join(', ') }`);
    }

    if (linkedRackState.kind === 'linked' && linkedRackState.rackName) {
      lines.push(`Linked rack: ${ linkedRackState.rackName }`);
    }

    const moduleLines = this.buildModuleLines(moduleInstances, connections);
    if (moduleLines.length > 0) {
      lines.push('', 'Modules:');
      lines.push(...moduleLines);
    }

    if (connections.length > 0) {
      lines.push('', `Connections (${ connections.length }):`);
      lines.push(...connections.map((connection, index) => `${ index + 1 }. ${ this.describeConnection(connection) }`));
    }

    lines.push('', `Patch link: ${ window.location.origin }/patches/details/${ patch.id }`);

    return lines.join('\n');
  }

  getRackPreviewUrl(filename: string): string {
    return `https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/racks/${ filename }`;
  }

  private buildModuleLines(
    moduleInstances: PatchModuleInstance[],
    connections: PatchConnection[]
  ): string[] {
    if (moduleInstances.length > 0) {
      return moduleInstances.map((instance) => {
        const manufacturer = instance.module?.manufacturer?.name ? ` by ${ instance.module.manufacturer.name }` : '';
        return `- ${ instance.module?.name ?? `Module #${ instance.module_id }` }${ this.resolveInstanceLabel(instance.id, instance.instance_label) }${ manufacturer }`;
      });
    }

    const summary = new Map<string, MultiInstanceModuleSummary>();
    for (const connection of connections) {
      this.addConnectionModuleSummary(summary, connection.a.module.name, connection.a.module.manufacturer?.name, connection.instance_id_a);
      this.addConnectionModuleSummary(summary, connection.b.module.name, connection.b.module.manufacturer?.name, connection.instance_id_b);
    }

    return Array.from(summary.values()).map((entry) => {
      const manufacturer = entry.manufacturerName ? ` by ${ entry.manufacturerName }` : '';
      const labels = entry.labels.length > 0 ? ` ${ entry.labels.join(', ') }` : '';
      return `- ${ entry.moduleName }${ labels }${ manufacturer }`;
    });
  }

  private addConnectionModuleSummary(
    summary: Map<string, MultiInstanceModuleSummary>,
    moduleName: string,
    manufacturerName: string | undefined,
    instanceId: number | undefined
  ): void {
    const key = `${ moduleName }::${ manufacturerName ?? '' }`;
    const next = summary.get(key) ?? {
      moduleId: summary.size + 1,
      moduleName,
      manufacturerName: manufacturerName ?? '',
      instanceCount: 0,
      labels: []
    };

    const label = this.resolveInstanceLabel(instanceId);
    if (label && !next.labels.includes(label.trim())) {
      next.labels.push(label.trim());
    }
    next.instanceCount += 1;
    summary.set(key, next);
  }

  private describeConnection(connection: PatchConnection): string {
    const fromModule = `${ connection.a.module.name }${ this.resolveInstanceLabel(connection.instance_id_a) }`;
    const toModule = `${ connection.b.module.name }${ this.resolveInstanceLabel(connection.instance_id_b) }`;
    const note = connection.notes?.trim() ? ` — Note: ${ connection.notes.trim() }` : '';

    return `${ fromModule } · ${ connection.a.name } -> ${ toModule } · ${ connection.b.name }${ note }`;
  }

  private resolveInstanceLabel(instanceId?: number, explicitLabel?: string | null): string {
    const nextLabel = explicitLabel
      ?? (instanceId != null ? this.dataService.instanceLabelMap$.value.get(instanceId) : null)
      ?? null;

    return nextLabel ? ` ${ nextLabel }` : '';
  }

}
